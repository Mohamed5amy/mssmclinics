import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import {
  AddPaymentDto,
  CreateReservationDto,
  DeletePaymentDto,
  DiagnosisDto,
  ListReservationsDto,
  NextPatientDto,
  QueueQueryDto,
  QuoteQueryDto,
  UpdateReservationDto,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

/**
 * Visits. The front desk (a branch's receptionists, or the group's owner) books
 * them, checks patients in and takes payments; the doctor works through the
 * queue and writes the diagnosis. Deleting a visit or a payment is the owner's
 * alone. The platform owner can read everything here and change nothing.
 */
@Controller()
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get('list-reservations')
  findAll(@Query() query: ListReservationsDto, @CurrentUser() user: AuthUser) {
    return this.reservations.findAll(query, user);
  }

  @Get('show-reservation/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.reservations.findOne(id, user);
  }

  @Roles('admin', 'owner', 'receptionist', 'doctor')
  @Get('queue')
  queue(@Query() query: QueueQueryDto, @CurrentUser() user: AuthUser) {
    return this.reservations.queue(query, user);
  }

  @Roles('owner', 'receptionist')
  @Get('reservation-quote')
  quote(@Query() query: QuoteQueryDto, @CurrentUser() user: AuthUser) {
    return this.reservations.quote(query, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/add-reservation')
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservations.create(dto, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/edit-reservation')
  update(@Body() dto: UpdateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservations.update(dto, user);
  }

  @Roles('doctor')
  @HttpCode(HttpStatus.OK)
  @Post('doctor/update-reservations')
  writeDiagnosis(@Body() dto: DiagnosisDto, @CurrentUser() user: AuthUser) {
    return this.reservations.writeDiagnosis(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-reservation')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.reservations.remove(dto.id, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('mark-reminded')
  markReminded(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.reservations.markReminded(dto.id, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('check-in-reservation')
  checkIn(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.reservations.checkIn(dto.id, user);
  }

  @Roles('doctor', 'owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('next-patient')
  nextPatient(@Body() dto: NextPatientDto, @CurrentUser() user: AuthUser) {
    return this.reservations.nextPatient(dto, user);
  }

  @Roles('owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/add-payment')
  addPayment(@Body() dto: AddPaymentDto, @CurrentUser() user: AuthUser) {
    return this.reservations.addPayment(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('clinic/delete-payment')
  deletePayment(@Body() dto: DeletePaymentDto, @CurrentUser() user: AuthUser) {
    return this.reservations.deletePayment(dto, user);
  }
}
