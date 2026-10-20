import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordByIdDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** The one sign-in form: the email says which kind of account it is. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** The admin sign-in page: the platform owner and group owners. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('admin-login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, ['admin', 'owner']);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('owner-login')
  ownerLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, ['owner']);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('doctor-login')
  doctorLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, ['doctor']);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('receptionist-login')
  receptionistLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, ['receptionist']);
  }

  /** The platform owner resetting a group owner's password. */
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Post('update-owner-password')
  updateOwnerPassword(@Body() dto: ChangePasswordByIdDto) {
    return this.auth.setOwnerPassword(dto.id, dto.password, dto.password_confirmation);
  }

  /** A group's owner resetting one of its doctors' passwords. */
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('update-doctor-password')
  updateDoctorPassword(@Body() dto: ChangePasswordByIdDto, @CurrentUser() user: AuthUser) {
    return this.auth.setDoctorPassword(user, dto.id, dto.password, dto.password_confirmation);
  }

  /** A group's owner resetting one of its receptionists' passwords. */
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('update-receptionist-password')
  updateReceptionistPassword(@Body() dto: ChangePasswordByIdDto, @CurrentUser() user: AuthUser) {
    return this.auth.setReceptionistPassword(user, dto.id, dto.password, dto.password_confirmation);
  }
}
