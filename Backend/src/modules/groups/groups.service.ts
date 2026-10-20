import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CountersService } from '../../counters/counters.service';
import { AccountsService } from '../../database/accounts.service';
import { hashPassword } from '../auth/auth.service';
import { Clinic } from '../clinics/clinic.schema';
import { Doctor } from '../doctors/doctor.schema';
import { Patient } from '../patients/patient.schema';
import { Provider } from '../providers/provider.schema';
import { Reservation } from '../reservations/reservation.schema';
import { DoctorSchedule, ScheduleException } from '../schedules/schedule.schema';
import { Service } from '../services/service.schema';
import { Specialty } from '../specialties/specialty.schema';
import { Staff, StaffRole } from '../staff/staff.schema';
import { CreateGroupDto, GroupStatusDto, UpdateGroupDto } from './dto/group.dto';
import { Group, GroupStatus } from './group.schema';

/** Counts a collection's records per group: `Map<group_id, count>`. */
async function countByGroup(model: Model<any>, match: Record<string, unknown> = {}) {
  const rows = await model.aggregate<{ _id: number; count: number }>([
    { $match: match },
    { $group: { _id: '$group_id', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

/** The groups themselves - the platform owner's to create, suspend and remove. */
@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly model: Model<Group>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(Service.name) private readonly services: Model<Service>,
    @InjectModel(Specialty.name) private readonly specialties: Model<Specialty>,
    @InjectModel(Provider.name) private readonly providers: Model<Provider>,
    @InjectModel(DoctorSchedule.name) private readonly schedules: Model<DoctorSchedule>,
    @InjectModel(ScheduleException.name) private readonly exceptions: Model<ScheduleException>,
    private readonly counters: CountersService,
    private readonly accounts: AccountsService,
  ) {}

  /** Every group with its owner and how big it is, for the platform's groups table. */
  async findAll() {
    const [groups, owners, clinics, doctors, receptionists, patients] = await Promise.all([
      this.model.find().sort({ id: 1 }).lean(),
      this.staff.find({ role: StaffRole.Owner }).sort({ id: 1 }).lean(),
      countByGroup(this.clinics),
      countByGroup(this.doctors),
      countByGroup(this.staff, { role: StaffRole.Receptionist }),
      countByGroup(this.patients),
    ]);

    return groups.map((group) => {
      const owner = owners.find((row) => row.group_id === group.id);
      return {
        ...group,
        ownerName: owner?.name ?? '',
        ownerEmail: owner?.email ?? '',
        clinics_count: clinics.get(group.id) ?? 0,
        doctors_count: doctors.get(group.id) ?? 0,
        receptionists_count: receptionists.get(group.id) ?? 0,
        patients_count: patients.get(group.id) ?? 0,
      };
    });
  }

  /** One group with its owners and branches - the top of the platform's drill-down. */
  async findOne(id: number) {
    const group = await this.model.findOne({ id }).lean();
    if (!group) {
      throw new NotFoundException('This group was not found');
    }

    const [owners, branches, doctors, receptionists, patients_count, reservations_count] = await Promise.all([
      this.staff.find({ group_id: id, role: StaffRole.Owner }).sort({ id: 1 }).lean(),
      this.clinics.find({ group_id: id }).sort({ id: 1 }).lean(),
      this.doctors.find({ group_id: id }).select('clinic_ids').lean(),
      this.staff.find({ group_id: id, role: StaffRole.Receptionist }).select('clinic_ids').lean(),
      this.patients.countDocuments({ group_id: id }),
      this.reservations.countDocuments({ group_id: id }),
    ]);

    const working = (rows: { clinic_ids: number[] }[], clinicId: number) =>
      rows.filter((row) => row.clinic_ids.includes(clinicId)).length;

    return {
      ...group,
      owners,
      branches: branches.map((branch) => ({
        ...branch,
        doctors_count: working(doctors, branch.id),
        receptionists_count: working(receptionists, branch.id),
      })),
      clinics_count: branches.length,
      doctors_count: doctors.length,
      receptionists_count: receptionists.length,
      patients_count,
      reservations_count,
    };
  }

  async create(dto: CreateGroupDto) {
    await this.accounts.assertEmailFree(dto.owner_email);

    const id = await this.counters.next('group');
    await this.model.create({ id, name: dto.name, phone: dto.phone ?? '' });
    await this.staff.create({
      id: await this.counters.next('staff'),
      group_id: id,
      role: StaffRole.Owner,
      clinic_ids: [],
      name: dto.owner_name,
      phone: dto.owner_phone ?? '',
      email: dto.owner_email,
      password: await hashPassword(dto.owner_password),
    });

    return this.findOne(id);
  }

  /** Renames the group and updates its (first) owner's details. */
  async update({ id, owner_name, owner_phone, owner_email, ...changes }: UpdateGroupDto) {
    await this.findOne(id);
    const owner = await this.staff.findOne({ group_id: id, role: StaffRole.Owner }).sort({ id: 1 }).lean();

    if (owner_email && owner) {
      await this.accounts.assertEmailFree(owner_email, { kind: 'staff', id: owner.id });
    }

    await this.model.updateOne({ id }, { $set: changes });
    if (owner) {
      const ownerChanges = Object.fromEntries(
        Object.entries({ name: owner_name, phone: owner_phone, email: owner_email }).filter(([, value]) => value !== undefined),
      );
      await this.staff.updateOne({ id: owner.id }, { $set: ownerChanges });
    }
    return this.findOne(id);
  }

  /** Suspending locks everyone in the group out at once; their data stays. */
  async setStatus({ id, status }: GroupStatusDto) {
    await this.findOne(id);
    await this.model.updateOne({ id }, { $set: { status } });
    return this.findOne(id);
  }

  /**
   * Deletes the group and everything it owns. Only a suspended group can be
   * deleted, so it is never one click away from a working clinic.
   */
  async remove(id: number) {
    const group = await this.findOne(id);
    if (group.status !== GroupStatus.Suspended) {
      throw new ConflictException('Suspend this group before deleting it');
    }

    const owned = { group_id: id };
    await Promise.all([
      this.reservations.deleteMany(owned),
      this.patients.deleteMany(owned),
      this.doctors.deleteMany(owned),
      this.staff.deleteMany(owned),
      this.clinics.deleteMany(owned),
      this.services.deleteMany(owned),
      this.specialties.deleteMany(owned),
      this.providers.deleteMany(owned),
      this.schedules.deleteMany(owned),
      this.exceptions.deleteMany(owned),
    ]);
    await this.model.deleteOne({ id });

    return { id };
  }
}
