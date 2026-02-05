# Cloudflare R2 Storage SDK

使用 Bun 封装的 Cloudflare R2 存储功能库，提供简洁易用的 API 来管理 R2 对象和存储桶。

## 特性

- 🚀 完整的 TypeScript 类型支持
- 📦 模块化设计，功能清晰分离
- 🛠️ 支持 30+ R2 API 操作
- 📝 详细的代码注释和文档
- 🔒 安全的凭证管理
- ⚡️ 基于 Bun 构建，性能优异

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置 R2 凭证

**重要：** 首次使用前必须配置 Cloudflare R2 凭证

快速配置：
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入您的 R2 凭证
# R2_ACCOUNT_ID=your-account-id
# R2_ACCESS_KEY_ID=your-access-key-id
# R2_SECRET_ACCESS_KEY=your-secret-access-key
```

获取凭证：https://dash.cloudflare.com/ → R2 → Manage R2 API Tokens

### 3. 使用示例

```typescript
import { initR2Client, putObject, getObject } from './src/index.js';

// 初始化客户端
initR2Client({
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
});

// 上传文件
await putObject('my-bucket', 'file.txt', 'Hello, R2!');

// 下载文件
const object = await getObject('my-bucket', 'file.txt');
const content = await object.Body?.transformToString();
console.log(content); // 输出: Hello, R2!
```

### 4. 运行示例

```bash
bun run src/example.ts
```
## 项目结构

```
src/
├── config.ts           # R2 客户端配置
├── upload.ts           # 文件上传功能（7个函数）
├── download.ts         # 文件下载/访问功能（5个函数）
├── file-management.ts  # 文件管理功能（5个函数）
├── bucket.ts           # 存储桶操作（6个函数）
├── bucket-config.ts    # 存储桶配置（8个函数）
├── index.ts            # 统一导出入口
└── example.ts          # 使用示例
```

## 功能列表

### 核心对象操作功能

#### 1. 文件上传相关
- `putObject()` - 上传单个对象
- `createMultipartUpload()` - 启动分段上传
- `uploadPart()` - 上传分段
- `uploadPartCopy()` - 复制分段
- `completeMultipartUpload()` - 完成分段上传
- `abortMultipartUpload()` - 中止分段上传
- `copyObject()` - 复制对象

#### 2. 文件下载/访问相关
- `getObject()` - 获取/下载对象
- `headObject()` - 获取对象元数据
- `listObjects()` - 列出对象（旧版本）
- `listObjectsV2()` - 列出对象（新版本）
- `listAllObjects()` - 分页列出所有对象

#### 3. 文件管理相关
- `deleteObject()` - 删除单个对象
- `deleteObjects()` - 批量删除对象
- `listMultipartUploads()` - 列出分段上传
- `listParts()` - 列出分段
- `cleanupMultipartUploads()` - 清理未完成的分段上传

### 存储桶管理功能

#### 1. 存储桶操作
- `listBuckets()` - 列出所有存储桶
- `createBucket()` - 创建存储桶
- `deleteBucket()` - 删除存储桶
- `headBucket()` - 检查存储桶状态
- `deleteBucketAndCleanup()` - 清空并删除存储桶
- `isBucketEmpty()` - 检查存储桶是否为空

#### 2. 存储桶配置
- `getBucketCors()` / `putBucketCors()` - CORS 配置
- `getBucketLifecycleConfiguration()` / `putBucketLifecycleConfiguration()` - 生命周期配置
- `getBucketLocation()` - 获取存储桶位置
- `getBucketEncryption()` / `putBucketEncryption()` - 加密配置

##  更多示例

### 分段上传大文件

```typescript
import { createMultipartUpload, uploadPart, completeMultipartUpload } from './src/index.js';

// 1. 启动分段上传
const { UploadId } = await createMultipartUpload('bucket', 'large-file.bin');

// 2. 上传分段
const parts = [];
for (let i = 0; i < 10; i++) {
  const { ETag } = await uploadPart('bucket', 'large-file.bin', UploadId, i + 1, chunkData);
  parts.push({ PartNumber: i + 1, ETag });
}

// 3. 完成上传
await completeMultipartUpload('bucket', 'large-file.bin', UploadId, parts);
```

### 批量删除文件

```typescript
import { deleteObjects } from './src/index.js';

await deleteObjects('my-bucket', [
  'file1.txt',
  'file2.txt',
  'file3.txt',
]);
```

### 设置 CORS

```typescript
import { putBucketCors } from './src/index.js';

await putBucketCors('my-bucket', [
  {
    allowedOrigins: ['https://example.com'],
    allowedMethods: ['GET', 'PUT'],
    allowedHeaders: ['*'],
    maxAgeSeconds: 3600,
  },
]);
```

## 常见问题

### Access Denied 错误

最常见的原因：
- Account ID、Access Key ID 或 Secret Access Key 不正确
- API Token 权限不足（需要 Read 和 Edit 权限）

### 存储桶不存在错误

在 Cloudflare R2 控制台创建存储桶：https://dash.cloudflare.com/ → R2 → Create bucket

## 相关链接

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK 文档](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/s3/)
- [Bun 文档](https://bun.sh/docs)