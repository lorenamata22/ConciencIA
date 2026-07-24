import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AlertService } from './alert.service';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// Leitura pedagógica de alertas — professor e instituição. Todo acesso é
// isolado pelo institution_id do JWT (nunca do path/body).
@Controller()
@UseGuards(RolesGuard)
@Roles('teacher', 'institution')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get('students/:id/alerts')
  findByStudent(
    @CurrentUser() user: JwtPayload,
    @Param('id') studentId: string,
    @Query() query: ListAlertsQueryDto,
  ) {
    const resolved =
      query.resolved === undefined ? undefined : query.resolved === 'true';
    return this.alertService.findByStudent(studentId, user.institutionId, {
      resolved,
    });
  }

  @Patch('alerts/:id/resolve')
  resolve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.alertService.resolve(id, user.userId, user.institutionId);
  }

  @Get('classes/:classId/alerts/by-topic')
  alertsByTopic(
    @CurrentUser() user: JwtPayload,
    @Param('classId') classId: string,
  ) {
    return this.alertService.getAlertsByTopic(classId, user.institutionId);
  }
}
