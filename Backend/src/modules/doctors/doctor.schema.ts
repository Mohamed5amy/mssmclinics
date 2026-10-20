import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type DoctorDocument = HydratedDocument<Doctor>;

@Schema({ collection: 'doctors', ...baseSchemaOptions })
export class Doctor {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  /**
   * The doctor's cut of each reservation, as a percentage.
   * Spelled `prectange` to match the field name the dashboard sends.
   */
  @Prop({ required: true, min: 0, max: 100 })
  prectange: number;

  /** One of the group's specialties. */
  @Prop({ required: true, index: true })
  specialtie_id: number;

  /** Doctors belong to a group, added by its owner. */
  @Prop({ required: true, index: true })
  group_id: number;

  /** The group's branches the doctor works at; each has its own queue for them. */
  @Prop({ type: [Number], default: [], index: true })
  clinic_ids: number[];

  /** Unique across every kind of account. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
