import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type ServiceDocument = HydratedDocument<Service>;

/** A billable service and its price - one list per group, used by every branch. */
@Schema({ collection: 'services', ...baseSchemaOptions })
export class Service {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, index: true })
  group_id: number;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
