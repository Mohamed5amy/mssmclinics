import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

/** Entries are kept for a year, then MongoDB deletes them. */
export const ACTIVITY_RETENTION_DAYS = 365;

/** What kind of entry: money (payments, prices, payouts), access (sign-ins, passwords), or anything else. */
export const ACTIVITY_CATEGORIES = ['general', 'money', 'access'];

/**
 * One thing someone did (سجل النشاط): every successful change through the API,
 * every sign-in and every failed attempt. Written by AuditInterceptor and
 * AuthService; read by the group's owner (its own group) and the platform.
 */
@Schema({ collection: 'activity_log', ...baseSchemaOptions })
export class Activity {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  /** The group it happened in; null for the platform's own sign-ins and unknown emails. */
  @Prop({ type: Number, default: null, index: true })
  group_id: number | null;

  /** The branch, when known (a receptionist's own, or the one the change names). */
  @Prop({ type: Number, default: null })
  clinic_id: number | null;

  /** Who: their role, id and name at the time (kept even if the account is deleted later). */
  @Prop({ default: '' })
  actor_role: string;

  @Prop({ type: Number, default: null })
  actor_id: number | null;

  @Prop({ default: '' })
  actor_name: string;

  /** `create`, `update`, `delete`, `action`, `login` or `login_failed`. */
  @Prop({ required: true, index: true })
  action: string;

  @Prop({ enum: ACTIVITY_CATEGORIES, default: 'general', index: true })
  category: string;

  /** The API route, and what it means in Arabic for the activity page. */
  @Prop({ default: '' })
  route: string;

  @Prop({ default: '' })
  label: string;

  /** What it was done to: `reservation`, `patient`, ... and its id. */
  @Prop({ default: '' })
  entity: string;

  @Prop({ type: Number, default: null })
  entity_id: number | null;

  /** What was sent (passwords removed), and the record as it was before, for edits and deletions. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  before: Record<string, unknown> | null;

  @Prop({ default: '' })
  ip: string;

  @Prop({ type: Date, default: Date.now, index: true, expires: ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 })
  at: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
ActivitySchema.index({ group_id: 1, id: -1 });
