import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { ClinicsService } from './clinics.service';
import { ClinicSettingsDto, CreateClinicDto, UpdateClinicDto } from './dto/clinic.dto';

/**
 * Branches. A group's owner creates and manages them. Reads are open to every
 * role, scoped: the platform sees all, an owner its group, a receptionist or
 * doctor the branches they work at.
 */
@Controller()
export class ClinicsController {
  constructor(private readonly clinics: ClinicsService) {}

  @Get('list-clinic')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.clinics.findAll(user, query);
  }

  @Get('show-clinic/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.clinics.findOne(id, user);
  }

  @Roles('owner', 'admin')
  @Get('clinic/settings')
  settings(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.clinics.settings(user, query.group_id);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/settings')
  updateSettings(@Body() dto: ClinicSettingsDto, @CurrentUser() user: AuthUser) {
    return this.clinics.updateSettings(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('add-clinic')
  create(@Body() dto: CreateClinicDto, @CurrentUser() user: AuthUser) {
    return this.clinics.create(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('edit-clinic')
  update(@Body() dto: UpdateClinicDto, @CurrentUser() user: AuthUser) {
    return this.clinics.update(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-clinic')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.clinics.remove(dto.id, user);
  }
}
