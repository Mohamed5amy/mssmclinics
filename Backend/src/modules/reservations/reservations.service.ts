import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import {
  dateRangeFilter,
  endOfDay,
  isDateOnly,
  isSameDay,
  parseDate,
  startOfDay,
  toDateString,
} from '../../common/dates';
import { CountersService } from '../../counters/counters.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { Doctor } from '../doctors/doctor.schema';
import { Group } from '../groups/group.schema';
import { Patient } from '../patients/patient.schema';
import { SchedulesService } from '../schedules/schedules.service';
import { Service } from '../services/service.schema';
import {
  AddPaymentDto,
  CreateReservationDto,
  DeletePaymentDto,
  DiagnosisDto,
  ListReservationsDto,
  NextPatientDto,
  QueueQueryDto,
  QuoteQueryDto,
  UpdateReservationDto,
} from './dto/reservation.dto';
import { followupApplies, followupPrice, queueNumbers } from './followup';
import { BookingType, Payment, Reservation, ReservationStatus } from './reservation.schema';

/** Amounts are EGP and may carry piastres; keep sums from drifting. */
const money = (value: number) => Math.round(value * 100) / 100;

/** A 400 the add/edit forms can show next to the field it is about. */
const fieldError = (field: string, message: string) =>
  new BadRequestException({ message, errors: { [field]: [message] } });

/**
 * Where a visit stands in the day's queue, for the queue screen:
 * booked but not here yet, waiting, in with the doctor, done or canceled.
 */
function queueState(row: Reservation): string {
  if (row.status === ReservationStatus.Canceled) return 'canceled';
  if (row.status === ReservationStatus.Completed) return 'done';
  if (row.called_at) return 'with_doctor';
  if (row.arrived_at) return 'waiting';
  return 'not_arrived';
}

/** What the visit costs after the discount, what has been paid, and what is left. */
function balance(row: Pick<Reservation, 'price' | 'discount' | 'payments'>) {
  const net_price = money(Math.max(row.price - (row.discount ?? 0), 0));
  const paid = money((row.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0));
  return { net_price, paid, remaining: money(net_price - paid) };
}

