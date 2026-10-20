import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SLOT_LENGTHS } from '../hours';

const START = /^([01]\d|2[0-3]):[0-5]\d$/;
/** A period may run to midnight. */
const END = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export class HoursDto {
  @Matches(START, { message: 'Time must be HH:mm' })
  start: string;

  @Matches(END, { message: 'Time must be HH:mm' })
  end: string;
}

export class WeeklyHoursDto extends HoursDto {
  @IsInt() @Min(0) @Max(6)
  weekday: number;
}

/** A doctor's whole weekly timetable at one branch; replaces the old one. */
export class SaveWeeklyDto {
  @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;

  @IsIn(SLOT_LENGTHS, { message: 'Please choose the appointment length' })
  slot_minutes: number;

  @IsArray()
  @ArrayMaxSize(70)
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursDto)
  hours: WeeklyHoursDto[];
}

/** One date's hours at a branch: a day off, or hours other than the weekly ones. */
export class SaveDayDto {
  @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;

  @IsDateString({}, { message: 'Please choose a valid date' })
  date: string;

  @IsBoolean()
  closed: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => HoursDto)
  hours?: HoursDto[];

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

/** Puts a date back on the weekly timetable. */
export class ResetDayDto {
  @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;

  @IsDateString({}, { message: 'Please choose a valid date' })
  date: string;
}

/** `doctor-schedule?doctor_id=` */
export class ScheduleQueryDto {
  @Type(() => Number) @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;
}

/** `doctor-calendar`: each day's hours and how full it is, for up to two months. */
export class CalendarQueryDto {
  @Type(() => Number) @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @Type(() => Number) @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;

  @IsDateString({}, { message: 'Please choose a valid date' })
  start: string;

  @IsDateString({}, { message: 'Please choose a valid date' })
  end: string;
}

/** `doctor-slots`: one day's appointment slots. `exclude` is the visit being moved. */
export class SlotsQueryDto {
  @Type(() => Number) @IsInt({ message: 'Please choose a doctor' })
  doctor_id: number;

  @Type(() => Number) @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;

  @IsDateString({}, { message: 'Please choose a valid date' })
  date: string;

  @IsOptional() @Type(() => Number) @IsInt()
  exclude?: number;
}
