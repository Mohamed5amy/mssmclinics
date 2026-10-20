import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { BOOKING_TYPES, PAYMENT_METHODS, RESERVATION_STATUSES } from '../reservation.schema';

/** "HH:mm", or empty for "no set time". */
const TIME = /^(([01]\d|2[0-3]):[0-5]\d)?$/;

export class CreateReservationDto {
  @IsInt({ message: 'Please choose a patient' })
  patient_id: number;

  @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @IsInt({ message: 'Please choose a service' })
  service_id: number;

  @IsOptional() @IsIn(RESERVATION_STATUSES, { message: 'Please choose a valid status' })
  status?: string;

  @IsOptional() @IsString() @MaxLength(2000) Diagnosis?: string;

  /** The day the visit is booked for, `YYYY-MM-DD`. Defaults to now. */
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;
  @IsOptional() @Matches(TIME, { message: 'Time must be HH:mm' }) time?: string;

  /** Defaults to a walk-in for today and a booking for any other day. */
  @IsOptional() @IsIn(BOOKING_TYPES, { message: 'Please choose booked or walk-in' })
  booking_type?: string;

  @IsOptional() @IsNumber({}, { message: 'Discount must be a number' }) @Min(0, { message: 'Discount cannot be negative' })
  discount?: number;

  /** Taken at the desk while booking; recorded as the visit's first payment. */
  @IsOptional() @IsNumber({}, { message: 'Amount must be a number' }) @Min(0, { message: 'Amount cannot be negative' })
  paid?: number;

  @IsOptional() @IsIn(PAYMENT_METHODS, { message: 'Please choose a payment method' })
  payment_method?: string;

  /** Send `false` to charge the full price even when the re-visit rule would apply. */
  @IsOptional() @IsBoolean() apply_followup?: boolean;

  /** The branch: a receptionist's own is used; a group owner names one (unless the group has one). */
  @IsOptional() @IsInt({ message: 'Please choose a branch' }) clinic_id?: number;

  /** The group's owner books outside the doctor's hours on purpose. Ignored for anyone else. */
  @IsOptional() @IsBoolean() override_hours?: boolean;
}

/** What the front desk may change on a reservation. The branch stays. */
export class UpdateReservationDto {
  @IsInt()
  id: number;

  @IsOptional() @IsInt() patient_id?: number;
  @IsOptional() @IsInt() doctor_id?: number;
  @IsOptional() @IsInt() service_id?: number;

  @IsOptional() @IsIn(RESERVATION_STATUSES, { message: 'Please choose a valid status' })
  status?: string;

  @IsOptional() @IsString() @MaxLength(2000) Diagnosis?: string;
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;
  @IsOptional() @Matches(TIME, { message: 'Time must be HH:mm' }) time?: string;

  @IsOptional() @IsIn(BOOKING_TYPES, { message: 'Please choose booked or walk-in' })
  booking_type?: string;

  @IsOptional() @IsNumber({}, { message: 'Discount must be a number' }) @Min(0, { message: 'Discount cannot be negative' })
  discount?: number;

  @IsOptional() @IsBoolean() apply_followup?: boolean;

  /** The group's owner moves the visit outside the doctor's hours on purpose. Ignored for anyone else. */
  @IsOptional() @IsBoolean() override_hours?: boolean;
}

/** A doctor only writes the diagnosis on their own reservations. */
export class DiagnosisDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @MaxLength(2000) Diagnosis?: string;
}

/** Query string on `list-reservations`. */
export class ListReservationsDto {
  @IsOptional() @Type(() => Number) @IsInt() group_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() clinic_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() doctor_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() patient_id?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
}

/** Query string on `queue`: one day's queue, all doctors or one, all branches or one. */
export class QueueQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() group_id?: number;
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;
  @IsOptional() @Type(() => Number) @IsInt() doctor_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() clinic_id?: number;
}

/** Query string on `reservation-quote`: what a booking would cost before it is saved. */
export class QuoteQueryDto {
  @Type(() => Number) @IsInt({ message: 'Please choose a patient' }) patient_id: number;
  @Type(() => Number) @IsInt({ message: 'Please choose a doctor' }) doctor_id: number;
  @Type(() => Number) @IsInt({ message: 'Please choose a service' }) service_id: number;
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;
  @IsOptional() @Matches(TIME, { message: 'Time must be HH:mm' }) time?: string;
  /** The reservation being edited, so it isn't counted as its own full visit. */
  @IsOptional() @Type(() => Number) @IsInt() id?: number;
}

/** `next-patient`: a doctor calls their own queue; the desk names the doctor. The branch when it isn't obvious. */
export class NextPatientDto {
  @IsOptional() @IsInt({ message: 'Please choose a doctor' }) doctor_id?: number;
  @IsOptional() @IsInt({ message: 'Please choose a branch' }) clinic_id?: number;
}

export class AddPaymentDto {
  @IsInt()
  id: number;

  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be more than zero' })
  amount: number;

  @IsIn(PAYMENT_METHODS, { message: 'Please choose a payment method' })
  method: string;
}

export class DeletePaymentDto {
  @IsInt()
  id: number;

  @IsInt()
  payment_id: number;
}
