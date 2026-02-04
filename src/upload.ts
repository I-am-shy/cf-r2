import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  UploadPartCopyCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client } from './config.js';

/**
 * 上传对象到 R2
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param body 对象内容
 * @param options 可选配置
 * @returns 上传结果
 */
export async function putObject(
  bucketName: string,
  key: string,
  body: Buffer | Uint8Array | string,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }
) {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: options?.contentType,
    Metadata: options?.metadata,
  });

  return await client.send(command);
}

/**
 * 启动分段上传
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param options 可选配置
 * @returns 分段上传ID
 */
export async function createMultipartUpload(
  bucketName: string,
  key: string,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }
) {
  const client = getR2Client();

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: options?.contentType,
    Metadata: options?.metadata,
  });

  return await client.send(command);
}

/**
 * 上传分段
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param uploadId 分段上传ID
 * @param partNumber 分段编号 (从1开始)
 * @param body 分段内容
 * @returns 分段上传结果，包含 ETag
 */
export async function uploadPart(
  bucketName: string,
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer | Uint8Array
) {
  const client = getR2Client();

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  });

  return await client.send(command);
}

/**
 * 复制分段（从已存在的对象复制数据作为分段）
 * @param bucketName 存储桶名称
 * @param key 目标对象键
 * @param uploadId 分段上传ID
 * @param partNumber 分段编号 (从1开始)
 * @param sourceBucket 源存储桶名称
 * @param sourceKey 源对象键
 * @param options 可选配置（如复制字节范围）
 * @returns 分段复制结果，包含 ETag
 */
export async function uploadPartCopy(
  bucketName: string,
  key: string,
  uploadId: string,
  partNumber: number,
  sourceBucket: string,
  sourceKey: string,
  options?: {
    copySourceRange?: string; // 格式: "bytes=start-end"
  }
) {
  const client = getR2Client();

  const command = new UploadPartCopyCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    CopySource: `${sourceBucket}/${sourceKey}`,
    CopySourceRange: options?.copySourceRange,
  });

  return await client.send(command);
}

/**
 * 完成分段上传
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param uploadId 分段上传ID
 * @param parts 分段列表，每个包含 PartNumber 和 ETag
 * @returns 完成上传结果
 */
export async function completeMultipartUpload(
  bucketName: string,
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
) {
  const client = getR2Client();

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  });

  return await client.send(command);
}

/**
 * 中止分段上传
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param uploadId 分段上传ID
 * @returns 中止上传结果
 */
export async function abortMultipartUpload(
  bucketName: string,
  key: string,
  uploadId: string
) {
  const client = getR2Client();

  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
  });

  return await client.send(command);
}

/**
 * 复制对象
 * @param sourceBucket 源存储桶名称
 * @param sourceKey 源对象键
 * @param destinationBucket 目标存储桶名称
 * @param destinationKey 目标对象键
 * @param options 可选配置
 * @returns 复制结果
 */
export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destinationBucket: string,
  destinationKey: string,
  options?: {
    metadata?: Record<string, string>;
    contentType?: string;
  }
) {
  const client = getR2Client();

  const command = new CopyObjectCommand({
    Bucket: destinationBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destinationKey,
    Metadata: options?.metadata,
    ContentType: options?.contentType,
  });

  return await client.send(command);
}
