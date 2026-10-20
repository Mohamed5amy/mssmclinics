import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { endOfDay, parseDate, startOfDay, toDateString } from '../../common/dates';
import { CountersService } from '../../counters/counters.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { Doctor } from '../doctors/doctor.schema';
import { AWAY_STATUSES, PAYMENT_METHODS, Payment, Reservation, ReservationStatus } from '../reservations/reservation.schema';
import { Staff } from '../staff/staff.schema';
import { AddPayoutDto, CashReportQueryDto, StatementQueryDto } from './dto/finance.dto';
import { DoctorPayout } from './payout.schema';

/** Amounts are EGP and may carry piastres; keep sums from drifting. */
const money = (value: number) => Math.round(value * 100) / 100;
const sum = <T>(rows: T[], amount: (row: T) => number) => money(rows.reduce((total, row) => total + amount(row), 0));
const paidOn = (visit: { payments?: Payment[] }) => sum(visit.payments ?? [], (payment) => payment.amount);

const fieldError = (field: string, message: string) =>
  new BadRequestException({ message, errors: { [field]: [message] } });

/** One payment of the day, with the visit it was taken for. */
interface DayPayment {
  reservation_id: number;
  patient_id: number;
  doctor_id: number;
  clinic_id: number;
  service_id: number;
  date: Date;
  payment: Payment;
}

/**
 * The money side: what the desk took on a day (الخزنة) and what each doctor
 * earned and was paid (كشف حساب الدكتور).
 */
