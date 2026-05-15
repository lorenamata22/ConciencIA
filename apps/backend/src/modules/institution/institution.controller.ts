import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('institutions')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionService.create(dto);
  }

  @Get()
  findAll() {
    return this.institutionService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.institutionService.getStats();
  }

  @Get(':id/stats')
  getDetailStats(@Param('id') id: string) {
    return this.institutionService.getDetailStats(id);
  }

  @Get(':id/users')
  getUsers(@Param('id') id: string) {
    return this.institutionService.getUsers(id);
  }

  @Delete(':id/users/:userId')
  deleteUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.institutionService.deleteUser(id, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionService.update(id, dto);
  }

  @Patch(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${req.params.id}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.institutionService.updateLogo(id, file.filename);
  }
}
