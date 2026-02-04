import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListMultipartUploadsCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';
import { getR2Client } from './config.js';

/**
 * 删除单个对象
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @returns 删除结果
 */
export async function deleteObject(bucketName: string, key: string) {
  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await client.send(command);
}

/**
 * 批量删除对象
 * @param bucketName 存储桶名称
 * @param keys 对象键数组
 * @returns 删除结果，包含成功和失败的对象信息
 */
export async function deleteObjects(bucketName: string, keys: string[]) {
  const client = getR2Client();

  const command = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  });

  return await client.send(command);
}

/**
 * 列出所有进行中的分段上传
 * @param bucketName 存储桶名称
 * @param options 可选配置
 * @returns 分段上传列表
 */
export async function listMultipartUploads(
  bucketName: string,
  options?: {
    prefix?: string;
    keyMarker?: string;
    uploadIdMarker?: string;
    maxUploads?: number;
  }
) {
  const client = getR2Client();

  const command = new ListMultipartUploadsCommand({
    Bucket: bucketName,
    Prefix: options?.prefix,
    KeyMarker: options?.keyMarker,
    UploadIdMarker: options?.uploadIdMarker,
    MaxUploads: options?.maxUploads,
  });

  return await client.send(command);
}

/**
 * 列出指定分段上传的所有分段
 * @param bucketName 存储桶名称
 * @param key 对象键
 * @param uploadId 分段上传ID
 * @param options 可选配置
 * @returns 分段列表
 */
export async function listParts(
  bucketName: string,
  key: string,
  uploadId: string,
  options?: {
    partNumberMarker?: string;
    maxParts?: number;
  }
) {
  const client = getR2Client();

  const command = new ListPartsCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumberMarker: options?.partNumberMarker,
    MaxParts: options?.maxParts,
  });

  return await client.send(command);
}

/**
 * 清理指定存储桶中所有未完成的分段上传
 * @param bucketName 存储桶名称
 * @returns 已清理的上传列表
 */
export async function cleanupMultipartUploads(bucketName: string) {
  const uploadsResponse = await listMultipartUploads(bucketName);

  const results = [];

  if (uploadsResponse.Uploads) {
    for (const upload of uploadsResponse.Uploads) {
      if (upload.UploadId && upload.Key) {
        const { abortMultipartUpload } = await import('./upload.js');
        await abortMultipartUpload(bucketName, upload.Key, upload.UploadId);
        results.push({
          Key: upload.Key,
          UploadId: upload.UploadId,
        });
      }
    }
  }

  return results;
}
