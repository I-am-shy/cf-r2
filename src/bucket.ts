import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  type ListBucketsCommandOutput,
} from '@aws-sdk/client-s3';
import { getR2Client } from './config.js';

/**
 * 列出所有存储桶
 * @returns 存储桶列表
 */
export async function listBuckets(): Promise<ListBucketsCommandOutput> {
  const client = getR2Client();

  const command = new ListBucketsCommand({});

  return await client.send(command);
}

/**
 * 创建存储桶
 * @param bucketName 存储桶名称
 * @returns 创建结果
 */
export async function createBucket(bucketName: string) {
  const client = getR2Client();

  const command = new CreateBucketCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 删除存储桶
 * 注意：存储桶必须为空才能删除
 * @param bucketName 存储桶名称
 * @returns 删除结果
 */
export async function deleteBucket(bucketName: string) {
  const client = getR2Client();

  const command = new DeleteBucketCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 检查存储桶是否存在
 * @param bucketName 存储桶名称
 * @returns 如果存储桶存在返回 true，否则返回 false
 */
export async function headBucket(bucketName: string): Promise<boolean> {
  const client = getR2Client();

  const command = new HeadBucketCommand({
    Bucket: bucketName,
  });

  try {
    await client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * 清空并删除存储桶
 * 警告：此操作会永久删除存储桶中的所有对象
 * @param bucketName 存储桶名称
 * @returns 删除结果
 */
export async function deleteBucketAndCleanup(bucketName: string) {
  const { listObjectsV2 } = await import('./download.js');
  const { deleteObject, deleteObjects } = await import('./file-management.js');

  // 列出所有对象
  const objects = await listObjectsV2(bucketName);

  // 删除所有对象
  if (objects.Contents && objects.Contents.length > 0) {
    const keys = objects.Contents.map((obj) => obj.Key).filter(
      (key): key is string => key !== undefined
    );

    // 分批删除（每次最多1000个）
    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await deleteObjects(bucketName, batch);
    }
  }

  // 删除存储桶
  return await deleteBucket(bucketName);
}

/**
 * 检查存储桶是否为空
 * @param bucketName 存储桶名称
 * @returns 如果存储桶为空返回 true，否则返回 false
 */
export async function isBucketEmpty(bucketName: string): Promise<boolean> {
  const { listObjectsV2 } = await import('./download.js');

  const objects = await listObjectsV2(bucketName, {
    maxKeys: 1,
  });

  return !objects.Contents || objects.Contents.length === 0;
}
