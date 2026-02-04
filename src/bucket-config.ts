import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLocationCommand,
  GetBucketEncryptionCommand,
  PutBucketEncryptionCommand,
  TransitionStorageClass,
} from '@aws-sdk/client-s3';
import { getR2Client } from './config.js';

/**
 * CORS 规则接口
 */
export interface CORSRule {
  allowedHeaders?: string[];
  allowedMethods: ('GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD')[];
  allowedOrigins: string[];
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

/**
 * 获取存储桶 CORS 配置
 * @param bucketName 存储桶名称
 * @returns CORS 配置
 */
export async function getBucketCors(bucketName: string) {
  const client = getR2Client();

  const command = new GetBucketCorsCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 设置存储桶 CORS 配置
 * @param bucketName 存储桶名称
 * @param rules CORS 规则数组
 * @returns 设置结果
 */
export async function putBucketCors(bucketName: string, rules: CORSRule[]) {
  const client = getR2Client();

  const command = new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: rules.map((rule) => ({
        AllowedHeaders: rule.allowedHeaders,
        AllowedMethods: rule.allowedMethods,
        AllowedOrigins: rule.allowedOrigins,
        ExposeHeaders: rule.exposeHeaders,
        MaxAgeSeconds: rule.maxAgeSeconds,
      })),
    },
  });

  return await client.send(command);
}

/**
 * 生命周期规则接口
 */
export interface LifecycleRule {
  id?: string;
  status: 'Enabled' | 'Disabled';
  filter?: {
    prefix?: string;
    tag?: {
      key: string;
      value: string;
    };
  };
  expiration?: {
    days?: number;
    date?: Date;
  };
  transitions?: Array<{
    days?: number;
    date?: Date;
    storageClass: TransitionStorageClass;
  }>;
}

/**
 * 获取存储桶生命周期配置
 * @param bucketName 存储桶名称
 * @returns 生命周期配置
 */
export async function getBucketLifecycleConfiguration(bucketName: string) {
  const client = getR2Client();

  const command = new GetBucketLifecycleConfigurationCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 设置存储桶生命周期配置
 * @param bucketName 存储桶名称
 * @param rules 生命周期规则数组
 * @returns 设置结果
 */
export async function putBucketLifecycleConfiguration(
  bucketName: string,
  rules: LifecycleRule[]
) {
  const client = getR2Client();

  const command = new PutBucketLifecycleConfigurationCommand({
    Bucket: bucketName,
    LifecycleConfiguration: {
      Rules: rules.map((rule) => ({
        ID: rule.id,
        Status: rule.status,
        Filter: rule.filter
          ? {
              Prefix: rule.filter.prefix,
              Tag: rule.filter.tag
                ? {
                    Key: rule.filter.tag.key,
                    Value: rule.filter.tag.value,
                  }
                : undefined,
            }
          : undefined,
        Expiration: rule.expiration
          ? {
              Days: rule.expiration.days,
              Date: rule.expiration.date,
            }
          : undefined,
        Transitions: rule.transitions?.map((transition) => ({
          Days: transition.days,
          Date: transition.date,
          StorageClass: transition.storageClass,
        })),
      })),
    },
  });

  return await client.send(command);
}

/**
 * 获取存储桶位置
 * @param bucketName 存储桶名称
 * @returns 存储桶位置信息
 */
export async function getBucketLocation(bucketName: string) {
  const client = getR2Client();

  const command = new GetBucketLocationCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 获取存储桶加密配置
 * @param bucketName 存储桶名称
 * @returns 加密配置
 */
export async function getBucketEncryption(bucketName: string) {
  const client = getR2Client();

  const command = new GetBucketEncryptionCommand({
    Bucket: bucketName,
  });

  return await client.send(command);
}

/**
 * 设置存储桶加密配置
 * @param bucketName 存储桶名称
 * @param sseAlgorithm 加密算法，默认为 AES256
 * @returns 设置结果
 */
export async function putBucketEncryption(
  bucketName: string,
  sseAlgorithm: 'AES256' | 'aws:kms' = 'AES256'
) {
  const client = getR2Client();

  const command = new PutBucketEncryptionCommand({
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: sseAlgorithm,
          },
        },
      ],
    },
  });

  return await client.send(command);
}
