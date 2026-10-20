import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { CountersService } from '../../counters/counters.service';
import { AccountsService } from '../../database/accounts.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { hashPassword } from '../auth/auth.service';
import { Clinic, ClinicStatus } from '../clinics/clinic.schema';
import { Staff, StaffRole } from '../staff/staff.schema';
import { CreateReceptionistDto, UpdateReceptionistDto } from './dto/receptionist.dto';

/** Front-desk accounts: `staff` with the receptionist role, each at exactly one branch. */
@Injectable()
export class ReceptionistsService {
  constructor(
    @InjectModel(Staff.name) private readonly model: Model<Staff>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
    private readonly accounts: AccountsService,
  ) {}

  /** Adds the branch (`clinic_id`, `clinicName`, `clinicBranch`) and the group's name. */
  private async decorate(rows: Staff[]) {
    const [clinics, groups] = await Promise.all([this.lookups.clinicsById(), this.lookups.groupsById()]);
    return rows.map((row) => {
      const clinic = clinics.get(row.clinic_ids[0]);
      return {
        ...row,
        clinic_id: row.clinic_ids[0] ?? null,
        clinicName: clinic?.name ?? '',
        clinicBranch: clinic?.branch ?? '',
        groupName: groups.get(row.group_id)?.name ?? '',
      };
    });
  }

  private filterFor(user: AuthUser, query: ScopeQueryDto = {}): FilterQuery<Staff> {
    return {
      role: StaffRole.Receptionist,
      ...this.scope.groupFilter(user, query.group_id),
      ...(query.clinic_id ? { clinic_ids: query.clinic_id } : {}),
    };
  }

  async findAll(user: AuthUser, query: ScopeQueryDto) {
    return this.decorate(await this.model.find(this.filterFor(user, query)).sort({ id: 1 }).lean());
  }

  private async findScoped(id: number, user: AuthUser) {
    const row = await this.model.findOne({ id, ...this.filterFor(user) }).lean();
    if (!row) {
      throw new NotFoundException('This receptionist was not found');
    }
    return row;
  }

  async findOne(id: number, user: AuthUser) {
    const [decorated] = await this.decorate([await this.findScoped(id, user)]);
    return decorated;
  }

  /** The branch must be an open branch of the owner's own group. */
  private async assertBranch(clinicId: number, groupId: number) {
    if (!(await this.clinics.exists({ id: clinicId, group_id: groupId, status: ClinicStatus.Active }))) {
      throw new BadRequestException({ message: 'Please choose a branch', errors: { clinic_id: ['Please choose a branch'] } });
    }
  }

  async create({ clinic_id, ...dto }: CreateReceptionistDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    await this.accounts.assertEmailFree(dto.email);
    await this.assertBranch(clinic_id, groupId);

    const created = await this.model.create({
      ...dto,
      role: StaffRole.Receptionist,
      group_id: groupId,
      clinic_ids: [clinic_id],
      id: await this.counters.next('staff'),
      password: await hashPassword(dto.password),
    });
    return this.findOne(created.id, user);
  }

  async update({ id, clinic_id, ...changes }: UpdateReceptionistDto, user: AuthUser) {
    const existing = await this.findScoped(id, user);

    if (changes.email) {
      await this.accounts.assertEmailFree(changes.email, { kind: 'staff', id });
    }
    const patch: Record<string, unknown> = { ...changes };
    if (clinic_id) {
      await this.assertBranch(clinic_id, existing.group_id);
      patch.clinic_ids = [clinic_id];
    }

    await this.model.updateOne({ id }, { $set: patch });
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthUser) {
    await this.findScoped(id, user);
    await this.model.deleteOne({ id });
    return { id };
  }
}
