import { S3Client } from '@aws-sdk/client-s3';

/**
 * R2 客户端配置接口
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

/**
 * 创建 R2 S3 客户端实例
 * @param config R2 配置对象
 * @returns S3Client 实例
 */
export function createR2Client(config: R2Config): S3Client {
  const { accountId, accessKeyId, secretAccessKey, region = 'auto' } = config;

  return new S3Client({
    region,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // 关键配置：强制使用路径风格而不是虚拟主机风格
    // R2 需要这个配置才能正确工作
    forcePathStyle: true,
  });
}

/**
 * 默认 R2 客户端单例
 */
let defaultR2Client: S3Client | null = null;

/**
 * 初始化默认 R2 客户端
 * @param config R2 配置对象
 */
export function initR2Client(config: R2Config): void {
  defaultR2Client = createR2Client(config);
}

/**
 * 获取默认 R2 客户端实例
 * @throws 如果未初始化客户端会抛出错误
 * @returns S3Client 实例
 */
export function getR2Client(): S3Client {
  if (!defaultR2Client) {
    throw new Error('R2 client not initialized. Call initR2Client() first.');
  }
  return defaultR2Client;
}
