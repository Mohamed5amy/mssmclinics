import { IsInt, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeOwnPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  password_confirmation: string;
}

/** Used when an admin resets someone else's password. */
export class ChangePasswordByIdDto extends ChangeOwnPasswordDto {
  @IsInt()
  id: number;
}
