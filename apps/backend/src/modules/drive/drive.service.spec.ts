import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriveService } from './drive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('DriveService', () => {
  let service: DriveService;
  let prismaMock: PrismaMock;
  let storageMock: {
    upload: jest.Mock;
    delete: jest.Mock;
    getSignedUrl: jest.Mock;
  };

  const institutionId = 'inst-id-1';

  const institutionUser: JwtPayload = {
    userId: 'inst-user-1',
    institutionId,
    userType: 'institution',
  };
  const teacherUser: JwtPayload = {
    userId: 'teacher-user-1',
    institutionId,
    userType: 'teacher',
  };

  const mockFolder = {
    id: 'folder-id-1',
    institution_id: institutionId,
    parent_id: null,
    name: 'Matemáticas',
    created_by: teacherUser.userId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFile = {
    id: 'file-id-1',
    institution_id: institutionId,
    folder_id: mockFolder.id,
    name: 'apuntes.pdf',
    mime_type: 'application/pdf',
    size: 1234,
    storage_path: 'institutions/inst-id-1/drive/key-1.pdf',
    created_by: teacherUser.userId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const multerFile = {
    originalname: 'apuntes.pdf',
    mimetype: 'application/pdf',
    size: 1234,
    buffer: Buffer.from('conteudo'),
  } as Express.Multer.File;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    storageMock = {
      upload: jest.fn().mockResolvedValue('https://r2.example.com/key'),
      delete: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue('https://r2.example.com/presigned'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriveService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<DriveService>(DriveService);
  });

  describe('listContents', () => {
    it('should return root folders and files filtered by institution_id when no folderId is given', async () => {
      prismaMock.folder.findMany.mockResolvedValue([mockFolder] as any);
      prismaMock.driveFile.findMany.mockResolvedValue([mockFile] as any);

      const result = await service.listContents(teacherUser);

      expect(prismaMock.folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, parent_id: null },
        }),
      );
      expect(prismaMock.driveFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, folder_id: null },
        }),
      );
      expect(result.folder).toBeNull();
      expect(result.breadcrumb).toEqual([]);
      expect(result.folders[0]).toEqual(
        expect.objectContaining({
          id: mockFolder.id,
          name: mockFolder.name,
          createdBy: mockFolder.created_by,
        }),
      );
      expect(result.files[0]).toEqual(
        expect.objectContaining({
          id: mockFile.id,
          name: mockFile.name,
          mimeType: mockFile.mime_type,
          createdBy: mockFile.created_by,
        }),
      );
    });

    it('should return folder contents with breadcrumb path from root', async () => {
      const child = {
        ...mockFolder,
        id: 'folder-id-2',
        name: 'Álgebra',
        parent_id: mockFolder.id,
      };
      prismaMock.folder.findUnique
        .mockResolvedValueOnce(child as any) // pasta pedida
        .mockResolvedValueOnce(mockFolder as any); // pai (breadcrumb)
      prismaMock.folder.findMany.mockResolvedValue([] as any);
      prismaMock.driveFile.findMany.mockResolvedValue([] as any);

      const result = await service.listContents(teacherUser, child.id);

      expect(result.folder).toEqual({
        id: child.id,
        name: child.name,
        parentId: mockFolder.id,
      });
      expect(result.breadcrumb).toEqual([
        { id: mockFolder.id, name: mockFolder.name },
        { id: child.id, name: child.name },
      ]);
    });

    it('should throw NotFoundException when listed folder does not exist', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(null);

      await expect(
        service.listContents(teacherUser, 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when listed folder belongs to another institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.listContents(teacherUser, mockFolder.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createFolder', () => {
    it('should create folder at root with institution_id and created_by from JWT', async () => {
      prismaMock.folder.create.mockResolvedValue(mockFolder as any);

      await service.createFolder(teacherUser, { name: 'Matemáticas' });

      expect(prismaMock.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            parent_id: null,
            name: 'Matemáticas',
            created_by: teacherUser.userId,
          }),
        }),
      );
    });

    it('should create nested folder when parent belongs to the same institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.create.mockResolvedValue({
        ...mockFolder,
        id: 'folder-id-2',
        parent_id: mockFolder.id,
      } as any);

      await service.createFolder(teacherUser, {
        name: 'Álgebra',
        parentId: mockFolder.id,
      });

      expect(prismaMock.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parent_id: mockFolder.id }),
        }),
      );
    });

    it('should throw NotFoundException when parent folder does not exist', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(null);

      await expect(
        service.createFolder(teacherUser, {
          name: 'Álgebra',
          parentId: 'missing-id',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.folder.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when parent folder belongs to another institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.createFolder(teacherUser, {
          name: 'Álgebra',
          parentId: mockFolder.id,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.create).not.toHaveBeenCalled();
    });
  });

  describe('renameFolder', () => {
    it('should rename any folder when user is institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        created_by: 'someone-else',
      } as any);
      prismaMock.folder.update.mockResolvedValue(mockFolder as any);

      await service.renameFolder(institutionUser, mockFolder.id, {
        name: 'Novo nome',
      });

      expect(prismaMock.folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockFolder.id },
          data: { name: 'Novo nome' },
        }),
      );
    });

    it('should rename folder when teacher is the creator', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.update.mockResolvedValue(mockFolder as any);

      await service.renameFolder(teacherUser, mockFolder.id, {
        name: 'Novo nome',
      });

      expect(prismaMock.folder.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when teacher renames a folder created by another user', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        created_by: 'someone-else',
      } as any);

      await expect(
        service.renameFolder(teacherUser, mockFolder.id, { name: 'Novo nome' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when renamed folder belongs to another institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.renameFolder(institutionUser, mockFolder.id, {
          name: 'Novo nome',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder subtree and remove all descendant files from storage when user is institution', async () => {
      const child = {
        id: 'folder-id-2',
        created_by: 'someone-else',
      };
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.findMany
        .mockResolvedValueOnce([child] as any)
        .mockResolvedValueOnce([] as any);
      prismaMock.driveFile.findMany.mockResolvedValue([
        { storage_path: 'path/a.pdf' },
        { storage_path: 'path/b.pdf' },
      ] as any);
      prismaMock.folder.delete.mockResolvedValue(mockFolder as any);

      await service.deleteFolder(institutionUser, mockFolder.id);

      expect(prismaMock.driveFile.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.folder.delete).toHaveBeenCalledWith({
        where: { id: mockFolder.id },
      });
      expect(storageMock.delete).toHaveBeenCalledWith('path/a.pdf');
      expect(storageMock.delete).toHaveBeenCalledWith('path/b.pdf');
    });

    it('should allow teacher to delete folder when all descendant folders and files were created by them', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.findMany
        .mockResolvedValueOnce([
          { id: 'folder-id-2', created_by: teacherUser.userId },
        ] as any)
        .mockResolvedValueOnce([] as any);
      prismaMock.driveFile.findFirst.mockResolvedValue(null);
      prismaMock.driveFile.findMany.mockResolvedValue([
        { storage_path: 'path/a.pdf' },
      ] as any);
      prismaMock.folder.delete.mockResolvedValue(mockFolder as any);

      await service.deleteFolder(teacherUser, mockFolder.id);

      expect(prismaMock.driveFile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            created_by: { not: teacherUser.userId },
          }),
        }),
      );
      expect(prismaMock.folder.delete).toHaveBeenCalled();
      expect(storageMock.delete).toHaveBeenCalledWith('path/a.pdf');
    });

    it('should throw ForbiddenException when teacher deletes folder containing a subfolder created by another user', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.findMany
        .mockResolvedValueOnce([
          { id: 'folder-id-2', created_by: 'someone-else' },
        ] as any)
        .mockResolvedValueOnce([] as any);

      await expect(
        service.deleteFolder(teacherUser, mockFolder.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.delete).not.toHaveBeenCalled();
      expect(storageMock.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when teacher deletes folder containing a file created by another user in a nested subfolder', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.findMany
        .mockResolvedValueOnce([
          { id: 'folder-id-2', created_by: teacherUser.userId },
        ] as any)
        .mockResolvedValueOnce([] as any);
      prismaMock.driveFile.findFirst.mockResolvedValue({
        id: 'foreign-file',
      } as any);

      await expect(
        service.deleteFolder(teacherUser, mockFolder.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when teacher deletes a folder created by another user', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        created_by: 'someone-else',
      } as any);

      await expect(
        service.deleteFolder(teacherUser, mockFolder.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.folder.delete).not.toHaveBeenCalled();
    });

    it('should not fail folder deletion when storage delete rejects', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(mockFolder as any);
      prismaMock.folder.findMany.mockResolvedValueOnce([] as any);
      prismaMock.driveFile.findMany.mockResolvedValue([
        { storage_path: 'path/a.pdf' },
      ] as any);
      prismaMock.folder.delete.mockResolvedValue(mockFolder as any);
      storageMock.delete.mockRejectedValue(new Error('r2 indisponível'));

      await expect(
        service.deleteFolder(institutionUser, mockFolder.id),
      ).resolves.toBeDefined();
      expect(prismaMock.folder.delete).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload file to storage and create drive_file with institution_id, created_by and storage_path', async () => {
      prismaMock.driveFile.create.mockResolvedValue(mockFile as any);

      await service.uploadFile(teacherUser, multerFile);

      expect(storageMock.upload).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^institutions/${institutionId}/drive/.+\\.pdf$`),
        ),
        multerFile.buffer,
        multerFile.mimetype,
      );
      expect(prismaMock.driveFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            folder_id: null,
            name: multerFile.originalname,
            mime_type: multerFile.mimetype,
            size: multerFile.size,
            created_by: teacherUser.userId,
            storage_path: expect.stringMatching(
              new RegExp(`^institutions/${institutionId}/drive/`),
            ),
          }),
        }),
      );
    });

    it('should throw NotFoundException when upload target folder does not exist', async () => {
      prismaMock.folder.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadFile(teacherUser, multerFile, 'missing-id'),
      ).rejects.toThrow(NotFoundException);
      expect(storageMock.upload).not.toHaveBeenCalled();
      expect(prismaMock.driveFile.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when upload target folder belongs to another institution', async () => {
      prismaMock.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.uploadFile(teacherUser, multerFile, mockFolder.id),
      ).rejects.toThrow(ForbiddenException);
      expect(storageMock.upload).not.toHaveBeenCalled();
    });
  });

  describe('renameFile', () => {
    it('should rename any file when user is institution', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        created_by: 'someone-else',
      } as any);
      prismaMock.driveFile.update.mockResolvedValue(mockFile as any);

      await service.renameFile(institutionUser, mockFile.id, {
        name: 'novo.pdf',
      });

      expect(prismaMock.driveFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockFile.id },
          data: { name: 'novo.pdf' },
        }),
      );
    });

    it('should rename file when teacher is the creator', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue(mockFile as any);
      prismaMock.driveFile.update.mockResolvedValue(mockFile as any);

      await service.renameFile(teacherUser, mockFile.id, { name: 'novo.pdf' });

      expect(prismaMock.driveFile.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when teacher renames a file created by another user', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        created_by: 'someone-else',
      } as any);

      await expect(
        service.renameFile(teacherUser, mockFile.id, { name: 'novo.pdf' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.driveFile.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when renamed file belongs to another institution', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.renameFile(institutionUser, mockFile.id, { name: 'novo.pdf' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.driveFile.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file and call storage.delete with its storage_path', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue(mockFile as any);
      prismaMock.driveFile.delete.mockResolvedValue(mockFile as any);

      await service.deleteFile(teacherUser, mockFile.id);

      expect(prismaMock.driveFile.delete).toHaveBeenCalledWith({
        where: { id: mockFile.id },
      });
      expect(storageMock.delete).toHaveBeenCalledWith(mockFile.storage_path);
    });

    it('should throw ForbiddenException when teacher deletes a file created by another user', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        created_by: 'someone-else',
      } as any);

      await expect(
        service.deleteFile(teacherUser, mockFile.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.driveFile.delete).not.toHaveBeenCalled();
      expect(storageMock.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when deleted file belongs to another institution', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.deleteFile(institutionUser, mockFile.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.driveFile.delete).not.toHaveBeenCalled();
    });

    it('should not fail file deletion when storage delete rejects', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue(mockFile as any);
      prismaMock.driveFile.delete.mockResolvedValue(mockFile as any);
      storageMock.delete.mockRejectedValue(new Error('r2 indisponível'));

      await expect(
        service.deleteFile(teacherUser, mockFile.id),
      ).resolves.toBeDefined();
      expect(prismaMock.driveFile.delete).toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('should return presigned url with short expiration after validating tenant', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue(mockFile as any);

      const result = await service.getDownloadUrl(teacherUser, mockFile.id);

      expect(storageMock.getSignedUrl).toHaveBeenCalledWith(
        mockFile.storage_path,
        300,
      );
      expect(result).toEqual({
        url: 'https://r2.example.com/presigned',
        name: mockFile.name,
        expiresIn: 300,
      });
    });

    it('should throw NotFoundException when downloaded file does not exist', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue(null);

      await expect(
        service.getDownloadUrl(teacherUser, 'missing-id'),
      ).rejects.toThrow(NotFoundException);
      expect(storageMock.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when downloaded file belongs to another institution', async () => {
      prismaMock.driveFile.findUnique.mockResolvedValue({
        ...mockFile,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.getDownloadUrl(teacherUser, mockFile.id),
      ).rejects.toThrow(ForbiddenException);
      expect(storageMock.getSignedUrl).not.toHaveBeenCalled();
    });
  });
});
