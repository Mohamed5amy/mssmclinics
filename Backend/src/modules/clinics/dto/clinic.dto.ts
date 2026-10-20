import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FOLLOWUP_MODES } from '../../groups/group.schema';
import { CLINIC_STATUSES } from '../clinic.schema';

/** A branch: data only, no sign-in of its own. */
export class CreateClinicDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(250)
  branch: string;
}

export class UpdateClinicDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250) branch?: string;

  /** `closed` keeps the branch's history but stops new bookings and its receptionists' sign-in. */
  @IsOptional() @IsIn(CLINIC_STATUSES, { message: 'Please choose a valid status' }) status?: string;
}

export class FollowupRuleDto {
  @IsBoolean()
  enabled: boolean;

  @IsInt({ message: 'Days must be a whole number' })
  @Min(1, { message: 'Days must be at least 1' })
  @Max(365, { message: 'Days cannot be over 365' })
  days: number;

  @IsIn(FOLLOWUP_MODES, { message: 'Please choose how follow-ups are priced' })
  mode: string;

  @IsNumber({}, { message: 'Value must be a number' })
  @Min(0, { message: 'Value cannot be negative' })
  value: number;

  @IsArray()
  @IsInt({ each: true, message: 'Please choose valid services' })
  service_ids: number[];
}

/** The group's settings, edited by its owner from the settings page. */
export class ClinicSettingsDto {
  @ValidateNested()
  @Type(() => FollowupRuleDto)
  followup: FollowupRuleDto;
}