interface Pricing {
  price: number;
  service_price: number;
  is_followup: boolean;
  followup_of: number | null;
  /** The full visit's day, for the booking form's "follow-up of ..." hint. */
  followup_date: string | null;
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) private readonly model: Model<Reservation>,
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Service.name) private readonly services: Model<Service>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
    private readonly schedules: SchedulesService,
  ) {}

  /**
   * Flattens each reservation into the shape the dashboard tables read:
   * `doctorName`, `clinicBranch`, `serviceName`, `CustomDate` and friends, plus
   * the visit's balance (`net_price`, `paid`, `remaining`) and `queue_state`.
   * The pages derive the doctor's cut from `item.doctor.prectange`, so that
   * carries the percentage snapshotted on the reservation, not today's. The
   * front desk doesn't see the doctors' shares or the diagnosis.
   */
  private async decorate(rows: Reservation[], user?: AuthUser) {
    const [patients, doctors, clinics, services, specialties, groups] = await Promise.all([
      this.lookups.patientsById(),
      this.lookups.doctorsById(),
      this.lookups.clinicsById(),
      this.lookups.servicesById(),
      this.lookups.specialtiesById(),
      this.lookups.groupsById(),
    ]);
    const hideShares = user?.role === 'receptionist';

    return rows.map(({ doctor_prectange, Diagnosis, ...row }) => {
      const doctor = doctors.get(row.doctor_id);
      const clinic = clinics.get(row.clinic_id);
      const payments = row.payments ?? [];
      const { prectange: _current, ...doctorInfo } = doctor ?? ({} as Partial<typeof doctor>);

      return {
        ...row,
        ...(hideShares ? {} : { doctor_prectange, Diagnosis }),
        service_price: row.service_price ?? row.price,
        discount: row.discount ?? 0,
        payments,
        ...balance(row),
        payment_method: payments.length ? payments[payments.length - 1].method : '',
        queue_state: queueState(row as Reservation),
        name: patients.get(row.patient_id)?.name ?? '',
        doctorName: doctor?.name ?? '',
        doctorSpecalite: doctor ? specialties.get(doctor.specialtie_id)?.title ?? '' : '',
        clinicBranch: clinic?.branch ?? '',
        clinicName: clinic?.name ?? '',
        groupName: groups.get(row.group_id)?.name ?? '',
        serviceName: services.get(row.service_id)?.name ?? '',
        CustomDate: toDateString(new Date(row.date)),
        doctor: hideShares ? doctorInfo : { ...doctorInfo, prectange: doctor_prectange },
      };
    });
  }

  /**
   * Visits this account may reach: its group's, at its branches; a doctor only
   * their own. `clinicId` / `groupId` are the dashboard's branch and group filters.
   */
  private scopeFor(user: AuthUser, clinicId?: number, groupId?: number): FilterQuery<Reservation> {
    const filter: FilterQuery<Reservation> = this.scope.clinicFilter(user, clinicId, groupId);
    if (user.role === 'doctor') filter.doctor_id = user.id;
    return filter;
  }

  async findAll(query: ListReservationsDto, user: AuthUser) {
    const filter = this.scopeFor(user, query.clinic_id, query.group_id);

    if (query.doctor_id) filter.doctor_id = user.role === 'doctor' ? user.id : query.doctor_id;
    if (query.patient_id) filter.patient_id = query.patient_id;

    const range = dateRangeFilter(query.start_date, query.end_date);
    if (range) filter.date = range;

    return this.decorate(await this.model.find(filter).sort({ date: 1, id: 1 }).lean(), user);
  }

  private async findScoped(id: number, user: AuthUser) {
    const row = await this.model.findOne({ id, ...this.scopeFor(user) }).lean();
    if (!row) {
      throw new NotFoundException('This reservation was not found');
    }
    return row;
  }

  async findOne(id: number, user: AuthUser) {
    const [decorated] = await this.decorate([await this.findScoped(id, user)], user);
    return decorated;
  }

  /**
   * The doctor and patient profile pages' visit history - still within the
   * account's reach, so a receptionist sees only its own branch's visits of a
   * doctor who works at several.
   */
  async findForDoctor(doctorId: number, user: AuthUser) {
    const filter = { ...this.scopeFor(user), doctor_id: doctorId };
    if (user.role === 'doctor' && doctorId !== user.id) return [];
    return this.decorate(await this.model.find(filter).sort({ date: -1 }).lean(), user);
  }

  async findForPatient(patientId: number, user: AuthUser) {
    const filter = { ...this.scopeFor(user), patient_id: patientId };
    return this.decorate(await this.model.find(filter).sort({ date: -1 }).lean(), user);
  }

  /**
   * The patient, doctor and service must all belong to the group booking them,
   * and when a branch is given the doctor must work there. Returns the records
   * whose values get snapshotted onto the reservation.
   */
  private async related(
    groupId: number,
    ids: { patient_id?: number; doctor_id?: number; service_id?: number },
    clinicId?: number,
  ) {
    const owned = { group_id: groupId };

    const [patient, doctor, service] = await Promise.all([
      ids.patient_id ? this.patients.findOne({ id: ids.patient_id, ...owned }).lean() : undefined,
      ids.doctor_id ? this.doctors.findOne({ id: ids.doctor_id, ...owned }).lean() : undefined,
      ids.service_id ? this.services.findOne({ id: ids.service_id, ...owned }).lean() : undefined,
    ]);

    if (ids.patient_id && !patient) throw new BadRequestException('Please choose a patient');
    if (ids.doctor_id && !doctor) throw new BadRequestException('Please choose a doctor');
    if (ids.service_id && !service) throw new BadRequestException('Please choose a valid service');
    if (doctor && clinicId && !doctor.clinic_ids.includes(clinicId)) {
      throw fieldError('doctor_id', "This doctor doesn't work at this branch");
    }

    return { doctor, service };
  }

  /**
   * Turns the form's day and optional time into the visit's timestamp, in the
   * server's local time. A visit for today with no time is stamped "now", as
   * every visit was before bookings had a day of their own.
   */
  private visitDate(date?: string, time?: string): Date {
    const now = new Date();
    if (!date) {
      if (!time) return now;
      date = toDateString(now);
    }

    if (!isDateOnly(date)) {
      // A full timestamp, as older clients send it.
      const when = new Date(date);
      if (time) when.setHours(+time.slice(0, 2), +time.slice(3, 5), 0, 0);
      return when;
    }

    if (time) return new Date(`${date}T${time}:00`);
    return isSameDay(date, now) ? now : parseDate(date);
  }

  /** The "YYYY-MM-DD" day a form's date means; today when there is none. */
  private dayOf(date?: string): string {
    if (!date) return toDateString(new Date());
    return isDateOnly(date) ? date : toDateString(new Date(date));
  }

  /** Only the group's owner may book outside the doctor's hours. */
  private overrides(requested: boolean | undefined, user: AuthUser): boolean {
    return requested === true && user.role === 'owner';
  }

  /**
   * Numbers a doctor's queue at a branch for a day by appointment time (see
   * `queueNumbers`). Runs after anything that adds, moves, cancels or removes a
   * visit that day, so a patient's number moves up when an earlier slot is booked.
   */
  private async renumber(clinicId: number, doctorId: number, when: Date) {
    const rows = await this.model
      .find({ clinic_id: clinicId, doctor_id: doctorId, date: { $gte: startOfDay(when), $lte: endOfDay(when) } })
      .select('id time status queue_number')
      .lean();
    const numbers = queueNumbers(rows);
    const changed = rows.filter((row) => numbers.get(row.id) !== row.queue_number);
    if (!changed.length) return;
    await this.model.bulkWrite(
      changed.map((row) => ({ updateOne: { filter: { id: row.id }, update: { $set: { queue_number: numbers.get(row.id) } } } })),
    );
  }

  /**
   * Prices a visit: the service's full price, or the follow-up price when the
   * group's re-visit rule covers it - same patient, same doctor (at any of the
   * group's branches), a service the rule names, within the rule's days of the
   * last full (non-follow-up) visit.
   */
  private async pricing(
    groupId: number,
    input: {
      patient_id: number;
      doctor_id: number;
      service: { id: number; price: number };
      when: Date;
      exclude?: number;
      apply?: boolean;
    },
  ): Promise<Pricing> {
    const full: Pricing = {
      price: input.service.price,
      service_price: input.service.price,
      is_followup: false,
      followup_of: null,
      followup_date: null,
    };
    if (input.apply === false) return full;

    const group = await this.groups.findOne({ id: groupId }).select('followup').lean();
    const rule = group?.followup;
    if (!followupApplies(rule, input.service.id)) return full;

    const since = startOfDay(input.when);
    since.setDate(since.getDate() - rule.days);

    const previous = await this.model
      .findOne({
        group_id: groupId,
        patient_id: input.patient_id,
        doctor_id: input.doctor_id,
        service_id: { $in: rule.service_ids },
        is_followup: { $ne: true },
        status: { $ne: ReservationStatus.Canceled },
        date: { $gte: since, $lte: input.when },
        ...(input.exclude ? { id: { $ne: input.exclude } } : {}),
      })
      .sort({ date: -1 })
      .lean();
    if (!previous) return full;

    return {
      price: followupPrice(rule, input.service.price),
      service_price: input.service.price,
      is_followup: true,
      followup_of: previous.id,
      followup_date: toDateString(new Date(previous.date)),
    };
  }

  private assertDiscount(discount: number, price: number) {
    if (discount > price) {
      throw fieldError('discount', 'The discount cannot be more than the price');
    }
  }

  private async payment(amount: number, method: string, user: AuthUser): Promise<Payment> {
    return {
      id: await this.counters.next('payment'),
      amount: money(amount),
      method,
      paid_at: new Date(),
      recorded_by_role: user.role,
      recorded_by_id: user.id,
    };
  }

  /** What booking this would cost, shown on the booking form before it is saved. The branch doesn't matter. */
  async quote(query: QuoteQueryDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    const { service } = await this.related(groupId, query);

    const pricing = await this.pricing(groupId, {
      patient_id: query.patient_id,
      doctor_id: query.doctor_id,
      service,
      when: this.visitDate(query.date, query.time),
      exclude: query.id,
    });
    const group = await this.groups.findOne({ id: groupId }).select('followup').lean();

    return { ...pricing, followup_days: group?.followup?.days ?? 0 };
  }

  /**
   * The front desk books a visit: a receptionist at its own branch, the group's
   * owner at the branch it names. The doctor must work at that branch, and the
   * visit takes a free slot in the doctor's hours there (see SchedulesService).
   */
  async create(dto: CreateReservationDto, user: AuthUser) {
    const clinicId = await this.scope.actingClinicId(user, dto.clinic_id);
    const groupId = this.scope.ownGroupId(user);
    const { doctor, service } = await this.related(groupId, dto, clinicId);

    const now = new Date();
    const day = this.dayOf(dto.date);
    const placed = await this.schedules.place({
      doctorId: doctor.id,
      clinicId,
      day,
      time: dto.time,
      override: this.overrides(dto.override_hours, user),
    });
    const when = this.visitDate(day, placed.time);
    const today = isSameDay(when, now);
    const bookingType = dto.booking_type ?? (today ? BookingType.WalkIn : BookingType.Booked);
    const status = dto.status ?? ReservationStatus.Pending;

    const { followup_date: _hint, ...pricing } = await this.pricing(groupId, {
      patient_id: dto.patient_id,
      doctor_id: dto.doctor_id,
      service,
      when,
      apply: dto.apply_followup,
    });

    const discount = dto.discount ?? 0;
    this.assertDiscount(discount, pricing.price);

    const paid = dto.paid ?? 0;
    if (paid > 0 && status === ReservationStatus.Canceled) {
      throw fieldError('paid', "A canceled visit can't take a payment");
    }
    if (paid > pricing.price - discount) {
      throw fieldError('paid', 'The amount paid is more than the visit costs');
    }

    const created = await this.model.create({
      id: await this.counters.next('reservation'),
      patient_id: dto.patient_id,
      doctor_id: dto.doctor_id,
      service_id: dto.service_id,
      group_id: groupId,
      clinic_id: clinicId,
      ...pricing,
      followup_waived: dto.apply_followup === false,
      doctor_prectange: doctor.prectange,
      date: when,
      time: placed.time,
      outside_hours: placed.outside_hours,
      booking_type: bookingType,
      queue_number: 0,
      arrived_at: bookingType === BookingType.WalkIn && today ? now : null,
      discount,
      payments: paid > 0 ? [await this.payment(paid, dto.payment_method ?? 'cash', user)] : [],
      // The diagnosis is the doctor's (or the clinic owner's) to write.
      Diagnosis: user.role === 'receptionist' ? '' : dto.Diagnosis ?? '',
      status,
    });
    await this.renumber(clinicId, doctor.id, when);

    return this.findOne(created.id, user);
  }

  /**
   * A visit stays at its branch (cancel and rebook to move it); a new doctor
   * must work there. Moving it - another doctor, day or time - takes a free slot
   * in that doctor's hours, as booking does.
   */
  async update({ id, apply_followup, date, time, override_hours, ...changes }: UpdateReservationDto, user: AuthUser) {
    const existing = await this.findScoped(id, user);
    if (user.role === 'receptionist') delete changes.Diagnosis;

    const differs = <K extends 'patient_id' | 'doctor_id' | 'service_id'>(key: K) =>
      changes[key] !== undefined && changes[key] !== existing[key];

    const patientChanged = differs('patient_id');
    const doctorChanged = differs('doctor_id');
    const serviceChanged = differs('service_id');
    const dayChanged = date !== undefined && !isSameDay(date, existing.date);
    const timeChanged = time !== undefined && time !== (existing.time ?? '');

    const { doctor, service } = await this.related(
      existing.group_id,
      {
        patient_id: changes.patient_id,
        doctor_id: doctorChanged ? changes.doctor_id : undefined,
        service_id: serviceChanged ? changes.service_id : undefined,
      },
      existing.clinic_id,
    );

    const patch: Record<string, unknown> = { ...changes };
    if (doctor) patch.doctor_prectange = doctor.prectange;

    let when = new Date(existing.date);
    const moved = dayChanged || timeChanged || doctorChanged;
    if (moved) {
      const day = dayChanged ? this.dayOf(date) : toDateString(when);
      const placed = await this.schedules.place({
        doctorId: changes.doctor_id ?? existing.doctor_id,
        clinicId: existing.clinic_id,
        day,
        time: time ?? existing.time,
        exclude: id,
        override: this.overrides(override_hours, user),
      });
      when = this.visitDate(day, placed.time);
      patch.date = when;
      patch.time = placed.time;
      patch.outside_hours = placed.outside_hours;
    }

    // Moving to another day or doctor means queueing again there.
    if (dayChanged || doctorChanged) {
      patch.called_at = null;
      if (dayChanged) patch.arrived_at = null;
    }

    // Re-price when anything the re-visit rule looks at changed. Switching the
    // service takes its current price; otherwise the snapshotted full price stays.
    let price = existing.price;
    if (patientChanged || doctorChanged || serviceChanged || dayChanged || timeChanged || apply_followup !== undefined) {
      const { followup_date: _hint, ...pricing } = await this.pricing(existing.group_id, {
        patient_id: changes.patient_id ?? existing.patient_id,
        doctor_id: changes.doctor_id ?? existing.doctor_id,
        service: service ?? { id: existing.service_id, price: existing.service_price ?? existing.price },
        when,
        exclude: id,
        apply: apply_followup ?? !existing.followup_waived,
      });
      Object.assign(patch, pricing);
      if (apply_followup !== undefined) patch.followup_waived = !apply_followup;
      price = pricing.price;
    }

    this.assertDiscount(changes.discount ?? existing.discount ?? 0, price);

    await this.model.updateOne({ id }, { $set: patch });

    // The queue follows appointment times: renumber the day it left and the day it joined.
    if (moved || (changes.status !== undefined && changes.status !== existing.status)) {
      await this.renumber(existing.clinic_id, existing.doctor_id, new Date(existing.date));
      if (moved) await this.renumber(existing.clinic_id, changes.doctor_id ?? existing.doctor_id, when);
    }
    return this.findOne(id, user);
  }

  async writeDiagnosis({ id, Diagnosis }: DiagnosisDto, user: AuthUser) {
    await this.findScoped(id, user);
    await this.model.updateOne({ id }, { $set: { Diagnosis: Diagnosis ?? '' } });
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthUser) {
    const row = await this.findScoped(id, user);
    await this.model.deleteOne({ id });
    await this.renumber(row.clinic_id, row.doctor_id, new Date(row.date));
    return { id };
  }

  // --- The day's queue ---------------------------------------------------------

  /** One day's visits in queue order, per branch and doctor. A doctor only gets their own. */
  async queue(query: QueueQueryDto, user: AuthUser) {
    const filter = this.scopeFor(user, query.clinic_id, query.group_id);
    if (query.doctor_id && user.role !== 'doctor') filter.doctor_id = query.doctor_id;

    const day = query.date ?? toDateString(new Date());
    filter.date = { $gte: startOfDay(day), $lte: endOfDay(day) };

    const rows = await this.model.find(filter).sort({ clinic_id: 1, doctor_id: 1, queue_number: 1, id: 1 }).lean();
    return this.decorate(rows, user);
  }

  /** The desk marks a booked patient as arrived, which puts them in line. */
  async checkIn(id: number, user: AuthUser) {
    const row = await this.findScoped(id, user);

    if (row.status !== ReservationStatus.Pending) {
      throw new BadRequestException('Only a waiting visit can check in');
    }
    if (!isSameDay(row.date, new Date())) {
      throw new BadRequestException('This visit is not booked for today');
    }

    if (!row.arrived_at) {
      await this.model.updateOne({ id }, { $set: { arrived_at: new Date() } });
    }
    return this.findOne(id, user);
  }

  /**
   * "Next patient" for a doctor's queue at a branch: whoever is in with the
   * doctor is done, and the arrived patient with the lowest number is called
   * in. Booked patients who haven't checked in are passed over until they
   * arrive. The branch can be left out when only one fits.
   */
  async nextPatient(dto: NextPatientDto, user: AuthUser) {
    const doctorId = user.role === 'doctor' ? user.id : dto.doctor_id;
    if (!doctorId) {
      throw fieldError('doctor_id', 'Please choose a doctor');
    }

    const doctor = await this.doctors
      .findOne({ id: doctorId, ...this.scope.groupFilter(user) })
      .select('id group_id clinic_ids')
      .lean();
    if (!doctor) {
      throw new NotFoundException('This doctor was not found');
    }

    const branches = doctor.clinic_ids.filter((id) => !user.clinic_ids || user.clinic_ids.includes(id));
    const clinicId = dto.clinic_id ?? (branches.length === 1 ? branches[0] : undefined);
    if (!clinicId || !branches.includes(clinicId)) {
      throw fieldError('clinic_id', 'Please choose a branch');
    }

    const now = new Date();
    const today = {
      group_id: doctor.group_id,
      clinic_id: clinicId,
      doctor_id: doctor.id,
      status: ReservationStatus.Pending,
      date: { $gte: startOfDay(now), $lte: endOfDay(now) },
    };

    const finishing = await this.model.find({ ...today, called_at: { $ne: null } }).select('id').lean();
    const finished = finishing.map((row) => row.id);
    await this.model.updateMany({ id: { $in: finished } }, { $set: { status: ReservationStatus.Completed } });

    // Claimed in one atomic step, so two clicks can't call the same patient twice.
    const waitingFilter = { ...today, called_at: null, arrived_at: { $ne: null } };
    const next = await this.model
      .findOneAndUpdate(waitingFilter, { $set: { called_at: now } }, { sort: { queue_number: 1, id: 1 }, new: true })
      .lean();

    return {
      finished,
      current: next ? (await this.decorate([next], user))[0] : null,
      waiting: await this.model.countDocuments(waitingFilter),
    };
  }

  // --- Payments ------------------------------------------------------------------

  /** Takes an amount towards the visit; never more than what is left to pay. */
  async addPayment({ id, amount, method }: AddPaymentDto, user: AuthUser) {
    const row = await this.findScoped(id, user);

    if (row.status === ReservationStatus.Canceled) {
      throw fieldError('amount', "A canceled visit can't take a payment");
    }
    if (money(amount) > balance(row).remaining) {
      throw fieldError('amount', 'The amount is more than what is left to pay');
    }

    await this.model.updateOne({ id }, { $push: { payments: await this.payment(amount, method, user) } });
    return this.findOne(id, user);
  }

  /** Corrects a payment typed in by mistake. Clinic owners only. */
  async deletePayment({ id, payment_id }: DeletePaymentDto, user: AuthUser) {
    await this.findScoped(id, user);

    const result = await this.model.updateOne(
      { id, 'payments.id': payment_id },
      { $pull: { payments: { id: payment_id } } },
    );
    if (!result.matchedCount) {
      throw new NotFoundException('This payment was not found');
    }
    return this.findOne(id, user);
  }
}
