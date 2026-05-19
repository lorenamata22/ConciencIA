import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<string>('STORAGE_PROVIDER', 'local');
  }

  async upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.provider === 's3') return this.uploadS3(storagePath, buffer, mimeType);
    return this.uploadLocal(storagePath, buffer);
  }

  async delete(storagePath: string): Promise<void> {
    if (this.provider === 's3') {
      await this.deleteS3(storagePath);
      return;
    }
    this.deleteLocal(storagePath);
  }

  // Extrai o storagePath a partir da URL gerada por upload(), e deleta o arquivo
  async deleteByUrl(url: string): Promise<void> {
    if (this.provider === 's3') {
      const bucket = this.config.get<string>('AWS_S3_BUCKET', '');
      const region = this.config.get<string>('AWS_REGION', '');
      const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
      await this.deleteS3(url.replace(prefix, ''));
      return;
    }
    const port = this.config.get<string>('BACKEND_PORT', '3001');
    const prefix = `http://localhost:${port}/uploads/`;
    this.deleteLocal(url.replace(prefix, ''));
  }

  private async uploadLocal(storagePath: string, buffer: Buffer): Promise<string> {
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

  // TODO: Ativar ao contratar S3 — instalar @aws-sdk/client-s3 e implementar estes métodos
  private async uploadS3(_path: string, _buffer: Buffer, _mimeType: string): Promise<string> {
    throw new Error('S3 não configurado. Defina STORAGE_PROVIDER=local ou implemente o provider S3.');
  }

  private async deleteS3(_path: string): Promise<void> {
    throw new Error('S3 não configurado. Defina STORAGE_PROVIDER=local.');
  }
}
