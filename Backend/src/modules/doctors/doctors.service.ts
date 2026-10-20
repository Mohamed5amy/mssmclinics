import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { startOfDay } from '../../common/dates';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { CountersService } from '../../counters/counters.service';
import { AccountsService } from '../../database/accounts.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { hashPassword } from '../auth/auth.service';
import { Clinic, ClinicStatus } from '../clinics/clinic.schema';
import { Reservation, ReservationStatus } from '../reservations/reservation.schema';
import { DoctorSchedule, ScheduleException } from '../schedules/schedule.schema';
import { ReservationsService } from '../reservations/reservations.service';
import { Specialty } from '../specialties/specialty.schema';
import { Doctor } from './doctor.schema';
import { CreateDoctorDto, UpdateDoctorDto } from './dto/doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(Doctor.name) private readonly model: Model<Doctor>,
    @InjectModel(Specialty.name) private readonly specialties: Model<Specialty>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(DoctorSchedule.name) private readonly schedules: Model<DoctorSchedule>,
    @InjectModel(ScheduleException.name) private readonly exceptions: Model<ScheduleException>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
    private readonly accounts: AccountsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  /**
   * Adds `specializeName` (the doctors table's last column), the branch names
   * and the group's name. A receptionist books with these doctors but doesn't
   * see their percentage.
   */
  private async decorate<T extends { specialtie_id: number; prectange: number; clinic_ids: number[]; group_id: number }>(
    rows: T[],
    user: AuthUser,
  ) {
    const [specialties, clinics, groups] = await Promise.all([
      this.lookups.specialtiesById(),
      this.lookups.clinicsById(),
      this.lookups.groupsById(),
    ]);
    return rows.map(({ prectange, ...row }) => ({
      ...row,
      ...(user.role === 'receptionist' ? {} : { prectange }),
      specializeName: specialties.get(row.specialtie_id)?.title ?? '',
      clinicNames: row.clinic_ids.map((id) => clinics.get(id)?.name).filter(Boolean).join('، '),
      groupName: groups.get(row.group_id)?.name ?? '',
    }));
  }

  /**
   * The group's doctors. A receptionist sees those working at its branch, a
   * doctor only themselves (not colleagues' percentages); `clinic_id` narrows
   * to one branch (the booking form).
   */
  private filterFor(user: AuthUser, query: ScopeQueryDto = {}): FilterQuery<Doctor> {
    const filter: FilterQuery<Doctor> = this.scope.groupFilter(user, query.group_id);
    if (user.role === 'doctor') filter.id = user.id;

    if (query.clinic_id) {
      filter.clinic_ids = !user.clinic_ids || user.clinic_ids.includes(query.clinic_id) ? query.clinic_id : -1;
    } else if (user.clinic_ids) {
      filter.clinic_ids = { $in: user.clinic_ids };
    }
    return filter;
  }

  async findAll(user: AuthUser, query: ScopeQueryDto) {
    return this.decorate(await this.model.find(this.filterFor(user, query)).sort({ id: 1 }).lean(), user);
  }

  private async findScoped(id: number, user: AuthUser) {
    const doctor = await this.model.findOne({ id, ...this.filterFor(user) }).lean();
    if (!doctor) {
      throw new NotFoundException('This doctor was not found');
    }
    return doctor;
  }

  async findOne(id: number, user: AuthUser) {
    const [decorated] = await this.decorate([await this.findScoped(id, user)], user);
    return { ...decorated, reservations: await this.reservationsService.findForDoctor(id, user) };
  }

  /** A doctor works only at open branches of their own group. */
  private async assertBranches(clinicIds: number[], groupId: number) {
    const ids = [...new Set(clinicIds)];
    const open = await this.clinics.countDocuments({ id: { $in: ids }, group_id: groupId, status: ClinicStatus.Active });
    if (open !== ids.length) {
      throw new BadRequestException({
        message: "Please choose the doctor's branches",
        errors: { clinic_ids: ["Please choose the doctor's branches"] },
      });
    }
    return ids;
  }

  /** Doctors are filed under the group's own specialties. */
  private async assertSpecialty(specialtyId: number, groupId: number) {
    if (!(await this.specialties.exists({ id: specialtyId, group_id: groupId }))) {
      throw new BadRequestException('Please choose a specialty');
    }
  }

  /** Upcoming bookings would be stranded if the doctor left these branches. */
  private async assertNoUpcoming(doctorId: number, clinicIds?: number[]) {
    const upcoming = await this.reservations.countDocuments({
      doctor_id: doctorId,
      status: ReservationStatus.Pending,
      date: { $gte: startOfDay(new Date()) },
      ...(clinicIds ? { clinic_id: { $in: clinicIds } } : {}),
    });
    if (upcoming) {
      throw new ConflictException(`This doctor has ${upcoming} upcoming booking(s) there - move or cancel them first`);
    }
  }

  /** Only a group's owner adds doctors, always to its own group. */
  async create(dto: CreateDoctorDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    await this.accounts.assertEmailFree(dto.email);
    await this.assertSpecialty(dto.specialtie_id, groupId);
    const clinicIds = await this.assertBranches(dto.clinic_ids, groupId);

    const created = await this.model.create({
      ...dto,
      clinic_ids: clinicIds,
      group_id: groupId,
      id: await this.counters.next('doctor'),
      password: await hashPassword(dto.password),
    });
    return created.toJSON();
  }

  async update({ id, ...changes }: UpdateDoctorDto, user: AuthUser) {
    const doctor = await this.findScoped(id, user);

    if (changes.email) {
      await this.accounts.assertEmailFree(changes.email, { kind: 'doctor', id });
    }
    if (changes.specialtie_id) {
      await this.assertSpecialty(changes.specialtie_id, doctor.group_id);
    }
    if (changes.clinic_ids) {
      changes.clinic_ids = await this.assertBranches(changes.clinic_ids, doctor.group_id);
      const leaving = doctor.clinic_ids.filter((clinicId) => !changes.clinic_ids.includes(clinicId));
      if (leaving.length) {
        await this.assertNoUpcoming(id, leaving);
        await this.forgetHours({ doctor_id: id, clinic_id: { $in: leaving } });
      }
    }

    const updated = await this.model.findOneAndUpdate({ id }, { $set: changes }, { new: true });
    return updated.toJSON();
  }

  /** Past visits stay - each kept its own copy of the doctor's percentage. Upcoming ones must go first. */
  async remove(id: number, user: AuthUser) {
    await this.findScoped(id, user);
    await this.assertNoUpcoming(id);
    await this.model.deleteOne({ id });
    await this.forgetHours({ doctor_id: id });
    return { id };
  }

  /** A doctor's hours at branches they no longer work at. */
  private async forgetHours(filter: { doctor_id: number; clinic_id?: { $in: number[] } }) {
    await Promise.all([this.schedules.deleteMany(filter), this.exceptions.deleteMany(filter)]);
  }
}
