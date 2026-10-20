import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

/** What an attachment is: a lab result, an X-ray or scan, a report, or anything else. */
export const ATTACHMENT_KINDS = ['lab', 'radiology', 'report', 'other'];

/** Images and PDFs only, up to 10 MB each. */
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * A file in a patient's medical file - a lab result, an X-ray - uploaded by a
 * doctor or the owner, optionally during a visit. The bytes live in GridFS
 * (bucket `attachments`), so they travel with the database's backups; this
 * record is what lists and permissions read.
 */
@Schema({ collection: 'patient_attachments', ...baseSchemaOptions })
export class PatientAttachment {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, index: true })
  group_id: number;

  @Prop({ required: true, index: true })
  patient_id: number;

  /** The visit it was added during, if any. */
  @Prop({ type: Number, default: null })
  reservation_id: number | null;

  @Prop({ required: true, enum: ATTACHMENT_KINDS })
  kind: string;

  @Prop({ default: '', trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true })
  file_name: string;

  @Prop({ required: true })
  content_type: string;

  @Prop({ required: true })
  size: number;

  /** The file in the GridFS bucket. Never sent to the dashboard. */
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  file_id: Types.ObjectId;

  @Prop({ required: true })
  uploaded_by_role: string;

  @Prop({ required: true })
  uploaded_by_id: number;

  @Prop({ default: '' })
  uploaded_by_name: string;
}

export const PatientAttachmentSchema = SchemaFactory.createForClass(PatientAttachment);
