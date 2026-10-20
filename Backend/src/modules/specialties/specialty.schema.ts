import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type SpecialtyDocument = HydratedDocument<Specialty>;

@Schema({ collection: 'specialties', ...baseSchemaOptions })
export class Specialty {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  title: string;

  /** Each group keeps its own list. */
  @Prop({ required: true, index: true })
  group_id: number;
}

export const SpecialtySchema = SchemaFactory.createForClass(Specialty);
