import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type PatientDocument = HydratedDocument<Patient>;

@Schema({ collection: 'patients', ...baseSchemaOptions })
export class Patient {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  /** "ذكر" or "انثي" - the two options the form offers. */
  @Prop({ required: true, enum: ['ذكر', 'انثي'] })
  sex: string;

  @Prop({ required: true, min: 0, max: 130 })
  age: number;

  @Prop({ required: true, trim: true })
  address: string;

  /** How the patient reached the group (one of its referral sources). */
  @Prop({ required: true, index: true })
  provider_id: number;

  /** One file per patient for the whole group, seen at every branch. */
  @Prop({ required: true, index: true })
  group_id: number;

  /**
   * The branch that registered the patient - shown, never used for scoping
   * (it is deliberately not called `clinic_id`).
   */
  @Prop({ type: Number, default: null })
  registered_clinic_id: number | null;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
