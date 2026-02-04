/**
 * Cloudflare R2 Storage 使用示例
 */

import {
  initR2Client,
  putObject,
  getObject,
  listObjectsV2,
  deleteObject,
  createMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  listBuckets,
} from './index.js';

// 获取文件名
function getFileName(path:string) {
  // 兼容斜杠和反斜杠
  let lastIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return path.substring(lastIndex + 1);
}

// 示例 1: 上传文件
async function uploadFile(bucket:string, filePath:string, option?:{customFileName?:string}) {
  try {
    const file = new File([await Bun.file(filePath).bytes()], option?.customFileName || getFileName(filePath));
    console.log(`\n=== 上传文件 ${file.name} ===`);
    // 大于 300 MB
    if(file.size > 300 * 1024 * 1024){
      console.log('文件大于 300 MB, 请使用分段上传');
      return;
    }
    const content = await file.bytes();
    const result = await putObject(bucket,file.name, content, {
      contentType: file.type,
    });
    console.log('文件上传成功:', result.VersionId);
  } catch (error) {
    console.error('文件上传失败\n', error);
  }
}

// 示例 2: 下载文件
async function downloadFile(bucket:string, fileName:string, option?:{customFileName?:string}) {
  console.log(`\n=== 下载文件 ${option?.customFileName || fileName} ===`);
  try {
    const result = await getObject(bucket, fileName);

    // 读取文件内容
    const content = await result.Body?.transformToByteArray();
    if (!content) {
      throw new Error('文件内容为空');
    }
    await Bun.write(process.cwd()+"/downloads/"+(option?.customFileName || fileName), content);
    console.log('文件下载成功:', process.cwd()+"/downloads/"+(option?.customFileName || fileName));
  } catch (error) {
    console.error('文件下载失败:', error);
  }
}

// 示例 3: 列出文件
async function listFiles(bucket:string, option?:{maxLength?:number}) {
  console.log(`\n=== 列出 ${bucket} 中的文件 ===`);
  try {
    const result = await listObjectsV2(bucket, {
      maxKeys: option?.maxLength || 10,
    });
    if (result.Contents && result.Contents.length > 0) {
      console.log(`✅ "${bucket}" (${result.Contents?.length} 个文件)：`);
      const files = result.Contents.map((file, index) => {
        console.log(`  ${index + 1}.📄 ${file.Key} (${file.Size} bytes)`);
        return file.Key;
      });
      return files;
    } else {
      console.log('  (存储桶为空)');
      return [];
    }
  } catch (error: any) {
    if (error.name === 'NoSuchBucket') {
      console.error(`❌ 存储桶 "${bucket}" 不存在`);
      console.error(`   请先在 Cloudflare R2 控制台创建此存储桶`);
    } else if (error.name === 'AccessDenied') {
      console.error('❌ 访问被拒绝，请检查凭证权限');
    } else {
      console.error('❌ 列出文件失败:', error.message);
    }
    return ;
  }
}

// 示例 4: 删除文件
async function deleteFile(bucket:string, fileName:string) {
  console.log(`\n=== 删除 ${bucket} 中的 ${fileName} 文件 ===`);
  try {
    await deleteObject(bucket, fileName);
    console.log(`${bucket} 中的 ${fileName} 文件已删除`);
  } catch (error: any) {
    console.error(`文件 ${fileName} 删除失败\n`, error);
  }
}

