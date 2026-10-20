import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { endOfDay, startOfDay, toDateString, toTimeString } from '../../common/dates';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { Doctor } from '../doctors/doctor.schema';
import { Reservation, ReservationStatus } from '../reservations/reservation.schema';
import { CalendarQueryDto, ResetDayDto, SaveDayDto, SaveWeeklyDto, SlotsQueryDto } from './dto/schedule.dto';
import {
  DEFAULT_SLOT_MINUTES,
  Period,
  WeeklyPeriod,
  byStart,
  eachDay,
  fromMinutes,
  hoursOn,
  overlaps,
  periodsProblem,
  slotOf,
  slotTimes,
  toMinutes,
  withinHours,
} from './hours';
import { DoctorSchedule, ScheduleException } from './schedule.schema';

/** Why a booking or a change of hours was refused; the dashboard words each one. */
export const ScheduleCode = {
  OutsideHours: 'OUTSIDE_HOURS',
  SlotTaken: 'SLOT_TAKEN',
  NoFreeSlot: 'NO_FREE_SLOT',
  HoursClash: 'HOURS_CLASH',
  BookingsOutside: 'BOOKINGS_OUTSIDE',
} as const;

/** A 400 the forms show next to the field, with a code and details the dashboard can act on. */
const fieldError = (field: string, message: string, code?: string, details?: Record<string, unknown>) =>
  new BadRequestException({ message, ...(code ? { code } : {}), ...(details ? { details } : {}), errors: { [field]: [message] } });

/** The calendar asks for a month at a time; this leaves room for the weeks around it. */
const MAX_DAYS = 62;

/** "YYYY-MM-DD" from a date input, which may carry a time. */
const dayOf = (value: string) => value.slice(0, 10);

interface DayPlan {
  date: string;
  hours: Period[];
  /** Where the day's hours come from: the weekly timetable, other hours for that date, or a day off. */
  source: 'weekly' | 'custom' | 'closed';
  note: string;
}

