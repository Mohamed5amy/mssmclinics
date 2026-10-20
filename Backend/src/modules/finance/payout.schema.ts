import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

/**
 * Money the group's owner paid a doctor towards their share (صرف مستحقات),
 * which the doctor's statement takes off what they are owed. Paying more than
 * is owed is allowed - an advance shows as a negative balance.
 */
@Schema({ collection: 'doctor_payouts', ...baseSchemaOptions })
export class DoctorPayout {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, index: true })
  group_id: number;

  @Prop({ required: true, index: true })
  doctor_id: number;

  @Prop({ required: true, min: 0 })
  amount: number;

  /** The day it was paid. */
  @Prop({ required: true, index: true })
  paid_at: Date;

  @Prop({ default: '', trim: true, maxlength: 200 })
  note: string;

  @Prop({ required: true })
  recorded_by_id: number;

  @Prop({ default: '' })
  recorded_by_name: string;
}

export const DoctorPayoutSchema = SchemaFactory.createForClass(DoctorPayout);