// 示例 5: 分段上传大文件
async function multipartUpload(bucket:string, filePath:string ,option?:{chunkSize?:number, customFileName?:string}) {
  
  const file = new File([await Bun.file(filePath).bytes()], option?.customFileName || getFileName(filePath));
  const fileName = file.name;
  console.log(`\n=== 分段上传 ${fileName} 文件到 ${bucket} ===`);

  const totalSize = file.size;
  const chunkSize = option?.chunkSize || 5 * 1024 * 1024; // 默认分段大小为 5MB

  try {
    // 1. 创建分段上传
    const { UploadId } = await createMultipartUpload(bucket, fileName, {
      contentType: 'application/octet-stream',
    });
    console.log('分段上传ID:', UploadId,'\n\n');

    if (!UploadId) {
      throw new Error('获取上传ID失败');
    }

    // 2. 上传分段
    const parts = [];
    const fileBuff = await file.bytes();
    for (let i = 0; i < totalSize / chunkSize; i++) {
      // 获取分段数据,最后一块可能不足 chunkSize
      const chunk = Buffer.from(fileBuff.slice(i * chunkSize, (i + 1) * chunkSize > totalSize ? totalSize : (i + 1) * chunkSize));
      const partNumber = i + 1;

      const { ETag } = await uploadPart(
        bucket,
        fileName,
        UploadId,
        partNumber,
        chunk
      );

      parts.push({ PartNumber: partNumber, ETag: ETag! });
      process.stdout.write(`\r上传中(共 ${(totalSize / 1024 / 1024).toFixed(2)} MB)【${'#'.repeat(Math.floor(partNumber / (totalSize / chunkSize) * 50))}${'-'.repeat(50 - Math.floor(partNumber / (totalSize / chunkSize) * 50))}】`);
    }

    // 3. 完成分段上传
    const result = await completeMultipartUpload(
      bucket,
      fileName,
      UploadId,
      parts
    );
    process.stdout.write("\r\x1b[K"); // 清空当前行
    console.log('\x1b[32m分段上传完成:', result.VersionId,'\x1b[0m');

  } catch (error: any) {
    console.error(`分段上传失败\n`, error);
  }
}

// 示例 6: 列出所有存储桶
async function listAllBuckets(): Promise<(string | undefined)[] | undefined> {
  console.log('\n=== 列出所有存储桶 ===');
  try {
    const result = await listBuckets();
    console.log(`✅ 存储桶列表(共 ${result.Buckets?.length} 个):`);
    const buckets = result.Buckets?.map((bucket, index) => {
      console.log(`  ${index + 1}.📦 ${bucket.Name} \t【创建时间: ${bucket.CreationDate?.toISOString().slice(0, 10)}】`);
      return bucket.Name;
    });
    return buckets;
  } catch (error: any) {
    if (error.name === 'AccessDenied') {
      console.error('❌ 访问被拒绝，请检查您的凭证配置是否正确');
      console.error('   - Account ID 是否正确');
      console.error('   - Access Key ID 是否正确');
      console.error('   - Secret Access Key 是否正确');
      console.error('   - API Token 是否有 R2 读取权限');
    } else {
      console.error('❌ 列出存储桶失败:', error.message);
    }
  }
}

// 主函数
async function main() {
  console.log('Cloudflare R2 Storage 使用示例');
  console.log('====================================');
  // 初始化 R2 客户端
  // 请替换为您的实际凭证或在 .env 文件中配置
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('\n❌ 错误: 请先配置 R2 凭证！');
    console.error('\n配置方法：');
    console.error('1. 创建 .env 文件');
    console.error('2. 填入您的 Cloudflare R2 凭证：');
    console.error('   R2_ACCOUNT_ID=your-account-id');
    console.error('   R2_ACCESS_KEY_ID=your-access-key-id');
    console.error('   R2_SECRET_ACCESS_KEY=your-secret-access-key');
    console.error('\n获取凭证：https://dash.cloudflare.com/ → R2 → API Tokens\n');
    process.exit(1);
  }
  console.log('账户 ID （accountId）:', accountId);
  console.log('访问密钥 ID （accessKeyId）:', accessKeyId);
  console.log('私密访问密钥 （secretAccessKey）:', secretAccessKey);
  console.log('====================================');

  initR2Client({
    accountId,
    accessKeyId,
    secretAccessKey,
  });

  // 运行所有示例
  const buckets = await listAllBuckets();

  // 列出所有存储桶中的文件
  if(buckets){
    for(const bucket of buckets){
      if(bucket){
        await listFiles(bucket,{maxLength: 30});
      }
    }
  }
  // await uploadFile("private",process.cwd()+"/downloads/cloudflare-r2.txt");
  // await downloadFile("private","cloudflare-r2.txt", {customFileName: "test.txt"});
  // await multipartUpload("private",process.cwd()+"/downloads/test.zip");
  // await deleteFile("private","test.zip");

  console.log('\n所有示例运行完成!');
}

// 运行示例
main().catch(console.error);