@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(DoctorPayout.name) private readonly payouts: Model<DoctorPayout>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
  ) {}

  private async staffNames(ids: number[]): Promise<Map<number, string>> {
    const rows = await this.staff.find({ id: { $in: [...new Set(ids)] } }).select('id name').lean();
    return new Map(rows.map((row) => [row.id, row.name]));
  }

  /**
   * The money taken on one day at the account's branches - a receptionist's
   * own, the owner's one or all - by when it was paid, not by the visit's day,
   * so a deposit for next week counts today. Totals per payment method (cash is
   * what the drawer should hold) and per person who took it, and every payment.
   */
  async cashReport(query: CashReportQueryDto, user: AuthUser) {
    const day = (query.date ?? toDateString(new Date())).slice(0, 10);
    const paidThatDay = { $gte: startOfDay(day), $lte: endOfDay(day) };

    const rows = await this.reservations.aggregate<DayPayment>([
      { $match: { ...this.scope.clinicFilter(user, query.clinic_id, query.group_id), 'payments.paid_at': paidThatDay } },
      { $unwind: '$payments' },
      { $match: { 'payments.paid_at': paidThatDay } },
      { $sort: { 'payments.paid_at': 1 } },
      {
        $project: {
          _id: 0,
          reservation_id: '$id',
          patient_id: 1,
          doctor_id: 1,
          clinic_id: 1,
          service_id: 1,
          date: 1,
          payment: '$payments',
        },
      },
    ]);

    const [patients, doctors, clinics, services, staff] = await Promise.all([
      this.lookups.patientsById(),
      this.lookups.doctorsById(),
      this.lookups.clinicsById(),
      this.lookups.servicesById(),
      this.staffNames(rows.map((row) => row.payment.recorded_by_id)),
    ]);

    const payments = rows.map((row) => ({
      id: row.payment.id,
      reservation_id: row.reservation_id,
      name: patients.get(row.patient_id)?.name ?? '',
      doctorName: doctors.get(row.doctor_id)?.name ?? '',
      clinicName: clinics.get(row.clinic_id)?.name ?? '',
      serviceName: services.get(row.service_id)?.name ?? '',
      visit_date: toDateString(new Date(row.date)),
      amount: row.payment.amount,
      method: row.payment.method,
      paid_at: row.payment.paid_at,
      recorded_by_role: row.payment.recorded_by_role,
      recorded_by_id: row.payment.recorded_by_id,
      recorded_by_name: staff.get(row.payment.recorded_by_id) ?? '',
    }));

    const people = new Map<string, { role: string; id: number; name: string; amount: number; cash: number; count: number }>();
    for (const payment of payments) {
      const key = `${payment.recorded_by_role}:${payment.recorded_by_id}`;
      const person = people.get(key) ?? {
        role: payment.recorded_by_role,
        id: payment.recorded_by_id,
        name: payment.recorded_by_name,
        amount: 0,
        cash: 0,
        count: 0,
      };
      person.amount = money(person.amount + payment.amount);
      if (payment.method === 'cash') person.cash = money(person.cash + payment.amount);
      person.count += 1;
      people.set(key, person);
    }

    return {
      date: day,
      total: sum(payments, (payment) => payment.amount),
      count: payments.length,
      by_method: PAYMENT_METHODS.map((method) => {
        const these = payments.filter((payment) => payment.method === method);
        return { method, amount: sum(these, (payment) => payment.amount), count: these.length };
      }),
      by_staff: [...people.values()].sort((a, b) => b.amount - a.amount),
      payments,
    };
  }

  /**
   * A doctor's statement for a period (this month by default): what they were
   * owed coming in (`opening`), their share of what was collected on their
   * visits in the period, what they were paid, and what they are owed now
   * (`closing`). A share is the visit's snapshotted percentage of what its
   * patient paid; canceled visits and no-shows earn nothing. A doctor gets
   * their own statement whatever they ask for.
   */
  async statement(query: StatementQueryDto, user: AuthUser) {
    const doctorId = user.role === 'doctor' ? user.id : query.doctor_id;
    if (!doctorId) {
      throw fieldError('doctor_id', 'Please choose a doctor');
    }
    const doctor = await this.doctors
      .findOne({ id: doctorId, ...this.scope.groupFilter(user) })
      .select('id name prectange group_id specialtie_id')
      .lean();
    if (!doctor) {
      throw new NotFoundException('This doctor was not found');
    }

    const now = new Date();
    const start = query.start?.slice(0, 10) ?? toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = query.end?.slice(0, 10) ?? toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    if (end < start) {
      throw fieldError('end', 'The end of the period is before its start');
    }
    const from = startOfDay(start);
    const to = endOfDay(end);

    const [visits, payouts, patients, clinics, services, specialties] = await Promise.all([
      this.reservations
        .find({ doctor_id: doctor.id, group_id: doctor.group_id, status: { $nin: AWAY_STATUSES }, date: { $lte: to } })
        .select('id patient_id clinic_id service_id date time payments doctor_prectange status is_followup')
        .sort({ date: -1, id: -1 })
        .lean(),
      this.payouts
        .find({ doctor_id: doctor.id, group_id: doctor.group_id, paid_at: { $lte: to } })
        .sort({ paid_at: -1, id: -1 })
        .lean(),
      this.lookups.patientsById(),
      this.lookups.clinicsById(),
      this.lookups.servicesById(),
      this.lookups.specialtiesById(),
    ]);

    const share = (visit: (typeof visits)[number]) => money((paidOn(visit) * visit.doctor_prectange) / 100);
    const earlier = visits.filter((visit) => visit.date < from);
    const inPeriod = visits.filter((visit) => visit.date >= from);
    const paidEarlier = payouts.filter((payout) => payout.paid_at < from);
    const paidInPeriod = payouts.filter((payout) => payout.paid_at >= from);

    const opening = money(sum(earlier, share) - sum(paidEarlier, (payout) => payout.amount));
    const earned = sum(inPeriod, share);
    const paidOut = sum(paidInPeriod, (payout) => payout.amount);

    return {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        prectange: doctor.prectange,
        specializeName: specialties.get(doctor.specialtie_id)?.title ?? '',
      },
      start,
      end,
      opening,
      collected: sum(inPeriod, paidOn),
      share: earned,
      paid_out: paidOut,
      closing: money(opening + earned - paidOut),
      // Visits that brought money in, or were seen (a free follow-up earns nothing but counts)
      visits: inPeriod
        .filter((visit) => paidOn(visit) > 0 || visit.status === ReservationStatus.Completed)
        .map((visit) => ({
          id: visit.id,
          CustomDate: toDateString(new Date(visit.date)),
          time: visit.time,
          name: patients.get(visit.patient_id)?.name ?? '',
          clinicName: clinics.get(visit.clinic_id)?.name ?? '',
          serviceName: services.get(visit.service_id)?.name ?? '',
          status: visit.status,
          is_followup: visit.is_followup,
          paid: paidOn(visit),
          prectange: visit.doctor_prectange,
          share: share(visit),
        })),
      payouts: paidInPeriod.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        date: toDateString(new Date(payout.paid_at)),
        note: payout.note,
        recorded_by_name: payout.recorded_by_name,
      })),
    };
  }

  /** The owner records money paid to a doctor towards their share. */
  async addPayout(dto: AddPayoutDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    const doctor = await this.doctors.findOne({ id: dto.doctor_id, group_id: groupId }).select('id').lean();
    if (!doctor) {
      throw new NotFoundException('This doctor was not found');
    }

    const created = await this.payouts.create({
      id: await this.counters.next('payout'),
      group_id: groupId,
      doctor_id: doctor.id,
      amount: money(dto.amount),
      paid_at: dto.date ? parseDate(dto.date.slice(0, 10)) : new Date(),
      note: dto.note?.trim() ?? '',
      recorded_by_id: user.id,
      recorded_by_name: (await this.staffNames([user.id])).get(user.id) ?? '',
    });
    return created.toJSON();
  }

  /** Corrects a payout recorded by mistake. */
  async removePayout(id: number, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    const { deletedCount } = await this.payouts.deleteOne({ id, group_id: groupId });
    if (!deletedCount) {
      throw new NotFoundException('This payout was not found');
    }
    return { id };
  }
}
