import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNewPassword } from '../../../common/password';
import { GROUP_STATUSES } from '../group.schema';

/** A new group and the owner account that will run it, created together. */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(40) phone?: string;

  @IsString()
  @IsNotEmpty({ message: "The owner's name is required" })
  @MaxLength(120)
  owner_name: string;

  @IsOptional() @IsString() @MaxLength(40) owner_phone?: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  owner_email: string;

  @IsNewPassword()
  owner_password: string;
}

export class UpdateGroupDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) owner_name?: string;
  @IsOptional() @IsString() @MaxLength(40) owner_phone?: string;
  @IsOptional() @IsEmail({}, { message: 'Please enter a valid email address' }) owner_email?: string;
}

export class GroupStatusDto {
  @IsInt()
  id: number;

  @IsIn(GROUP_STATUSES, { message: 'Please choose a valid status' })
  status: string;
}
