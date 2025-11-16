import * as Minio from 'minio';
import { logger } from '@ecommerce/shared';
import { env } from '../config/env';

export class MinioClient {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
    this.bucket = env.MINIO_BUCKET;
  }

  async initialize(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
      logger.info(`Bucket ${this.bucket} created`);
    }
  }

  async upload(key: string, buffer: Buffer, metadata: Minio.ItemBucketMetadata): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, metadata);
    logger.info('File uploaded', { key });
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
    logger.info('File deleted', { key });
  }

  getUrl(key: string): string {
    return `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${this.bucket}/${key}`;
  }
}

export const minioClient = new MinioClient();
