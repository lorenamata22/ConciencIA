import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Folder, DriveFile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';

// Validade da URL presignada de download (segundos)
const DOWNLOAD_URL_EXPIRES_IN = 300;

@Injectable()
export class DriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listContents(user: JwtPayload, folderId?: string) {
    const folder = folderId
      ? await this.getFolderOrThrow(user.institutionId, folderId)
      : null;

    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          institution_id: user.institutionId,
          parent_id: folderId ?? null,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.driveFile.findMany({
        where: {
          institution_id: user.institutionId,
          folder_id: folderId ?? null,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      folder: folder
        ? { id: folder.id, name: folder.name, parentId: folder.parent_id }
        : null,
      breadcrumb: folder ? await this.buildBreadcrumb(folder) : [],
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        createdBy: f.created_by,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        folderId: f.folder_id,
        mimeType: f.mime_type,
        size: f.size,
        createdBy: f.created_by,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    };
  }

  async createFolder(user: JwtPayload, dto: CreateFolderDto) {
    if (dto.parentId) {
      await this.getFolderOrThrow(user.institutionId, dto.parentId);
    }

    return this.prisma.folder.create({
      data: {
        institution_id: user.institutionId,
        parent_id: dto.parentId ?? null,
        name: dto.name,
        created_by: user.userId,
      },
    });
  }

  async renameFolder(user: JwtPayload, folderId: string, dto: RenameItemDto) {
    const folder = await this.getFolderOrThrow(user.institutionId, folderId);
    this.assertCanModify(folder, user);

    return this.prisma.folder.update({
      where: { id: folderId },
      data: { name: dto.name },
    });
  }

  async deleteFolder(user: JwtPayload, folderId: string) {
    const folder = await this.getFolderOrThrow(user.institutionId, folderId);
    this.assertCanModify(folder, user);

    const subtree = await this.collectSubtree(user.institutionId, folderId);

    // Professor só deleta se TODO o conteúdo recursivo foi criado por ele
    if (user.userType === 'teacher') {
      const foreignFolder = subtree.folders.find(
        (f) => f.created_by !== user.userId,
      );
      if (foreignFolder) {
        throw new ForbiddenException(
          'A pasta contém itens criados por outro usuário',
        );
      }

      const foreignFile = await this.prisma.driveFile.findFirst({
        where: {
          institution_id: user.institutionId,
          folder_id: { in: subtree.ids },
          created_by: { not: user.userId },
        },
        select: { id: true },
      });
      if (foreignFile) {
        throw new ForbiddenException(
          'A pasta contém itens criados por outro usuário',
        );
      }
    }

    const files = await this.prisma.driveFile.findMany({
      where: {
        institution_id: user.institutionId,
        folder_id: { in: subtree.ids },
      },
      select: { storage_path: true },
    });

    // Cascade no banco remove subpastas e arquivos; R2 limpo best-effort depois
    await this.prisma.folder.delete({ where: { id: folderId } });
    await Promise.all(
      files.map((f) => this.storage.delete(f.storage_path).catch(() => null)),
    );

    return { id: folderId };
  }

  async uploadFile(
    user: JwtPayload,
    file: Express.Multer.File,
    folderId?: string,
  ) {
    if (folderId) {
      await this.getFolderOrThrow(user.institutionId, folderId);
    }

    // Hierarquia só existe no banco — a chave no R2 é sempre plana por instituição
    const ext = extname(file.originalname);
    const storagePath = `institutions/${user.institutionId}/drive/${randomUUID()}${ext}`;
    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    return this.prisma.driveFile.create({
      data: {
        institution_id: user.institutionId,
        folder_id: folderId ?? null,
        name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        storage_path: storagePath,
        created_by: user.userId,
      },
    });
  }

  async renameFile(user: JwtPayload, fileId: string, dto: RenameItemDto) {
    const file = await this.getFileOrThrow(user.institutionId, fileId);
    this.assertCanModify(file, user);

    return this.prisma.driveFile.update({
      where: { id: fileId },
      data: { name: dto.name },
    });
  }

  async deleteFile(user: JwtPayload, fileId: string) {
    const file = await this.getFileOrThrow(user.institutionId, fileId);
    this.assertCanModify(file, user);

    await this.prisma.driveFile.delete({ where: { id: fileId } });
    await this.storage.delete(file.storage_path).catch(() => null);

    return { id: fileId };
  }

  async getDownloadUrl(user: JwtPayload, fileId: string) {
    const file = await this.getFileOrThrow(user.institutionId, fileId);

    const url = await this.storage.getSignedUrl(
      file.storage_path,
      DOWNLOAD_URL_EXPIRES_IN,
    );

    return { url, name: file.name, expiresIn: DOWNLOAD_URL_EXPIRES_IN };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getFolderOrThrow(institutionId: string, folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) throw new NotFoundException('Pasta não encontrada');
    if (folder.institution_id !== institutionId) {
      throw new ForbiddenException('Recurso não pertence à instituição');
    }
    return folder;
  }

  private async getFileOrThrow(institutionId: string, fileId: string) {
    const file = await this.prisma.driveFile.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException('Arquivo não encontrado');
    if (file.institution_id !== institutionId) {
      throw new ForbiddenException('Recurso não pertence à instituição');
    }
    return file;
  }

  // Institution modifica qualquer item; teacher só o que ele mesmo criou
  private assertCanModify(item: Folder | DriveFile, user: JwtPayload) {
    if (user.userType === 'institution') return;
    if (item.created_by !== user.userId) {
      throw new ForbiddenException(
        'Você só pode alterar itens criados por você',
      );
    }
  }

  // Monta o caminho da raiz até a pasta atual subindo a cadeia de parent_id
  private async buildBreadcrumb(folder: Folder) {
    const breadcrumb = [{ id: folder.id, name: folder.name }];
    let parentId = folder.parent_id;
    while (parentId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: parentId },
      });
      if (!parent) break;
      breadcrumb.unshift({ id: parent.id, name: parent.name });
      parentId = parent.parent_id;
    }
    return breadcrumb;
  }

  // BFS iterativo: um findMany por nível, sempre filtrado por tenant
  private async collectSubtree(institutionId: string, rootId: string) {
    const ids = [rootId];
    const folders: { id: string; created_by: string }[] = [];
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await this.prisma.folder.findMany({
        where: { institution_id: institutionId, parent_id: { in: frontier } },
        select: { id: true, created_by: true },
      });
      frontier = children.map((c) => c.id);
      ids.push(...frontier);
      folders.push(...children);
    }
    return { ids, folders };
  }
}
