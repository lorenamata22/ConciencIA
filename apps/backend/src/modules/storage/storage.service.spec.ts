import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presignGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Mock parcial do fs — só readFileSync, usado pelo downloadByUrl local
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  readFileSync: jest.fn(),
}));

// Mock do ConfigService com valores por chave (segundo argumento = default)
const createConfigMock = (values: Record<string, string>) => ({
  get: jest.fn((key: string, def?: string) => values[key] ?? def),
});

describe('StorageService', () => {
  const storagePath = 'institutions/inst-id-1/drive/file-key.pdf';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildService = async (config: Record<string, string>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: createConfigMock(config) },
      ],
    }).compile();
    return module.get<StorageService>(StorageService);
  };

  describe('getSignedUrl', () => {
    it('should return presigned url for s3 provider with bucket, key and expiration', async () => {
      (presignGetSignedUrl as jest.Mock).mockResolvedValue(
        'https://r2.example.com/presigned',
      );
      const service = await buildService({
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'bucket-test',
      });

      const url = await service.getSignedUrl(storagePath, 300);

      expect(url).toBe('https://r2.example.com/presigned');
      expect(presignGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 300 },
      );
      const command = (presignGetSignedUrl as jest.Mock).mock
        .calls[0][1] as GetObjectCommand;
      expect(command.input).toEqual({
        Bucket: 'bucket-test',
        Key: storagePath,
      });
    });

    it('should default expiration to 300 seconds when not provided', async () => {
      (presignGetSignedUrl as jest.Mock).mockResolvedValue(
        'https://r2.example.com/presigned',
      );
      const service = await buildService({
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'bucket-test',
      });

      await service.getSignedUrl(storagePath);

      expect(presignGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 300 },
      );
    });

    it('should return local uploads url when provider is local', async () => {
      const service = await buildService({
        STORAGE_PROVIDER: 'local',
        BACKEND_PORT: '3001',
      });

      const url = await service.getSignedUrl(storagePath);

      expect(url).toBe(`http://localhost:3001/uploads/${storagePath}`);
      expect(presignGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('downloadByUrl', () => {
    it('should download bytes from s3 resolving the key from the public url', async () => {
      const service = await buildService({
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'bucket-test',
        AWS_S3_PUBLIC_URL: 'https://cdn.example.com',
      });
      const fileBytes = new Uint8Array([1, 2, 3]);
      const sendMock = jest.fn().mockResolvedValue({
        Body: { transformToByteArray: jest.fn().mockResolvedValue(fileBytes) },
      });
      (service as unknown as { s3Client: { send: jest.Mock } }).s3Client = {
        send: sendMock,
      };

      const buffer = await service.downloadByUrl(
        `https://cdn.example.com/${storagePath}`,
      );

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect([...buffer]).toEqual([1, 2, 3]);
      const command = sendMock.mock.calls[0][0] as GetObjectCommand;
      expect(command.input).toEqual({
        Bucket: 'bucket-test',
        Key: storagePath,
      });
    });

    it('should read bytes from local uploads dir when provider is local', async () => {
      const service = await buildService({
        STORAGE_PROVIDER: 'local',
        BACKEND_PORT: '3001',
      });
      const readMock = fs.readFileSync as jest.Mock;
      readMock.mockReturnValue(Buffer.from('local-bytes'));

      const buffer = await service.downloadByUrl(
        `http://localhost:3001/uploads/${storagePath}`,
      );

      expect(buffer.toString()).toBe('local-bytes');
      expect(readMock).toHaveBeenCalledWith(
        expect.stringContaining(storagePath.replace(/\//g, path.sep)),
      );
    });
  });
});
