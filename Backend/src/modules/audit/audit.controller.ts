import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActivityQueryDto } from './dto/activity.dto';
import { AuditService } from './audit.service';

/** The activity log: a group's owner reads its own group's, the platform everyone's. */
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('admin', 'owner')
  @Get('activity-log')
  list(@Query() query: ActivityQueryDto, @CurrentUser() user: AuthUser) {
    return this.audit.list(query, user);
  }
}
