import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { ScopeService } from '../../database/scope.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { ServicesService } from './services.service';

/** A group's one price list, managed by its owner from the settings page and used by every branch. */
@Controller()
export class ServicesController {
  constructor(
    private readonly services: ServicesService,
    private readonly scope: ScopeService,
  ) {}

  @Get('services')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.services.findAll(this.scope.groupFilter(user, query.group_id));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/services')
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: AuthUser) {
    return this.services.create(dto, this.scope.ownGroupId(user));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/update-services')
  update(@Body() dto: UpdateServiceDto, @CurrentUser() user: AuthUser) {
    return this.services.update(dto, this.scope.ownGroupId(user));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-services')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.services.remove(dto.id, this.scope.ownGroupId(user));
  }
}
