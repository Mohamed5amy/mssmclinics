import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';
import { DEFAULT_SLOT_MINUTES } from './hours';

/** One stretch of working time on a date, "HH:mm" to "HH:mm". */
@Schema({ _id: false, versionKey: false })
export class Hours {
  @Prop({ required: true })
  start: string;

  @Prop({ required: true })
  end: string;
}

export const HoursSchema = SchemaFactory.createForClass(Hours);

/** One stretch of working time on a day of the week (0 = Sunday ... 6 = Saturday). */
@Schema({ _id: false, versionKey: false })
export class WeeklyHours extends Hours {
  @Prop({ required: true, min: 0, max: 6 })
  weekday: number;
}

export const WeeklyHoursSchema = SchemaFactory.createForClass(WeeklyHours);

/**
 * A doctor's weekly timetable at one branch, and how long each appointment is
 * there. Bookings go into slots of `slot_minutes` inside these hours, one
 * patient per slot. Set by the doctor, the branch's front desk or the owner.
 */
@Schema({ collection: 'doctor_schedules', ...baseSchemaOptions })
export class DoctorSchedule {
  @Prop({ required: true, index: true })
  group_id: number;

  @Prop({ required: true, index: true })
  doctor_id: number;

  @Prop({ required: true, index: true })
  clinic_id: number;

  @Prop({ required: true, min: 5, max: 240, default: DEFAULT_SLOT_MINUTES })
  slot_minutes: number;

  @Prop({ type: [WeeklyHoursSchema], default: [] })
  hours: WeeklyHours[];
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);
DoctorScheduleSchema.index({ doctor_id: 1, clinic_id: 1 }, { unique: true });

/**
 * A date that differs from the weekly timetable at a branch: a day off
 * (`closed`), different hours, or an extra working day.
 */
@Schema({ collection: 'schedule_exceptions', ...baseSchemaOptions })
export class ScheduleException {
  @Prop({ required: true, index: true })
  group_id: number;

  @Prop({ required: true, index: true })
  doctor_id: number;

  @Prop({ required: true, index: true })
  clinic_id: number;

  /** "YYYY-MM-DD", so ranges compare as text. */
  @Prop({ required: true })
  date: string;

  @Prop({ default: false })
  closed: boolean;

  @Prop({ type: [HoursSchema], default: [] })
  hours: Hours[];

  /** Why, for the calendar ("مؤتمر", "إجازة"). */
  @Prop({ default: '', trim: true, maxlength: 200 })
  note: string;
}

export const ScheduleExceptionSchema = SchemaFactory.createForClass(ScheduleException);
ScheduleExceptionSchema.index({ doctor_id: 1, clinic_id: 1, date: 1 }, { unique: true });
