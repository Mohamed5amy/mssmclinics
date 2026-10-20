import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type ClinicDocument = HydratedDocument<Clinic>;

/** A closed branch keeps its history but takes no new bookings and lets no one sign in for it. */
export const ClinicStatus = { Active: 'active', Closed: 'closed' } as const;
export const CLINIC_STATUSES: string[] = Object.values(ClinicStatus);

/**
 * A branch (فرع) of a group. It has no sign-in of its own: its receptionists
 * run it, and the group's owner manages it.
 */
@Schema({ collection: 'clinics', ...baseSchemaOptions })
export class Clinic {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, index: true })
  group_id: number;

  /** Branch name (shown as "اسم الفرع"). */
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  /** The branch's address (shown as "العنوان"). */
  @Prop({ required: true, trim: true })
  branch: string;

  @Prop({ enum: CLINIC_STATUSES, default: ClinicStatus.Active, index: true })
  status: string;
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
