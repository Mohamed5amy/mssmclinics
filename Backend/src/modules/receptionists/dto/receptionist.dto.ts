import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReceptionistDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  /** The branch whose front desk this account runs. */
  @IsInt({ message: 'Please choose a branch' })
  clinic_id: number;
}

export class UpdateReceptionistDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsEmail({}, { message: 'Please enter a valid email address' }) email?: string;

  /** Moving a receptionist to another branch takes effect on their next request. */
  @IsOptional() @IsInt({ message: 'Please choose a branch' }) clinic_id?: number;
}
