import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser, Role, TokenPayload } from '../../common/auth-user';
import { AccessCode, AccountsService } from '../../database/accounts.service';
import { ScopeService } from '../../database/scope.service';
import { Admin } from '../admins/admin.schema';
import { AuditService } from '../audit/audit.service';
import { Clinic } from '../clinics/clinic.schema';
import { Doctor } from '../doctors/doctor.schema';
import { Group } from '../groups/group.schema';
import { Staff, StaffRole } from '../staff/staff.schema';
import { ATTEMPT_WINDOW_MINUTES, LoginAttempt, MAX_FAILED_ATTEMPTS } from './login-attempt.schema';

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

const fieldError = (field: string, message: string) =>
  new BadRequestException({ message, errors: { [field]: [message] } });

/** The fields every kind of account shares, for the code that treats them alike. */
type AnyAccount = { id: number; name: string; email: string; password: string; session_version: number };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<Admin>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    @InjectModel(LoginAttempt.name) private readonly attempts: Model<LoginAttempt>,
    private readonly jwt: JwtService,
    private readonly accounts: AccountsService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  private modelFor(role: string) {
    return (role === 'admin' ? this.admins : role === 'doctor' ? this.doctors : this.staff) as unknown as Model<AnyAccount>;
  }

  /**
   * After MAX_FAILED_ATTEMPTS wrong passwords for an email within the window,
   * it can't sign in until the oldest of them is older than the window - even
   * with the right password. 429 with `code: TOO_MANY_ATTEMPTS` and the minutes left.
   */
  private async assertNotLocked(email: string) {
    const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000);
    const recent = await this.attempts.find({ email, at: { $gte: since } }).select('at').sort({ at: 1 }).lean();
    if (recent.length < MAX_FAILED_ATTEMPTS) return;

    const freeAt = recent[recent.length - MAX_FAILED_ATTEMPTS].at.getTime() + ATTEMPT_WINDOW_MINUTES * 60_000;
    throw new HttpException(
      {
        message: 'Too many failed sign-in attempts - try again later',
        code: AccessCode.TooManyAttempts,
        details: { minutes: Math.max(1, Math.ceil((freeAt - Date.now()) / 60_000)) },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * One sign-in form for every kind of account: emails are unique across them,
   * so the email says who it is. `only` keeps the older per-role endpoints
   * (`doctor-login`, ...) limited to their role. Wrong passwords count towards
   * locking the email; every sign-in and failed attempt goes to the activity log.
   *
   * The dashboard reads `api_token`, `email`, `role`, `name` and the display
   * names (`groupName`, `clinicName`) off this object.
   */
  async login(email: string, password: string, only?: Role[], ip = '') {
    const address = email.toLowerCase().trim();
    await this.assertNotLocked(address);

    const found = await this.accounts.findByEmail(address);
    if (!found || !(await bcrypt.compare(password, found.account.password))) {
      await this.attempts.create({ email: address, ip });
      const known = found?.account as (Staff | Doctor | Admin) | undefined;
      await this.audit.record({
        group_id: known && 'group_id' in known ? known.group_id : null,
        clinic_id: null,
        actor_role: found?.role ?? '',
        actor_id: known?.id ?? null,
        actor_name: known?.name ?? '',
        action: 'login_failed',
        category: 'access',
        route: 'login',
        label: 'محاولة دخول فاشلة',
        entity: 'session',
        entity_id: null,
        details: { email: address },
        before: null,
        ip,
      });
      throw new UnauthorizedException('These credentials do not match our records');
    }
    if (only && !only.includes(found.role)) {
      throw new UnauthorizedException('These credentials do not match our records');
    }

    const { role, account } = found;
    const groupId: number | null = role === 'admin' ? null : (account as Staff | Doctor).group_id;
    const clinicIds: number[] | null =
      role === 'admin' || role === 'owner' ? null : (account as Staff | Doctor).clinic_ids;

    await this.accounts.assertMayEnter(role, { group_id: groupId, clinic_ids: clinicIds });
    await this.attempts.deleteMany({ email: address });

    const [group, branches] = await Promise.all([
      groupId ? this.groups.findOne({ id: groupId }).select('name').lean() : null,
      clinicIds ? this.clinics.find({ id: { $in: clinicIds } }).select('id name').lean() : [],
    ]);

    const payload: TokenPayload = { id: account.id, email: account.email, role, sv: account.session_version ?? 0 };
    await this.audit.record({
      group_id: groupId,
      clinic_id: role === 'receptionist' ? clinicIds?.[0] ?? null : null,
      actor_role: role,
      actor_id: account.id,
      actor_name: account.name,
      action: 'login',
      category: 'access',
      route: 'login',
      label: 'دخل السيستم',
      entity: 'session',
      entity_id: null,
      details: {},
      before: null,
      ip,
    });

    const { session_version: _version, ...visible } = account.toJSON() as Record<string, unknown>;
    return {
      ...visible,
      role,
      // Kept for the older admin screens, which compare it with `== 1`.
      is_super: role === 'admin' ? 1 : 0,
      groupName: group?.name ?? '',
      clinicName: branches.map((branch) => branch.name).join('، '),
      api_token: await this.jwt.signAsync(payload),
    };
  }

  /**
   * Anyone signed in changes their own password, proving it with the current
   * one. Every other session ends; this one gets a fresh token to carry on with.
   */
  async changeOwnPassword(user: AuthUser, current: string, password: string, confirmation: string) {
    if (password !== confirmation) {
      throw fieldError('password_confirmation', 'The password confirmation does not match');
    }
    const model = this.modelFor(user.role);
    const account = await model.findOne({ id: user.id }).select('+password').lean();
    if (!account || !(await bcrypt.compare(current, account.password))) {
      throw fieldError('current_password', 'The current password is not correct');
    }
    if (await bcrypt.compare(password, account.password)) {
      throw fieldError('password', 'The new password is the same as the current one');
    }

    const updated = await model
      .findOneAndUpdate({ id: user.id }, { $set: { password: await hashPassword(password) }, $inc: { session_version: 1 } }, { new: true })
      .lean();
    const payload: TokenPayload = { id: user.id, email: user.email, role: user.role, sv: updated?.session_version ?? 0 };
    return { api_token: await this.jwt.signAsync(payload) };
  }

  /** The platform owner resetting a group owner's password. */
  async setOwnerPassword(id: number, password: string, confirmation: string) {
    return this.setPassword(this.staff, { id, role: StaffRole.Owner }, password, confirmation);
  }

  /** A group's owner resetting one of its doctors' passwords. */
  async setDoctorPassword(user: AuthUser, id: number, password: string, confirmation: string) {
    return this.setPassword(this.doctors, { id, ...this.scope.groupFilter(user) }, password, confirmation);
  }

  /** A group's owner resetting one of its receptionists' passwords. */
  async setReceptionistPassword(user: AuthUser, id: number, password: string, confirmation: string) {
    return this.setPassword(
      this.staff,
      { id, role: StaffRole.Receptionist, ...this.scope.groupFilter(user) },
      password,
      confirmation,
    );
  }

  /** Someone else resets a password (a forgotten one): the account is signed out everywhere. */
  private async setPassword<T>(model: Model<T>, filter: FilterQuery<T>, password: string, confirmation: string) {
    if (password !== confirmation) {
      throw new BadRequestException('The password confirmation does not match');
    }

    const result = await model.findOneAndUpdate(
      filter,
      { $set: { password: await hashPassword(password) }, $inc: { session_version: 1 } } as never,
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('Account not found');
    }
    return { id: (result as unknown as { id: number }).id, email: (result as unknown as { email: string }).email };
  }
}
