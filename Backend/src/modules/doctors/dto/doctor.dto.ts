import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsNewPassword } from '../../../common/password';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsInt({ message: 'Percentage must be a whole number' })
  @Min(0, { message: 'Percentage cannot be negative' })
  @Max(100, { message: 'Percentage cannot be over 100' })
  prectange: number;

  @IsInt({ message: 'Please choose a specialty' })
  specialtie_id: number;

  /** The group's branches the doctor works at. */
  @IsArray({ message: "Please choose the doctor's branches" })
  @ArrayMinSize(1, { message: "Please choose the doctor's branches" })
  @Type(() => Number)
  @IsInt({ each: true, message: "Please choose the doctor's branches" })
  clinic_ids: number[];

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsNewPassword()
  password: string;
}

export class UpdateDoctorDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) prectange?: number;
  @IsOptional() @IsInt() specialtie_id?: number;

  @IsOptional()
  @IsArray({ message: "Please choose the doctor's branches" })
  @ArrayMinSize(1, { message: "Please choose the doctor's branches" })
  @Type(() => Number)
  @IsInt({ each: true, message: "Please choose the doctor's branches" })
  clinic_ids?: number[];

  @IsOptional() @IsEmail({}, { message: 'Please enter a valid email address' }) email?: string;
}
