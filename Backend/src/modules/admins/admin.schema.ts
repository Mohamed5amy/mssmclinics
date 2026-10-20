import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type AdminDocument = HydratedDocument<Admin>;

/**
 * The platform owner's account (the SaaS owner). Sees every group and its data,
 * but only manages the groups themselves - never edits inside one.
 */
@Schema({ collection: 'admins', ...baseSchemaOptions })
export class Admin {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  /** Raised whenever the password changes; tokens issued before it stop working. */
  @Prop({ default: 0 })
  session_version: number;

}

export const AdminSchema = SchemaFactory.createForClass(Admin);
