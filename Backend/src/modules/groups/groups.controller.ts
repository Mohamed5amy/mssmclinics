import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { CreateGroupDto, GroupStatusDto, UpdateGroupDto } from './dto/group.dto';
import { GroupsService } from './groups.service';

/** Everything here is the platform owner's - the only writes it may make. */
@Roles('admin')
@Controller()
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get('list-groups')
  findAll() {
    return this.groups.findAll();
  }

  @Get('show-group/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groups.findOne(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('add-group')
  create(@Body() dto: CreateGroupDto) {
    return this.groups.create(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('edit-group')
  update(@Body() dto: UpdateGroupDto) {
    return this.groups.update(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('group-status')
  setStatus(@Body() dto: GroupStatusDto) {
    return this.groups.setStatus(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete-group')
  remove(@Body() dto: DeleteDto) {
    return this.groups.remove(dto.id);
  }
}
