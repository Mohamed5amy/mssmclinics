import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { TitleDto } from '../../common/dto/title.dto';
import { ScopeService } from '../../database/scope.service';
import { SpecialtiesService } from './specialties.service';

/** A group's specialties, managed by its owner from the settings page. */
@Controller()
export class SpecialtiesController {
  constructor(
    private readonly specialties: SpecialtiesService,
    private readonly scope: ScopeService,
  ) {}

  @Get('specialties')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.specialties.findAll(this.scope.groupFilter(user, query.group_id));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/specialties')
  create(@Body() dto: TitleDto, @CurrentUser() user: AuthUser) {
    return this.specialties.create(dto.title, this.scope.ownGroupId(user));
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-specialties')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.specialties.remove(dto.id, this.scope.ownGroupId(user));
  }
}
