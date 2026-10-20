import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type StaffDocument = HydratedDocument<Staff>;

/**
 * A group's people who aren't doctors:
 *   owner        - runs the whole group (`clinic_ids` is empty: every branch)
 *   receptionist - the front desk of exactly one branch
 * A branch manager can be added later as another role with a set of branches.
 */
export const StaffRole = { Owner: 'owner', Receptionist: 'receptionist' } as const;
export const STAFF_ROLES: string[] = Object.values(StaffRole);

@Schema({ collection: 'staff', ...baseSchemaOptions })
export class Staff {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, index: true })
  group_id: number;

  @Prop({ required: true, enum: STAFF_ROLES, index: true })
  role: string;

  /** The branches this account works at. Empty for an owner. */
  @Prop({ type: [Number], default: [], index: true })
  clinic_ids: number[];

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  phone: string;

  /** Unique across every kind of account, so one sign-in form finds anyone. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
