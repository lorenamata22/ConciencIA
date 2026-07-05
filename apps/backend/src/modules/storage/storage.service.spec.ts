import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presignGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
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
});
