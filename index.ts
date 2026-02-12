import chalk from "chalk";
import {input, select,confirm} from "@inquirer/prompts";
import ora from "ora";
import { render } from "cfonts";
import { completeMultipartUpload, createMultipartUpload, deleteObject, getObject, initR2Client, listBuckets, listObjectsV2, putObject, uploadPart } from "./src";



/**
 * 清屏函数
 */
function clearScreen() {
  // 使用 ANSI 转义序列 (ANSI Escape Codes) 清空屏幕并移动光标至左上角
  // \x1B (或 ESC)：表示转义字符（ASCII 27），标志着控制序列的开始。
  // \x1B[2J：清空整个屏幕。
  // \x1B[3J：删除回滚缓冲区中的内容（完全清除滚动条）。
  // \x1B[H：将光标移动到屏幕左上角（Home 位置）。
  // \x1B[0f：功能同上，将光标定位到原点
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
};

/**
 * 获取文件名
 * @param path 文件路径
 * @returns 文件名
 */
function getFileName(path:string) {
  // 兼容斜杠和反斜杠
  let lastIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return path.substring(lastIndex + 1);
}

/**
 * 打印标题
 * @param title 标题
 */
function printTitle(title:string){
  const result = render(title, {
    font: "block",
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: "full",
    gradient: ["#FFEFFF","#00AFFF"],
  });
  if(result && "string" in result){
    console.log(result.string);
  }else{
    console.log(title);
  }
}

// 加载动画
const loading = ora({
  text: "",
  spinner: {
    interval: 100,
    frames: ["·","-","+","*","*","*","+","-","·"],
  }
})

/**
 * 初始化 R2 客户端
 * @returns 是否初始化成功
 */
function initR2():boolean{
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const accountToken = process.env.R2_ACCOUNT_TOKEN;
  if(!accountId || !accessKeyId || !secretAccessKey || !accountToken){
    console.error('❌ 请先配置 R2 凭证！');
    return false;
  }else{
    initR2Client({
      accountId,
      accessKeyId,
      secretAccessKey,
    });
    return true;
  }
}

/**
 * 获取所有存储桶
 * @returns 存储桶列表，如果失败则返回 null
 */
async function listAllBuckets(): Promise<({name: string, createTime: string}|null)[] | null> {
  try {
    const result = await listBuckets();

    const buckets = result.Buckets?.map((bucket) => {
      if(bucket.Name && bucket.CreationDate){
        const CreateTime = bucket.CreationDate?.toISOString().slice(0, 10);
        return {
          name: bucket.Name,
          createTime: CreateTime,
        };
      }else{
        return null;
      }
    });
    if(buckets){
      return buckets;
    }else{
      return null;
    }
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
    return null;
  }
}

/**
 * 获取已启用的存储桶自定义域名列表
 * @param bucketName 存储桶名称
 * @returns 自定义域名列表
 */
export async function getBucketDomains(bucketName: string) {

  interface Domain {
    domain: string;
    status:{
      ssl:string;
      ownership:string
    }
    enabled:boolean;
  }

  try{

    if(!process.env.R2_ACCOUNT_TOKEN){
      throw new Error('R2_ACCOUNT_TOKEN 未配置');
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.R2_ACCOUNT_ID}/r2/buckets/${bucketName}/domains/custom`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.R2_ACCOUNT_TOKEN}`,
      },
    });

    if(!response.ok){
      throw new Error('获取自定义域名失败');
    }

    const data = await response.json() as {result: {domains: Domain[]}};
    
    // 获取已启用的自定义域名
    const domains = data.result.domains.map(item => item.enabled ? item.domain : null).filter(item => item !== null);
    return domains;
  } catch (error) {
    console.error('获取自定义域名失败:', error);
    return [];
  }
}

/**
 * 获取存储桶中的文件
 * @param bucket 存储桶名称
 * @param option 可选配置
 * @returns 文件列表，如果失败则返回 []
 */
