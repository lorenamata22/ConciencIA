import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { FileService } from './file.service';
import { StorageService } from '../storage/storage.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('files')
@UseGuards(RolesGuard)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @Roles('institution', 'teacher', 'student')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.fileService.findAllByInstitution(user.institutionId);
  }

  @Post()
  @Roles('institution', 'teacher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');

    const url = await this.uploadToStorage(user.institutionId, file);
    return this.fileService.upload(
      {
        name: file.originalname,
        type: this.extensionOf(file.originalname),
        document_type: dto.document_type,
        url,
        size: file.size,
        subject_id: dto.subject_id,
        topic_id: dto.topic_id,
        is_ai_context: dto.is_ai_context,
      },
      user.institutionId,
    );
  }

  @Put(':id/replace')
  @Roles('institution', 'teacher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async replace(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');

    const url = await this.uploadToStorage(user.institutionId, file);
    return this.fileService.replace(id, url, user.institutionId);
  }

  @Delete(':id')
  @Roles('institution', 'teacher')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fileService.delete(id, user.institutionId);
  }

  private async uploadToStorage(
    institutionId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const storagePath = `institutions/${institutionId}/files/${randomUUID()}${ext}`;
    return this.storage.upload(storagePath, file.buffer, file.mimetype);
  }

  private extensionOf(fileName: string): string {
    return path.extname(fileName).replace('.', '').toLowerCase();
  }
}
