import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('topics')
@UseGuards(RolesGuard)
@Roles('institution', 'teacher')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTopicDto) {
    return this.topicService.create(dto, user.institutionId);
  }

  // GET /topics?module_id=... — tópicos de um módulo (ordem asc)
  @Get()
  findByModule(
    @CurrentUser() user: JwtPayload,
    @Query('module_id') moduleId: string,
  ) {
    return this.topicService.findByModule(moduleId, user.institutionId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.topicService.findOne(id, user.institutionId);
  }
}
