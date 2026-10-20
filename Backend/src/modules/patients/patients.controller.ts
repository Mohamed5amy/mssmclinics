import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PatientsService } from './patients.service';

@Controller()
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('list-patients')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.patients.findAll(user, query.group_id);
  }

  @Get('show-patients/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.patients.findOne(id, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/add-patients')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.create(dto, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/edit-patients')
  update(@Body() dto: UpdatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.update(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-patient')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.patients.remove(dto.id, user);
  }
}
