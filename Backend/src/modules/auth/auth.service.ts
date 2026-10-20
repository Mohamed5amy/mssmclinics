import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser, Role, TokenPayload } from '../../common/auth-user';
import { AccountsService } from '../../database/accounts.service';
import { ScopeService } from '../../database/scope.service';
import { Admin } from '../admins/admin.schema';
import { Clinic } from '../clinics/clinic.schema';
import { Doctor } from '../doctors/doctor.schema';
import { Group } from '../groups/group.schema';
import { Staff, StaffRole } from '../staff/staff.schema';

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<Admin>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    private readonly jwt: JwtService,
    private readonly accounts: AccountsService,
    private readonly scope: ScopeService,
  ) {}

  /**
   * One sign-in form for every kind of account: emails are unique across them,
   * so the email says who it is. `only` keeps the older per-role endpoints
   * (`doctor-login`, ...) limited to their role.
   *
   * The dashboard reads `api_token`, `email`, `role`, `name` and the display
   * names (`groupName`, `clinicName`) off this object.
   */
  async login(email: string, password: string, only?: Role[]) {
    const found = await this.accounts.findByEmail(email);

    if (!found || (only && !only.includes(found.role)) || !(await bcrypt.compare(password, found.account.password))) {
      throw new UnauthorizedException('These credentials do not match our records');
    }

    const { role, account } = found;
    const groupId: number | null = role === 'admin' ? null : (account as Staff | Doctor).group_id;
    const clinicIds: number[] | null =
      role === 'admin' || role === 'owner' ? null : (account as Staff | Doctor).clinic_ids;

    await this.accounts.assertMayEnter(role, { group_id: groupId, clinic_ids: clinicIds });

    const [group, branches] = await Promise.all([
      groupId ? this.groups.findOne({ id: groupId }).select('name').lean() : null,
      clinicIds ? this.clinics.find({ id: { $in: clinicIds } }).select('id name').lean() : [],
    ]);

    const payload: TokenPayload = { id: account.id, email: account.email, role };

    return {
      ...account.toJSON(),
      role,
      // Kept for the older admin screens, which compare it with `== 1`.
      is_super: role === 'admin' ? 1 : 0,
      groupName: group?.name ?? '',
      clinicName: branches.map((branch) => branch.name).join('، '),
      api_token: await this.jwt.signAsync(payload),
    };
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

  private async setPassword<T>(model: Model<T>, filter: FilterQuery<T>, password: string, confirmation: string) {
    if (password !== confirmation) {
      throw new BadRequestException('The password confirmation does not match');
    }

    const result = await model.findOneAndUpdate(
      filter,
      { $set: { password: await hashPassword(password) } } as never,
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('Account not found');
    }
    return { id: (result as unknown as { id: number }).id, email: (result as unknown as { email: string }).email };
  }
}
