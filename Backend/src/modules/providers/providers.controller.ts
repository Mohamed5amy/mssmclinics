import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { TitleDto } from '../../common/dto/title.dto';
import { ScopeService } from '../../database/scope.service';
import { ProvidersService } from './providers.service';

/** A group's "how did the patient reach us" options, managed by its owner. */
@Controller()
export class ProvidersController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly scope: ScopeService,
  ) {}

  @Get('providers')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.providers.findAll(this.scope.groupFilter(user, query.group_id));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/providers')
  create(@Body() dto: TitleDto, @CurrentUser() user: AuthUser) {
    return this.providers.create(dto.title, this.scope.ownGroupId(user));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-providers')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.providers.remove(dto.id, this.scope.ownGroupId(user));
  }
}
