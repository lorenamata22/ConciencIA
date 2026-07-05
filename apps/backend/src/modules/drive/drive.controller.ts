import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DriveService } from './drive.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('drive')
@UseGuards(RolesGuard)
@Roles('institution', 'teacher', 'student')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('contents')
  listContents(
    @CurrentUser() user: JwtPayload,
    @Query('folderId') folderId?: string,
  ) {
    return this.driveService.listContents(user, folderId || undefined);
  }

  @Post('folders')
  @Roles('institution', 'teacher')
  createFolder(@CurrentUser() user: JwtPayload, @Body() dto: CreateFolderDto) {
    return this.driveService.createFolder(user, dto);
  }

  @Patch('folders/:id')
  @Roles('institution', 'teacher')
  renameFolder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.driveService.renameFolder(user, id, dto);
  }

  @Delete('folders/:id')
  @Roles('institution', 'teacher')
  deleteFolder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.driveService.deleteFolder(user, id);
  }

  @Post('files')
  @Roles('institution', 'teacher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.driveService.uploadFile(user, file, dto.folderId);
  }

  @Patch('files/:id')
  @Roles('institution', 'teacher')
  renameFile(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.driveService.renameFile(user, id, dto);
  }

  @Delete('files/:id')
  @Roles('institution', 'teacher')
  deleteFile(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.driveService.deleteFile(user, id);
  }

  @Get('files/:id/download')
  getDownloadUrl(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.driveService.getDownloadUrl(user, id);
  }
}
