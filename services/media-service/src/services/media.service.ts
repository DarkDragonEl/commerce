import { Media, MediaType } from '@prisma/client';
import { logger } from '@ecommerce/shared';
import { prisma } from '../config/database';
import { minioClient } from '../clients/minio.client';
import crypto from 'crypto';
import { env } from '../config/env';

export class MediaService {
  async upload(file: {
    data: Buffer;
    filename: string;
    mimetype: string;
    size: number;
  }, uploadedBy?: string): Promise<Media> {
    if (file.size > env.MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    const allowedTypes = env.ALLOWED_TYPES.split(',');
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }

    const key = `${crypto.randomUUID()}-${file.filename}`;
    const type = this.getMediaType(file.mimetype);

    await minioClient.upload(key, file.data, {
      'Content-Type': file.mimetype,
      'Content-Length': file.size,
    });

    const media = await prisma.media.create({
      data: {
        filename: file.filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        type,
        url: minioClient.getUrl(key),
        bucket: env.MINIO_BUCKET,
        key,
        uploadedBy,
      },
    });

    logger.info('Media uploaded', { mediaId: media.id, key });
    return media;
  }

  async get(id: string): Promise<Media | null> {
    return await prisma.media.findUnique({ where: { id } });
  }

  async download(id: string): Promise<{ buffer: Buffer; media: Media }> {
    const media = await this.get(id);
    if (!media) throw new Error('Media not found');

    const buffer = await minioClient.download(media.key);
    return { buffer, media };
  }

  async delete(id: string): Promise<void> {
    const media = await this.get(id);
    if (!media) throw new Error('Media not found');

    await minioClient.delete(media.key);
    await prisma.media.delete({ where: { id } });

    logger.info('Media deleted', { mediaId: id });
  }

  async list(params: { skip?: number; take?: number; type?: MediaType }): Promise<Media[]> {
    return await prisma.media.findMany({
      where: params.type ? { type: params.type } : undefined,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  private getMediaType(mimetype: string): MediaType {
    if (mimetype.startsWith('image/')) return MediaType.IMAGE;
    if (mimetype.startsWith('video/')) return MediaType.VIDEO;
    if (mimetype === 'application/pdf') return MediaType.DOCUMENT;
    return MediaType.OTHER;
  }
}
