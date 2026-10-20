import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { IsNewPassword } from '../../../common/password';

export class ChangeOwnPasswordDto {
  @IsNewPassword()
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  password_confirmation: string;
}

/** Signed in, changing your own password: the current one proves it's you. */
export class ChangeMyPasswordDto extends ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Please enter your current password' })
  current_password: string;
}

/** Used when an admin resets someone else's password. */
export class ChangePasswordByIdDto extends ChangeOwnPasswordDto {
  @IsInt()
  id: number;
}