async function listFiles(bucket:string, option?:{maxLength?:number}) {
  try {
    const result = await listObjectsV2(bucket, {
      maxKeys: option?.maxLength || 10,
    });
    const domains = await getBucketDomains(bucket);    
    if (result.Contents && result.Contents.length > 0) {
      const files = result.Contents.map((file, index) => {
        const fileUrl = domains.length > 0 ? 'https://' + domains[0] + '/' + file.Key : '';
        return {
          fileName: file.Key,
          fileSize: file.Size,
          fileUrl: fileUrl,
        };
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

/**
 * 下载文件
 * @param bucket 存储桶名称
 * @param fileName 文件名称
 * @param option 可选配置
 */
async function downloadFile(bucket:string, fileName:string, option?:{customFileName?:string}) {
  try {
    const result = await getObject(bucket, fileName);

    // 读取文件内容
    const content = await result.Body?.transformToByteArray();
    if (!content) {
      throw new Error('文件内容为空');
    }
    await Bun.write(process.cwd()+"/downloads/"+(option?.customFileName || fileName), content);
    console.log('文件下载成功:', process.cwd()+"/downloads/"+(option?.customFileName || fileName));
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  } catch (error) {
    console.error('文件下载失败:', error);
  }
}

/**
 * 删除存储桶中的文件
 * @param bucket 存储桶名称
 * @param fileName 文件名称
 */
async function deleteFile(bucket:string, fileName:string) {
  try {
    await deleteObject(bucket, fileName);
    console.log(`${bucket} 中的 ${fileName} 文件已删除`);
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  } catch (error: any) {
    console.error(`文件 ${fileName} 删除失败\n`, error);
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  }
}

/**
 * 上传文件
 * @param bucket 存储桶名称
 * @param filePath 文件路径
 * @param option 可选配置
 */
async function uploadFile(bucket:string, filePath:string, option?:{customFileName?:string}) {
  try {
    const file = new File([await Bun.file(filePath).bytes()], option?.customFileName || getFileName(filePath));
    // 大于 300 MB
    if(file.size > 300 * 1024 * 1024){
      console.log('文件大于 300 MB, 使用分段上传');
      await multipartUpload(bucket, filePath, {
        chunkSize: 50 * 1024 * 1024,
        customFileName: option?.customFileName || getFileName(filePath),
      });
      return;
    }
    loading.start("正在上传" + file.name + " (共 " + (file.size / 1024 /1024).toFixed(2) + " MB)");
    const content = await file.bytes();
    await putObject(bucket,file.name, content, {
      contentType: file.type,
    });
    loading.succeed(chalk.green("文件上传成功"+file.name));
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  } catch (error) {
    loading.fail(chalk.red("文件上传失败\n"));
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  }
}

/**
 * 分段上传大文件
 * @param bucket 存储桶名称
 * @param filePath 文件路径
 * @param option 可选配置，chunkSize 分段大小，customFileName 自定义文件名，默认使用文件名
 */
async function multipartUpload(bucket:string, filePath:string ,option?:{chunkSize?:number, customFileName?:string}) {
  
  const file = new File([await Bun.file(filePath).bytes()], option?.customFileName || getFileName(filePath));
  const fileName = file.name;
  const totalSize = file.size;
  const chunkSize = option?.chunkSize || 50 * 1024 * 1024; // 默认分段大小为 50MB

  try {
    // 1. 创建分段上传
    const { UploadId } = await createMultipartUpload(bucket, fileName, {
      contentType: 'application/octet-stream',
    });

    if (!UploadId) {
      throw new Error('获取上传ID失败');
    }

    // 2. 上传分段
    const parts = [];
    const fileBuff = await file.bytes();
    loading.start("正在上传 " + file.name + " (共 " + (totalSize / 1024 / 1024).toFixed(2) + " MB)\n" + "【"+" ".repeat(50)+"】" + "0%");
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
      loading.text = "正在上传 " + file.name + " (共 " + (totalSize / 1024 / 1024).toFixed(2) + " MB)\n" + "【"+"#".repeat(Math.floor(partNumber / (totalSize / chunkSize) * 50))+" ".repeat(50 - Math.floor(partNumber / (totalSize / chunkSize) * 50))+"】"+(partNumber / (totalSize / chunkSize) * 100).toFixed(0)+ "%";
    }

    // 3. 完成分段上传
    const result = await completeMultipartUpload(
      bucket,
      fileName,
      UploadId,
      parts
    );
    console.log("\r\x1b[K"); // 清空当前行
    loading.succeed(chalk.green("分段上传完成"+fileName));
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  } catch (error: any) {
    loading.fail(chalk.red("分段上传失败\n"));
    await input({ message: chalk.gray('按任意键继续...') ,theme:{prefix: ""}});
  }
}


async function main() {
  printTitle("cloudflare R2");

  loading.start("初始化 R2 客户端...");
  await Bun.sleep(1500);
  if (initR2()) {
    loading.succeed(chalk.green("R2 客户端初始化成功"));
  } else {
    loading.fail(chalk.red("R2 客户端初始化失败"));
    process.exit(1);
  }

  let currentBucket: string | null = null;

  while (true) {
    // 存储桶选择循环
    if (!currentBucket) {
      const result = await BucketMenu();
      if (result.type === "exit") {
        clearScreen();
        loading.succeed(chalk.green("退出 R2 管理"));
        process.exit(0);
      }
      currentBucket = result.bucket;
      continue;
    }

    // 文件选择循环
    const fileResult = await FileMenu(currentBucket);
    if (!fileResult){
      continue; // 回到文件选择菜单 FileMenu
    }
    if (fileResult.type === "back") {
      currentBucket = null;
      continue;
    }

    // 操作菜单循环
    const optionResult = await OptionMenu(currentBucket, fileResult.file);
    if (optionResult.type === "back") {
      // 返回文件列表，保持 currentBucket 不变
      continue;
    }
  }
}

main().catch((err)=>{
  if(err instanceof Error&& err.name === "ExitPromptError"){
    clearScreen();
    loading.succeed(chalk.green("退出 R2 管理"));
    process.exit(0);
  }else{
    console.error(err);
  }
});

/**
 * 存储桶选择菜单
 * @returns 导航结果
 */
async function BucketMenu(): Promise<{ type: "bucket"; bucket: string } | { type: "exit" }> {
  clearScreen();
  loading.start("正在查询存储桶...");
  const buckets = await listAllBuckets();
  if (buckets && buckets.length > 0 && buckets.every((bucket) => bucket !== null)) {
    loading.succeed(chalk.green("存储桶查询成功"));
    clearScreen();
    const selectBucket = await select({
      message: "存储桶",
      choices: [
        ...buckets.map((bucket) => ({
          name: bucket.name,
          value: bucket.name,
          description: `存储桶: ${chalk.black.bold(bucket.name)} 创建时间: ${bucket.createTime}`,
        })),
        {
          name: chalk.bold.bgBlue.white("退出"),
          value: "exit",
          description: "退出 R2 管理",
        },
      ],
      theme: {
        style: {
          description: chalk.gray,
        },
        prefix: "📦",
      },
    });

    clearScreen();
    if (selectBucket === "exit") {
      return { type: "exit" };
    }
    return { type: "bucket", bucket: selectBucket };
  } else {
    loading.fail(chalk.red("存储桶列表获取失败"));
    return { type: "exit" };
  }
}

/**
 * 文件选择菜单
 * @param bucket 存储桶名称
 * @returns 导航结果
 */
async function FileMenu(bucket: string): Promise<{ type: "file"; bucket: string; file: string } | { type: "back" } | null> {
  clearScreen();
  loading.start(`正在获取${bucket}的文件列表...`);
  const files = await listFiles(bucket, { maxLength: 30 });
  if (files && files.length > 0) {
    loading.succeed(chalk.green(`${bucket}的文件列表获取成功`));
    clearScreen();
    const selectFile = await select({
      message: bucket + " 的文件",
      choices: [
        ...files.map((file) => ({
          name: file.fileName,
          value: file.fileName,
          description: `大小: ${file.fileSize ?? 0} bytes \t ${file.fileUrl ? "地址: " + file.fileUrl : ""}`,
        })),
        {
          name: chalk.bold.bgBlue.white("上传新文件"),
          value: "upload",
          description: "上传新文件",
        },
        {
          name: chalk.bold.bgBlue.white("返回"),
          value: "back",
          description: "返回存储桶列表",
        },
      ],
      theme: {
        style: {
          description: chalk.gray,
        },
        prefix: "📄",
      },
      pageSize: 10,
    });
    clearScreen();
    if (selectFile === "back") {
      return { type: "back" };
    }
    if (selectFile === "upload") {
      const filePath = await input({ message: "请输入文件的绝对路径", theme: { prefix: "" } });
      clearScreen();
      await uploadFile(bucket, filePath);
      return null; // 上传完成后返回文件菜单 FileMenu
    }
    return { type: "file", bucket, file: selectFile as string };
  } else {
    loading.fail(chalk.red(`${bucket}的文件列表获取失败`));
    return { type: "back" };
  }
}

/**
 * 文件操作菜单
 * @param bucket 存储桶名称
 * @param fileName 文件名称
 * @returns 导航结果
 */
async function OptionMenu(
  bucket: string,
  fileName: string
): Promise<{ type: "back" }> {
  clearScreen();
  const selectOption = await select({
    message: fileName,
    choices: [
      {
        name: "下载",
        value: "download",
        description: "下载文件(默认下载到当前目录下的 downloads 文件夹)",
      },
      {
        name: "删除",
        value: "delete",
        description: "删除文件",
      },
      {
        name: "返回",
        value: "back",
        description: "返回文件列表",
      },
    ],
    theme: {
      style: {
        description: chalk.gray,
      },
      prefix: "🔍",
    },
  });
  clearScreen();
  if (selectOption === "back") {
    return { type: "back" };
  } else if (selectOption === "download") {
    clearScreen();
    await downloadFile(bucket, fileName);
    // 下载完成后返回文件菜单 FileMenu
    return { type: "back" };
  } else if (selectOption === "delete") {
    const isDelete = await confirm({
      message: "确定要删除文件吗？",
      default: false,
    });
    if (isDelete) {
      clearScreen();
      await deleteFile(bucket, fileName);
    }
    // 删除完成后返回文件菜单
    return { type: "back" };
  }

  return { type: "back" };
}