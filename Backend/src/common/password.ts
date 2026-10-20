import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

export const PASSWORD_MESSAGE = 'Password must be at least 8 characters, with letters and numbers';

/** A new password: at least 8 characters, with at least one letter (any script) and one digit. */
export const IsNewPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(8, { message: PASSWORD_MESSAGE }),
    Matches(/^(?=.*\p{L})(?=.*\d)/u, { message: PASSWORD_MESSAGE }),
  );
