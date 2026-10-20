import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser, TokenPayload } from '../common/auth-user';
import { Admin } from '../modules/admins/admin.schema';
import { Clinic, ClinicStatus } from '../modules/clinics/clinic.schema';
import { Doctor } from '../modules/doctors/doctor.schema';
import { Group, GroupStatus } from '../modules/groups/group.schema';
import { Staff } from '../modules/staff/staff.schema';

/** Why a known account is turned away - the dashboard signs the user out on these. */
export const AccessCode = {
  GroupSuspended: 'GROUP_SUSPENDED',
  BranchClosed: 'BRANCH_CLOSED',
  PasswordChanged: 'PASSWORD_CHANGED',
  TooManyAttempts: 'TOO_MANY_ATTEMPTS',
} as const;

/** Where an account sits, read from the database. */
interface Placement {
  group_id: number | null;
  clinic_ids: number[] | null;
}

/** ...and which of its sessions are still valid. */
interface Loaded extends Placement {
  session_version: number;
}

/**
 * Turns a token into the account behind it, every request. The token only says
 * who signed in; where they belong now (group, branches, whether the group is
 * suspended) always comes from the database.
 */
@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<Admin>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
  ) {}

  async load({ id, email, role, sv }: TokenPayload): Promise<AuthUser> {
    const loaded = await this.placement(role, id);
    if (!loaded) {
      throw new UnauthorizedException('Your session has expired, please sign in again');
    }
    // A password change ends every session started before it
    if ((sv ?? 0) !== loaded.session_version) {
      throw new UnauthorizedException({
        message: 'Your password was changed - please sign in again',
        code: AccessCode.PasswordChanged,
      });
    }
    const { session_version: _version, ...placement } = loaded;
    await this.assertMayEnter(role, placement);
    return { id, email, role, ...placement };
  }

  private async placement(role: string, id: number): Promise<Loaded | null> {
    switch (role) {
      case 'admin': {
        const admin = await this.admins.findOne({ id }).select('session_version').lean();
        return admin ? { group_id: null, clinic_ids: null, session_version: admin.session_version ?? 0 } : null;
      }
      case 'owner':
      case 'receptionist': {
        const account = await this.staff.findOne({ id, role }).select('group_id clinic_ids session_version').lean();
        if (!account) return null;
        return {
          group_id: account.group_id,
          clinic_ids: role === 'owner' ? null : account.clinic_ids,
          session_version: account.session_version ?? 0,
        };
      }
      case 'doctor': {
        const doctor = await this.doctors.findOne({ id }).select('group_id clinic_ids session_version').lean();
        return doctor
          ? { group_id: doctor.group_id, clinic_ids: doctor.clinic_ids, session_version: doctor.session_version ?? 0 }
          : null;
      }
      default:
        return null;
    }
  }

  /**
   * A suspended group locks out everyone in it; a receptionist whose branch was
   * closed has nowhere to work. Used at sign-in and on every request.
   */
  async assertMayEnter(role: string, { group_id, clinic_ids }: Placement) {
    if (group_id === null) return;

    const group = await this.groups.findOne({ id: group_id }).select('status').lean();
    if (!group) {
      throw new UnauthorizedException('Your session has expired, please sign in again');
    }
    if (group.status === GroupStatus.Suspended) {
      throw new ForbiddenException({ message: 'This account is suspended', code: AccessCode.GroupSuspended });
    }

    if (role === 'receptionist') {
      const open = await this.clinics.exists({ id: { $in: clinic_ids ?? [] }, status: ClinicStatus.Active });
      if (!open) {
        throw new ForbiddenException({ message: 'This branch is closed', code: AccessCode.BranchClosed });
      }
    }
  }

  /** An account's name, for the activity log. */
  async nameOf(role: string, id: number): Promise<string> {
    const model = (role === 'admin' ? this.admins : role === 'doctor' ? this.doctors : this.staff) as unknown as Model<{
      id: number;
      name: string;
    }>;
    return (await model.findOne({ id }).select('name').lean())?.name ?? '';
  }

  /** Finds whoever owns an email, in any kind of account, with the password hash. */
  async findByEmail(email: string) {
    const address = email.toLowerCase();
    const [admin, staff, doctor] = await Promise.all([
      this.admins.findOne({ email: address }).select('+password'),
      this.staff.findOne({ email: address }).select('+password'),
      this.doctors.findOne({ email: address }).select('+password'),
    ]);

    if (admin) return { role: 'admin' as const, account: admin };
    if (staff) return { role: staff.role as 'owner' | 'receptionist', account: staff };
    if (doctor) return { role: 'doctor' as const, account: doctor };
    return null;
  }

  /**
   * Emails are unique across admins, staff and doctors, so the one sign-in form
   * always finds exactly one account. `except` is the account being edited.
   */
  async assertEmailFree(email: string, except?: { kind: 'admin' | 'staff' | 'doctor'; id: number }) {
    const address = email.toLowerCase();
    const [admin, staff, doctor] = await Promise.all([
      this.admins.findOne({ email: address }).select('id').lean(),
      this.staff.findOne({ email: address }).select('id').lean(),
      this.doctors.findOne({ email: address }).select('id').lean(),
    ]);

    const taken = [
      admin && !(except?.kind === 'admin' && except.id === admin.id),
      staff && !(except?.kind === 'staff' && except.id === staff.id),
      doctor && !(except?.kind === 'doctor' && except.id === doctor.id),
    ].some(Boolean);

    if (taken) {
      throw new ConflictException({
        message: 'This email is already registered',
        errors: { email: ['This email is already registered'] },
      });
    }
  }
}