type Holding = Pick<Reservation, 'id' | 'patient_id' | 'date' | 'time' | 'queue_number' | 'status'>;

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(DoctorSchedule.name) private readonly schedules: Model<DoctorSchedule>,
    @InjectModel(ScheduleException.name) private readonly exceptions: Model<ScheduleException>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
  ) {}

  // --- Who may see and change which hours --------------------------------------

  /** The doctor's branches this account works at: all of them for the owner and the platform. */
  private reachable(doctor: Pick<Doctor, 'clinic_ids'>, user: AuthUser) {
    return doctor.clinic_ids.filter((id) => !user.clinic_ids || user.clinic_ids.includes(id));
  }

  /**
   * The doctor, when this account may see (and on the write routes, change)
   * their hours: the group's owner, the front desk of a branch the doctor works
   * at, or the doctor themselves. With `clinicId`, that branch must be one of
   * the doctor's that the account reaches.
   */
  private async doctorFor(user: AuthUser, doctorId: number, clinicId?: number) {
    const doctor = await this.doctors
      .findOne({ id: doctorId, ...this.scope.groupFilter(user) })
      .select('id group_id clinic_ids')
      .lean();
    if (!doctor || (user.role === 'doctor' && doctor.id !== user.id)) {
      throw new NotFoundException('This doctor was not found');
    }
    if (clinicId !== undefined && !this.reachable(doctor, user).includes(clinicId)) {
      throw fieldError('clinic_id', "This doctor doesn't work at this branch");
    }
    return doctor;
  }

  // --- Reading hours -------------------------------------------------------------

  /** The weekly timetable at a branch, or an empty one with the default appointment length. */
  private async scheduleAt(doctorId: number, clinicId: number) {
    const row = await this.schedules.findOne({ doctor_id: doctorId, clinic_id: clinicId }).lean();
    const hours: WeeklyPeriod[] = (row?.hours ?? []).map(({ weekday, start, end }) => ({ weekday, start, end }));
    return { slot_minutes: row?.slot_minutes ?? DEFAULT_SLOT_MINUTES, hours };
  }

  /** Each day's hours from `start` to `end` at a branch. */
  private async plan(doctorId: number, clinicId: number, start: string, end: string) {
    const [schedule, exceptions] = await Promise.all([
      this.scheduleAt(doctorId, clinicId),
      this.exceptions.find({ doctor_id: doctorId, clinic_id: clinicId, date: { $gte: start, $lte: end } }).lean(),
    ]);
    const byDate = new Map(exceptions.map((row) => [row.date, row]));

    const days: DayPlan[] = eachDay(start, end).map((date) => {
      const exception = byDate.get(date);
      return {
        date,
        hours: hoursOn(date, schedule.hours, exception),
        source: exception ? (exception.closed ? 'closed' : 'custom') : 'weekly',
        note: exception?.note ?? '',
      };
    });
    return { ...schedule, days };
  }

  /** Visits holding a place in the doctor's days at a branch - anything not canceled - oldest booking first. */
  private booked(doctorId: number, clinicId: number, start: string, end: string, exclude?: number): Promise<Holding[]> {
    return this.reservations
      .find({
        doctor_id: doctorId,
        clinic_id: clinicId,
        status: { $ne: ReservationStatus.Canceled },
        date: { $gte: startOfDay(start), $lte: endOfDay(end) },
        ...(exclude ? { id: { $ne: exclude } } : {}),
      })
      .select('id patient_id date time queue_number status')
      .sort({ id: 1 })
      .lean();
  }

  /**
   * Which slot each of a day's visits holds. Visits off the slots - booked
   * outside the hours by the owner, squeezed into a taken slot, or with no set
   * time - hold none and are returned apart.
   */
  private holdings(rows: Holding[], hours: Period[], slotMinutes: number) {
    const taken = new Map<string, Holding>();
    const off: Holding[] = [];
    for (const row of rows) {
      const slot = row.time ? slotOf(row.time, hours, slotMinutes) : null;
      if (slot && !taken.has(slot)) taken.set(slot, row);
      else off.push(row);
    }
    return { taken, off };
  }

  /** Whether a slot can still be booked: a later day, or later today than the slot's end. */
  private open(day: string, time: string, slotMinutes: number, now: Date) {
    const today = toDateString(now);
    if (day !== today) return day > today;
    return toMinutes(time) + slotMinutes > toMinutes(toTimeString(now));
  }

  /** The doctor's weekly timetables at the branches this account works at. */
  async forDoctor(doctorId: number, user: AuthUser) {
    const doctor = await this.doctorFor(user, doctorId);
    const branches = this.reachable(doctor, user);
    const [rows, clinics] = await Promise.all([
      this.schedules.find({ doctor_id: doctor.id, clinic_id: { $in: branches } }).lean(),
      this.lookups.clinicsById(),
    ]);

    return branches.map((clinicId) => {
      const row = rows.find((schedule) => schedule.clinic_id === clinicId);
      return {
        doctor_id: doctor.id,
        clinic_id: clinicId,
        clinicName: clinics.get(clinicId)?.name ?? '',
        slot_minutes: row?.slot_minutes ?? DEFAULT_SLOT_MINUTES,
        hours: byStart((row?.hours ?? []).map(({ weekday, start, end }) => ({ weekday, start, end }))),
      };
    });
  }

  /** The month view: each day's hours and how many of its slots are booked or still free. */
  async calendar(query: CalendarQueryDto, user: AuthUser) {
    await this.doctorFor(user, query.doctor_id, query.clinic_id);
    const start = dayOf(query.start);
    const end = dayOf(query.end);
    if (end < start || eachDay(start, end).length > MAX_DAYS) {
      throw fieldError('end', 'Please choose up to two months');
    }

    const [plan, rows] = await Promise.all([
      this.plan(query.doctor_id, query.clinic_id, start, end),
      this.booked(query.doctor_id, query.clinic_id, start, end),
    ]);
    const byDay = new Map<string, Holding[]>();
    for (const row of rows) {
      const day = toDateString(new Date(row.date));
      byDay.set(day, [...(byDay.get(day) ?? []), row]);
    }

    const now = new Date();
    return {
      slot_minutes: plan.slot_minutes,
      days: plan.days.map((day) => {
        const visits = byDay.get(day.date) ?? [];
        const slots = slotTimes(day.hours, plan.slot_minutes);
        const { taken } = this.holdings(visits, day.hours, plan.slot_minutes);
        return {
          ...day,
          slots: slots.length,
          booked: visits.length,
          free: slots.filter((time) => !taken.has(time) && this.open(day.date, time, plan.slot_minutes, now)).length,
        };
      }),
    };
  }

  /** One day's slots - free, taken (by whom) or over - and the visits that hold no slot. */
  async daySlots(query: SlotsQueryDto, user: AuthUser) {
    await this.doctorFor(user, query.doctor_id, query.clinic_id);
    const date = dayOf(query.date);

    const [plan, rows, patients] = await Promise.all([
      this.plan(query.doctor_id, query.clinic_id, date, date),
      this.booked(query.doctor_id, query.clinic_id, date, date, query.exclude),
      this.lookups.patientsById(),
    ]);
    const [day] = plan.days;
    const { taken, off } = this.holdings(rows, day.hours, plan.slot_minutes);
    const brief = (row: Holding) => ({
      id: row.id,
      name: patients.get(row.patient_id)?.name ?? '',
      time: row.time,
      queue_number: row.queue_number,
      status: row.status,
    });

    const now = new Date();
    return {
      ...day,
      slot_minutes: plan.slot_minutes,
      slots: slotTimes(day.hours, plan.slot_minutes).map((time) => {
        const row = taken.get(time);
        return {
          time,
          end: fromMinutes(toMinutes(time) + plan.slot_minutes),
          state: row ? 'taken' : this.open(date, time, plan.slot_minutes, now) ? 'free' : 'past',
          visit: row ? brief(row) : null,
        };
      }),
      others: off.map(brief),
    };
  }

  // --- Changing hours ------------------------------------------------------------

  /** "Dr. X already works at <branch> then", with the branch and day for the dashboard to word. */
  private async clash(clinicId: number, when: { weekday?: number; date?: string }) {
    const clinic = (await this.lookups.clinicsById()).get(clinicId);
    return fieldError('hours', 'The doctor already works at another branch at this time', ScheduleCode.HoursClash, {
      clinic: clinic?.name ?? '',
      ...when,
    });
  }

  /** On one date, the doctor's hours at the other branches mustn't overlap `hours` here. */
  private async assertNoClashOn(doctorId: number, clinicId: number, date: string, hours: Period[]) {
    if (!hours.length) return;
    const [schedules, exceptions] = await Promise.all([
      this.schedules.find({ doctor_id: doctorId, clinic_id: { $ne: clinicId } }).lean(),
      this.exceptions.find({ doctor_id: doctorId, clinic_id: { $ne: clinicId }, date }).lean(),
    ]);
    const branches = new Set([...schedules, ...exceptions].map((row) => row.clinic_id));

    for (const branch of branches) {
      const weekly = schedules.find((row) => row.clinic_id === branch)?.hours ?? [];
      const theirs = hoursOn(date, weekly, exceptions.find((row) => row.clinic_id === branch));
      if (theirs.some((other) => hours.some((mine) => overlaps(mine, other)))) {
        throw await this.clash(branch, { date });
      }
    }
  }

  /**
   * Changing hours mustn't strand booked patients: every visit still waiting at
   * the branch from `from` (to `to`) must fall within the new hours of its day.
   * `hoursFor` gives a day's new hours, or null for a day that isn't changing.
   * Visits the owner booked outside the hours on purpose are left alone.
   */
  private async assertVisitsFit(
    doctorId: number,
    clinicId: number,
    from: string,
    to: string | null,
    hoursFor: (day: string) => Period[] | null,
  ) {
    const rows = await this.reservations
      .find({
        doctor_id: doctorId,
        clinic_id: clinicId,
        status: ReservationStatus.Pending,
        outside_hours: { $ne: true },
        date: { $gte: startOfDay(from), ...(to ? { $lte: endOfDay(to) } : {}) },
      })
      .select('id patient_id date time')
      .sort({ date: 1 })
      .lean();

    const stranded = rows.filter((row) => {
      const hours = hoursFor(toDateString(new Date(row.date)));
      if (!hours) return false;
      return row.time ? !withinHours(row.time, hours) : !hours.length;
    });
    if (!stranded.length) return;

    const patients = await this.lookups.patientsById();
    throw new ConflictException({
      message: 'Some booked patients fall outside these hours - move or cancel their visits first',
      code: ScheduleCode.BookingsOutside,
      details: {
        visits: stranded.map((row) => ({
          id: row.id,
          name: patients.get(row.patient_id)?.name ?? '',
          date: toDateString(new Date(row.date)),
          time: row.time,
        })),
      },
    });
  }

  /** Replaces the doctor's weekly timetable (and appointment length) at a branch. */
  async saveWeekly(dto: SaveWeeklyDto, user: AuthUser) {
    const doctor = await this.doctorFor(user, dto.doctor_id, dto.clinic_id);
    const hours: WeeklyPeriod[] = dto.hours.map(({ weekday, start, end }) => ({ weekday, start, end }));

    for (let weekday = 0; weekday < 7; weekday++) {
      const problem = periodsProblem(hours.filter((period) => period.weekday === weekday));
      if (problem) throw fieldError('hours', problem, undefined, { weekday });
    }

    // Not at two branches at once: against the other branches' weekly hours...
    const others = await this.schedules.find({ doctor_id: doctor.id, clinic_id: { $ne: dto.clinic_id } }).lean();
    for (const other of others) {
      const clashing = hours.find((mine) =>
        other.hours.some((theirs) => theirs.weekday === mine.weekday && overlaps(mine, theirs)),
      );
      if (clashing) throw await this.clash(other.clinic_id, { weekday: clashing.weekday });
    }

    // ...and against dates they set differently, unless this branch has that date set too.
    const today = toDateString(new Date());
    const [own, theirs] = await Promise.all([
      this.exceptions.find({ doctor_id: doctor.id, clinic_id: dto.clinic_id, date: { $gte: today } }).select('date').lean(),
      this.exceptions
        .find({ doctor_id: doctor.id, clinic_id: { $ne: dto.clinic_id }, date: { $gte: today }, closed: false })
        .lean(),
    ]);
    const ownDates = new Set(own.map((row) => row.date));
    for (const exception of theirs) {
      if (ownDates.has(exception.date)) continue;
      const mine = hoursOn(exception.date, hours);
      if (mine.some((period) => exception.hours.some((other) => overlaps(period, other)))) {
        throw await this.clash(exception.clinic_id, { date: exception.date });
      }
    }

    // Booked visits must still fit; a date with its own hours keeps them.
    await this.assertVisitsFit(doctor.id, dto.clinic_id, today, null, (day) =>
      ownDates.has(day) ? null : hoursOn(day, hours),
    );

    await this.schedules.updateOne(
      { doctor_id: doctor.id, clinic_id: dto.clinic_id },
      { $set: { group_id: doctor.group_id, slot_minutes: dto.slot_minutes, hours: byStart(hours) } },
      { upsert: true },
    );
    return (await this.forDoctor(doctor.id, user)).find((row) => row.clinic_id === dto.clinic_id);
  }

  /** Sets one date apart from the weekly timetable: a day off, or other hours. */
  async saveDay(dto: SaveDayDto, user: AuthUser) {
    const doctor = await this.doctorFor(user, dto.doctor_id, dto.clinic_id);
    const date = dayOf(dto.date);
    if (date < toDateString(new Date())) {
      throw fieldError('date', "Past days can't be changed");
    }

    const hours = dto.closed ? [] : byStart((dto.hours ?? []).map(({ start, end }) => ({ start, end })));
    if (!dto.closed && !hours.length) {
      throw fieldError('hours', 'Add the working hours, or mark the day off');
    }
    const problem = periodsProblem(hours);
    if (problem) throw fieldError('hours', problem);

    await this.assertNoClashOn(doctor.id, dto.clinic_id, date, hours);
    await this.assertVisitsFit(doctor.id, dto.clinic_id, date, date, () => hours);

    await this.exceptions.updateOne(
      { doctor_id: doctor.id, clinic_id: dto.clinic_id, date },
      { $set: { group_id: doctor.group_id, closed: dto.closed, hours, note: dto.note ?? '' } },
      { upsert: true },
    );
    return this.daySlots({ doctor_id: doctor.id, clinic_id: dto.clinic_id, date }, user);
  }

  /** Puts a date back on the weekly timetable. */
  async resetDay(dto: ResetDayDto, user: AuthUser) {
    const doctor = await this.doctorFor(user, dto.doctor_id, dto.clinic_id);
    const date = dayOf(dto.date);
    if (date < toDateString(new Date())) {
      throw fieldError('date', "Past days can't be changed");
    }

    const { hours: weekly } = await this.scheduleAt(doctor.id, dto.clinic_id);
    const hours = hoursOn(date, weekly);
    await this.assertNoClashOn(doctor.id, dto.clinic_id, date, hours);
    await this.assertVisitsFit(doctor.id, dto.clinic_id, date, date, () => hours);

    await this.exceptions.deleteOne({ doctor_id: doctor.id, clinic_id: dto.clinic_id, date });
    return this.daySlots({ doctor_id: doctor.id, clinic_id: dto.clinic_id, date }, user);
  }

  // --- Booking into the hours ------------------------------------------------------

  /**
   * Where a new or moved visit goes: a free slot in the doctor's hours at the
   * branch that day, returned as the time to store. With no time, a visit for
   * today takes the next free slot. The group's owner may book outside the
   * hours or into a taken slot on purpose (`override`); the visit is then
   * marked `outside_hours`.
   */
  async place(input: {
    doctorId: number;
    clinicId: number;
    day: string;
    time?: string;
    exclude?: number;
    override: boolean;
  }): Promise<{ time: string; outside_hours: boolean }> {
    const { doctorId, clinicId, day, override } = input;
    const now = new Date();
    const today = toDateString(now);

    if (day < today && !override) {
      throw fieldError('date', 'This day has passed', ScheduleCode.OutsideHours);
    }

    const [plan, rows] = await Promise.all([
      this.plan(doctorId, clinicId, day, day),
      this.booked(doctorId, clinicId, day, day, input.exclude),
    ]);
    const { slot_minutes } = plan;
    const [{ hours }] = plan.days;
    const slots = slotTimes(hours, slot_minutes);
    const { taken } = this.holdings(rows, hours, slot_minutes);
    const notWorking = "The doctor doesn't work at this branch on this day";

    if (!input.time) {
      if (day === today) {
        const next = slots.find((time) => !taken.has(time) && this.open(day, time, slot_minutes, now));
        if (next) return { time: next, outside_hours: false };
        if (override) return { time: toTimeString(now), outside_hours: true };
        throw slots.length
          ? fieldError('time', 'The doctor has no free time left today', ScheduleCode.NoFreeSlot)
          : fieldError('time', notWorking, ScheduleCode.OutsideHours);
      }
      if (override) return { time: '', outside_hours: true };
      throw fieldError('time', 'Please choose a time');
    }

    const time = input.time;
    if (slotOf(time, hours, slot_minutes) !== time) {
      if (override) return { time, outside_hours: true };
      throw fieldError('time', slots.length ? "This time is outside the doctor's hours" : notWorking, ScheduleCode.OutsideHours);
    }
    if (taken.has(time)) {
      if (override) return { time, outside_hours: true };
      throw fieldError('time', 'This time is already booked', ScheduleCode.SlotTaken);
    }
    if (!this.open(day, time, slot_minutes, now)) {
      if (override) return { time, outside_hours: true };
      throw fieldError('time', 'This time has already passed', ScheduleCode.OutsideHours);
    }
    return { time, outside_hours: false };
  }
}
