import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('classes')
@UseGuards(RolesGuard)
@Roles('institution')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.classService.findAllByInstitution(user.institutionId);
  }

  @Get('me/:id/users')
  findUsers(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classService.findUsersByClass(user.institutionId, id);
  }

  @Post('me')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.classService.create(user.institutionId, dto);
  }

  @Patch('me/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classService.update(user.institutionId, id, dto);
  }

  @Delete('me/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classService.remove(user.institutionId, id);
  }
}
