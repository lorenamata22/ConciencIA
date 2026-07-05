import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly provider: string;
  private s3Client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<string>('STORAGE_PROVIDER', 'local');

    if (this.provider === 's3') {
      const endpoint = config.get<string>('AWS_S3_ENDPOINT');
      this.s3Client = new S3Client({
        region: config.get<string>('AWS_REGION', 'auto'),
        credentials: {
          accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
          secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
        },
        // endpoint opcional — definido para R2, omitido para AWS S3 padrão
        ...(endpoint ? { endpoint } : {}),
      });
    }
  }

  async upload(
    storagePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (this.provider === 's3')
      return this.uploadS3(storagePath, buffer, mimeType);
    return this.uploadLocal(storagePath, buffer);
  }

  async delete(storagePath: string): Promise<void> {
    if (this.provider === 's3') {
      await this.deleteS3(storagePath);
      return;
    }
    this.deleteLocal(storagePath);
  }

  async deleteByUrl(url: string): Promise<void> {
    if (this.provider === 's3') {
      const publicUrl = this.config.get<string>('AWS_S3_PUBLIC_URL', '');
      await this.deleteS3(url.replace(`${publicUrl}/`, ''));
      return;
    }
    const port = this.config.get<string>('BACKEND_PORT', '3001');
    const prefix = `http://localhost:${port}/uploads/`;
    this.deleteLocal(url.replace(prefix, ''));
  }

  private async uploadLocal(
    storagePath: string,
    buffer: Buffer,
  ): Promise<string> {
    const fullPath = path.join(process.cwd(), 'uploads', storagePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    const port = this.config.get<string>('BACKEND_PORT', '3001');
    return `http://localhost:${port}/uploads/${storagePath}`;
  }

  private deleteLocal(storagePath: string): void {
    const fullPath = path.join(process.cwd(), 'uploads', storagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  private async uploadS3(
    storagePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET', '');

    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storagePath,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const publicUrl = this.config.get<string>('AWS_S3_PUBLIC_URL', '');
    return `${publicUrl}/${storagePath}`;
  }

  // Gera URL presignada de download com validade curta.
  // Provider 'local': retorna a URL estática servida pelo backend.
  async getSignedUrl(
    storagePath: string,
    expiresSeconds = 300,
  ): Promise<string> {
    if (this.provider === 's3') {
      const bucket = this.config.get<string>('AWS_S3_BUCKET', '');
      return getSignedUrl(
        this.s3Client!,
        new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
        { expiresIn: expiresSeconds },
      );
    }
    const port = this.config.get<string>('BACKEND_PORT', '3001');
    return `http://localhost:${port}/uploads/${storagePath}`;
  }

  private async deleteS3(storagePath: string): Promise<void> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET', '');

    await this.s3Client!.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storagePath,
      }),
    );
  }
}
