import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ATTACHMENT_KINDS } from '../attachment.schema';

/** A patient's medical background, as the doctor last left it. Each list replaces the old one. */
export class MedicalBackgroundDto {
  @IsInt({ message: 'Please choose a patient' })
  patient_id: number;

  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(80, { each: true })
  chronic: string[];

  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(80, { each: true })
  allergies: string[];

  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(120, { each: true })
  medications: string[];

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

/** The form fields sent with an uploaded file (multipart, so numbers arrive as text). */
export class UploadAttachmentDto {
  @Type(() => Number) @IsInt({ message: 'Please choose a patient' })
  patient_id: number;

  @IsOptional() @Type(() => Number) @IsInt()
  reservation_id?: number;

  @IsIn(ATTACHMENT_KINDS, { message: 'Please choose what the file is' })
  kind: string;

  @IsOptional() @IsString() @MaxLength(120)
  title?: string;
}
