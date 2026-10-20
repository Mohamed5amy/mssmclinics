import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { CreateReceptionistDto, UpdateReceptionistDto } from './dto/receptionist.dto';
import { ReceptionistsService } from './receptionists.service';

/** A group's owner manages its branches' front-desk accounts; the platform can look. */
@Controller()
export class ReceptionistsController {
  constructor(private readonly receptionists: ReceptionistsService) {}

  @Roles('admin', 'owner')
  @Get('list-receptionists')
  findAll(@Query() query: ScopeQueryDto, @CurrentUser() user: AuthUser) {
    return this.receptionists.findAll(user, query);
  }

  @Roles('admin', 'owner')
  @Get('show-receptionist/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.receptionists.findOne(id, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/add-receptionist')
  create(@Body() dto: CreateReceptionistDto, @CurrentUser() user: AuthUser) {
    return this.receptionists.create(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/edit-receptionist')
  update(@Body() dto: UpdateReceptionistDto, @CurrentUser() user: AuthUser) {
    return this.receptionists.update(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-receptionist')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.receptionists.remove(dto.id, user);
  }
}
