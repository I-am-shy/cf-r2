/**
 * Cloudflare R2 Storage SDK
 *
 * 使用 Bun 封装的 R2 存储功能库
 *
 * @example
 * ```typescript
 * import { initR2Client, putObject, getObject } from './src/index.js';
 *
 * // 初始化客户端
 * initR2Client({
 *   accountId: 'your-account-id',
 *   accessKeyId: 'your-access-key-id',
 *   secretAccessKey: 'your-secret-access-key',
 * });
 *
 * // 上传文件
 * await putObject('my-bucket', 'file.txt', 'Hello, R2!');
 *
 * // 下载文件
 * const object = await getObject('my-bucket', 'file.txt');
 * ```
 */

// 客户端配置
export {
  createR2Client,
  initR2Client,
  getR2Client,
  type R2Config,
} from './config.js';

// 文件上传功能
export {
  putObject,
  createMultipartUpload,
  uploadPart,
  uploadPartCopy,
  completeMultipartUpload,
  abortMultipartUpload,
  copyObject,
} from './upload.js';

// 文件下载/访问功能
export {
  getObject,
  headObject,
  listObjects,
  listObjectsV2,
  listAllObjects,
} from './download.js';

// 文件管理功能
export {
  deleteObject,
  deleteObjects,
  listMultipartUploads,
  listParts,
  cleanupMultipartUploads,
} from './file-management.js';

// 存储桶操作
export {
  listBuckets,
  createBucket,
  deleteBucket,
  headBucket,
  deleteBucketAndCleanup,
  isBucketEmpty,
} from './bucket.js';

// 存储桶配置
export {
  getBucketCors,
  putBucketCors,
  getBucketLifecycleConfiguration,
  putBucketLifecycleConfiguration,
  getBucketLocation,
  getBucketEncryption,
  putBucketEncryption,
  type CORSRule,
  type LifecycleRule,
} from './bucket-config.js';
