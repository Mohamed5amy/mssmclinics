import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, UpdateDoctorDto } from './dto/doctor.dto';

/** A group's doctors - its owner adds them and chooses the branches they work at. */
@Controller()
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Get('list-doctors')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.doctors.findAll(user, query);
  }

  @Get('show-doctors/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.doctors.findOne(id, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/add-doctors')
  create(@Body() dto: CreateDoctorDto, @CurrentUser() user: AuthUser) {
    return this.doctors.create(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/edit-doctors')
  update(@Body() dto: UpdateDoctorDto, @CurrentUser() user: AuthUser) {
    return this.doctors.update(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-doctors')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.doctors.remove(dto.id, user);
  }
}
