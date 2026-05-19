import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PeriodOptionService } from './period-option.service';
import { ReplacePeriodOptionsDto } from './dto/replace-period-options.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('period-options')
@UseGuards(RolesGuard)
@Roles('institution')
export class PeriodOptionController {
  constructor(private readonly service: PeriodOptionService) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAllByInstitution(user.institutionId);
  }

  @Put('me')
  replaceAll(@CurrentUser() user: JwtPayload, @Body() dto: ReplacePeriodOptionsDto) {
    return this.service.replaceAll(user.institutionId, dto.labels);
  }
}
