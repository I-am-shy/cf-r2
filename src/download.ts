import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  type _Object,
} from '@aws-sdk/client-s3';
import { getR2Client } from './config.js';

/**
 * 获取/下载对象
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @returns 对象内容和元数据
 */
export async function getObject(bucketName: string, key: string) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await client.send(command);
}

/**
 * 获取对象元数据（不下载内容）
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @returns 对象元数据
 */
export async function headObject(bucketName: string, key: string) {
  const client = getR2Client();

  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await client.send(command);
}

/**
 * 列出对象（旧版本 API）
 * @param bucketName 存储桶名称
 * @param options 可选配置
 * @returns 对象列表
 */
export async function listObjects(
  bucketName: string,
  options?: {
    prefix?: string;
    delimiter?: string;
    marker?: string;
    maxKeys?: number;
  }
) {
  const client = getR2Client();

  const command = new ListObjectsCommand({
    Bucket: bucketName,
    Prefix: options?.prefix,
    Delimiter: options?.delimiter,
    Marker: options?.marker,
    MaxKeys: options?.maxKeys,
  });

  return await client.send(command);
}

/**
 * 列出对象（新版本 API，推荐使用）
 * @param bucketName 存储桶名称
 * @param options 可选配置
 * @returns 对象列表
 */
export async function listObjectsV2(
  bucketName: string,
  options?: {
    prefix?: string;
    delimiter?: string;
    continuationToken?: string;
    maxKeys?: number;
    startAfter?: string;
  }
) {
  const client = getR2Client();

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: options?.prefix,
    Delimiter: options?.delimiter,
    ContinuationToken: options?.continuationToken,
    MaxKeys: options?.maxKeys,
    StartAfter: options?.startAfter,
  });

  return await client.send(command);
}

/**
 * 分页列出所有对象（自动处理分页）
 * @param bucketName 存储桶名称
 * @param options 可选配置
 * @returns 所有对象的数组
 */
export async function listAllObjects(
  bucketName: string,
  options?: {
    prefix?: string;
    delimiter?: string;
  }
) {
  const allObjects: _Object[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const response = await listObjectsV2(bucketName, {
      ...options,
      continuationToken,
    });

    if (response.Contents) {
      allObjects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return allObjects;
}
