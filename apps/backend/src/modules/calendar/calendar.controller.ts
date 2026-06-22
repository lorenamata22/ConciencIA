import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Roles('student', 'teacher', 'institution')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendarService.findAllForUser(user, { from, to });
  }

  // Rota literal antes de :id para não ser capturada pelo param dinâmico
  @Get('classes')
  @Roles('teacher', 'institution')
  findClasses(@CurrentUser() user: JwtPayload) {
    return this.calendarService.findSelectableClasses(user);
  }

  @Get(':id')
  @Roles('student', 'teacher', 'institution')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.calendarService.findOne(id, user);
  }

  @Post()
  @Roles('teacher', 'institution')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEventDto) {
    return this.calendarService.create(dto, user);
  }

  @Patch(':id')
  @Roles('teacher', 'institution')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('teacher', 'institution')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.calendarService.remove(id, user);
  }
}
