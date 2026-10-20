import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type ProviderDocument = HydratedDocument<Provider>;

/** How a patient reached the clinic (Facebook, a friend, ...) - shown as "عن طريق". */
@Schema({ collection: 'providers', ...baseSchemaOptions })
export class Provider {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  title: string;

  /** Each group keeps its own list. */
  @Prop({ required: true, index: true })
  group_id: number;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
