import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const SEXES = ['ذكر', 'انثي'] as const;

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsIn(SEXES as unknown as string[], { message: 'Please choose a gender' })
  sex: string;

  @IsInt({ message: 'Age must be a whole number' })
  @Min(0, { message: 'Age cannot be negative' })
  @Max(130, { message: 'Please enter a valid age' })
  age: number;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(250)
  address: string;

  @IsInt({ message: 'Please choose how the patient reached the clinic' })
  provider_id: number;

  /**
   * The branch registering the patient, shown on the file. A receptionist's
   * own branch is always used; an owner may name one of the group's branches.
   */
  @IsOptional() @IsInt() clinic_id?: number;
}

export class UpdatePatientDto {
  @IsInt()
  id: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsIn(SEXES as unknown as string[], { message: 'Please choose a gender' }) sex?: string;
  @IsOptional() @IsInt() @Min(0) @Max(130) age?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250) address?: string;
  @IsOptional() @IsInt() provider_id?: number;
}
