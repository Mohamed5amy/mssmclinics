import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** `cash-report?date&clinic_id&group_id`: the money taken at the desk on one day. */
export class CashReportQueryDto {
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;
  @IsOptional() @Type(() => Number) @IsInt() clinic_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() group_id?: number;
}

/** `doctor-statement?doctor_id&start&end`: a doctor's share and payouts over a period (this month by default). */
export class StatementQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() doctor_id?: number;
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) start?: string;
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) end?: string;
}

export class AddPayoutDto {
  @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be more than zero' })
  amount: number;

  /** The day it was paid, `YYYY-MM-DD`; today by default. */
  @IsOptional() @IsDateString({}, { message: 'Please choose a valid date' }) date?: string;

  @IsOptional() @IsString() @MaxLength(200) note?: string;
}
