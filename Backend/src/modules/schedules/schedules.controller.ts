import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CalendarQueryDto,
  ResetDayDto,
  SaveDayDto,
  SaveWeeklyDto,
  ScheduleQueryDto,
  SlotsQueryDto,
} from './dto/schedule.dto';
import { SchedulesService } from './schedules.service';

/**
 * Doctors' working hours at each branch: a weekly timetable, dates set apart
 * from it (days off, other hours), and the appointment slots bookings go into.
 * The doctor sets their own; the front desk sets them for the doctors at its
 * branch; the owner for everyone. The platform owner can only look.
 */
@Controller()
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get('doctor-schedule')
  forDoctor(@Query() query: ScheduleQueryDto, @CurrentUser() user: AuthUser) {
    return this.schedules.forDoctor(query.doctor_id, user);
  }

  @Get('doctor-calendar')
  calendar(@Query() query: CalendarQueryDto, @CurrentUser() user: AuthUser) {
    return this.schedules.calendar(query, user);
  }

  @Get('doctor-slots')
  slots(@Query() query: SlotsQueryDto, @CurrentUser() user: AuthUser) {
    return this.schedules.daySlots(query, user);
  }

  @Roles('owner', 'receptionist', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('doctor-schedule')
  saveWeekly(@Body() dto: SaveWeeklyDto, @CurrentUser() user: AuthUser) {
    return this.schedules.saveWeekly(dto, user);
  }

  @Roles('owner', 'receptionist', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('doctor-schedule-day')
  saveDay(@Body() dto: SaveDayDto, @CurrentUser() user: AuthUser) {
    return this.schedules.saveDay(dto, user);
  }

  @Roles('owner', 'receptionist', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('reset-doctor-schedule-day')
  resetDay(@Body() dto: ResetDayDto, @CurrentUser() user: AuthUser) {
    return this.schedules.resetDay(dto, user);
  }
}
