import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { CountersService } from '../../counters/counters.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { Doctor } from '../doctors/doctor.schema';
import { FollowupRule, Group } from '../groups/group.schema';
import { Reservation } from '../reservations/reservation.schema';
import { DoctorSchedule, ScheduleException } from '../schedules/schedule.schema';
import { Service } from '../services/service.schema';
import { Staff, StaffRole } from '../staff/staff.schema';
import { Clinic } from './clinic.schema';
import { ClinicSettingsDto, CreateClinicDto, UpdateClinicDto } from './dto/clinic.dto';

/** What a group that never saved its settings gets: the follow-up rule switched off. */
const DEFAULT_FOLLOWUP: FollowupRule = { enabled: false, days: 14, mode: 'free', value: 0, service_ids: [] };

/** A group's branches, managed by its owner, and the group-wide settings. */
@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name) private readonly model: Model<Clinic>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(Service.name) private readonly services: Model<Service>,
    @InjectModel(DoctorSchedule.name) private readonly schedules: Model<DoctorSchedule>,
    @InjectModel(ScheduleException.name) private readonly exceptions: Model<ScheduleException>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
  ) {}

  /** Adds the group's name and how many doctors and receptionists work at each branch. */
  private async decorate(rows: Clinic[]) {
    const [groups, doctors, receptionists] = await Promise.all([
      this.lookups.groupsById(),
      this.doctors.find({ clinic_ids: { $in: rows.map((row) => row.id) } }).select('clinic_ids').lean(),
      this.staff
        .find({ role: StaffRole.Receptionist, clinic_ids: { $in: rows.map((row) => row.id) } })
        .select('clinic_ids')
        .lean(),
    ]);
    const working = (people: { clinic_ids: number[] }[], id: number) =>
      people.filter((person) => person.clinic_ids.includes(id)).length;

    return rows.map((row) => ({
      ...row,
      groupName: groups.get(row.group_id)?.name ?? '',
      doctors_count: working(doctors, row.id),
      receptionists_count: working(receptionists, row.id),
    }));
  }

  /** `group_id` is the platform owner's group filter. */
  async findAll(user: AuthUser, query: ScopeQueryDto) {
    const filter = this.scope.branchFilter(user, query.group_id);
    return this.decorate(await this.model.find(filter).sort({ id: 1 }).lean());
  }

  private async findScoped(id: number, user: AuthUser) {
    const clinic = await this.model.findOne({ id, ...this.scope.branchFilter(user) }).lean();
    if (!clinic) {
      throw new NotFoundException('This branch was not found');
    }
    return clinic;
  }

  async findOne(id: number, user: AuthUser) {
    const [decorated] = await this.decorate([await this.findScoped(id, user)]);
    return decorated;
  }

  /** The owner adds branches to its own group. */
  async create(dto: CreateClinicDto, user: AuthUser) {
    const created = await this.model.create({
      ...dto,
      group_id: this.scope.ownGroupId(user),
      id: await this.counters.next('clinic'),
    });
    return this.findOne(created.id, user);
  }

  async update({ id, ...changes }: UpdateClinicDto, user: AuthUser) {
    await this.findScoped(id, user);
    await this.model.updateOne({ id }, { $set: changes });
    return this.findOne(id, user);
  }

  /**
   * A branch with visits can't be deleted - closing it keeps the history. An
   * empty one goes, along with the receptionists who worked only there; its
   * doctors simply stop working at it.
   */
  async remove(id: number, user: AuthUser) {
    await this.findScoped(id, user);

    if (await this.reservations.exists({ clinic_id: id })) {
      throw new ConflictException('This branch has visits - close it instead of deleting it');
    }

    await this.staff.deleteMany({ role: StaffRole.Receptionist, clinic_ids: [id] });
    await this.staff.updateMany({ clinic_ids: id }, { $pull: { clinic_ids: id } });
    await this.doctors.updateMany({ clinic_ids: id }, { $pull: { clinic_ids: id } });
    await Promise.all([this.schedules.deleteMany({ clinic_id: id }), this.exceptions.deleteMany({ clinic_id: id })]);
    await this.model.deleteOne({ id });

    return { id };
  }

  /** The group's settings: its owner's, or any group's for the platform owner (`?group_id=`). */
  async settings(user: AuthUser, requestedGroup?: number) {
    const groupId = user.group_id ?? requestedGroup;
    if (!groupId) {
      throw new BadRequestException('Please choose a group');
    }

    const group = await this.groups.findOne({ id: groupId }).select('followup').lean();
    if (!group) {
      throw new NotFoundException('This group was not found');
    }
    return { followup: { ...DEFAULT_FOLLOWUP, ...group.followup } };
  }

  async updateSettings({ followup }: ClinicSettingsDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);

    if (followup.mode === 'percent' && followup.value > 100) {
      throw new BadRequestException({
        message: 'Percentage cannot be over 100',
        errors: { 'followup.value': ['Percentage cannot be over 100'] },
      });
    }

    const serviceIds = [...new Set(followup.service_ids)];
    const owned = await this.services.countDocuments({ id: { $in: serviceIds }, group_id: groupId });
    if (owned !== serviceIds.length) {
      throw new BadRequestException({
        message: 'Please choose valid services',
        errors: { 'followup.service_ids': ['Please choose valid services'] },
      });
    }

    await this.groups.updateOne({ id: groupId }, { $set: { followup: { ...followup, service_ids: serviceIds } } });
    return this.settings(user);
  }
}
