import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { HomeService } from './home.service';

@Controller()
export class HomeController {
  constructor(private readonly home: HomeService) {}

  /** The insights page - the platform's and the group owners'. */
  @Roles('admin', 'owner')
  @Get('home')
  summary(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.home.summary(user, query);
  }
}
