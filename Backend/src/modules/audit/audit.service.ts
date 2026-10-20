import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { endOfDay, startOfDay } from '../../common/dates';
import { CountersService } from '../../counters/counters.service';
import { LookupsService } from '../../database/lookups.service';
import { Reservation } from '../reservations/reservation.schema';
import { Staff } from '../staff/staff.schema';
import { ActivityQueryDto } from './dto/activity.dto';
import { Activity } from './activity.schema';

const PAGE = 100;

export type ActivityEntry = Omit<Activity, 'id' | 'at'>;

type Row = Activity & { before: Record<string, unknown> | null; details: Record<string, unknown> };
const num = (value: unknown) => (typeof value === 'number' ? value : null);

/**
 * The activity log (سجل النشاط): written for every change and sign-in, read by
 * a group's owner (its own group) and by the platform (everything, or one group).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(Activity.name) private readonly model: Model<Activity>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
  ) {}

  /** Writes one entry. A failure to log never fails what is being logged. */
  async record(entry: ActivityEntry) {
    try {
      await this.model.create({ ...entry, id: await this.counters.next('activity'), at: new Date() });
    } catch (error) {
      this.logger.error(error);
    }
  }

  /**
   * A page of the log, newest first, with what each entry was about by name
   * (`target`) and where to open it (`link`), and the people in it for the
   * filter. The owner sees its group's; the platform everything, or one group.
   */
  async list(query: ActivityQueryDto, user: AuthUser) {
    const scope: FilterQuery<Activity> = {};
    if (user.group_id !== null) scope.group_id = user.group_id;
    else if (query.group_id) scope.group_id = query.group_id;

    const filter: FilterQuery<Activity> = { ...scope };
    if (query.category) filter.category = query.category;
    if (query.action) filter.action = query.action;
    if (query.actor) {
      const [role, id] = query.actor.split(':');
      filter.actor_role = role;
      filter.actor_id = +id;
    }
    if (query.start || query.end) {
      filter.at = {
        ...(query.start ? { $gte: startOfDay(query.start.slice(0, 10)) } : {}),
        ...(query.end ? { $lte: endOfDay(query.end.slice(0, 10)) } : {}),
      };
    }
    if (query.before) filter.id = { $lt: query.before };

    const [found, actors] = await Promise.all([
      this.model.find(filter).sort({ id: -1 }).limit(PAGE + 1).lean() as Promise<Row[]>,
      this.model.aggregate<{ _id: { role: string; id: number }; name: string }>([
        { $match: { ...scope, actor_id: { $ne: null } } },
        { $sort: { id: 1 } },
        { $group: { _id: { role: '$actor_role', id: '$actor_id' }, name: { $last: '$actor_name' } } },
        { $sort: { name: 1 } },
      ]),
    ]);
    const rows = found.slice(0, PAGE);
    const describe = await this.describer(rows);

    return {
      rows: rows.map((row) => ({ ...row, ...describe(row) })),
      next: found.length > PAGE ? rows[rows.length - 1].id : null,
      actors: actors.map((actor) => ({ key: `${actor._id.role}:${actor._id.id}`, role: actor._id.role, name: actor.name })),
    };
  }

  /** Names what each entry was about, from the live records or, for deleted ones, the snapshot. */
  private async describer(rows: Row[]) {
    const visitIds = rows.filter((row) => row.entity === 'reservation' && row.entity_id).map((row) => row.entity_id as number);
    const staffIds = rows.filter((row) => row.entity === 'staff' && row.entity_id).map((row) => row.entity_id as number);
    const [patients, doctors, clinics, services, groups, visits, staff] = await Promise.all([
      this.lookups.patientsById(),
      this.lookups.doctorsById(),
      this.lookups.clinicsById(),
      this.lookups.servicesById(),
      this.lookups.groupsById(),
      this.reservations.find({ id: { $in: visitIds } }).select('id patient_id').lean(),
      this.staff.find({ id: { $in: staffIds } }).select('id name').lean(),
    ]);
    const visitPatient = new Map(visits.map((visit) => [visit.id, visit.patient_id]));
    const staffName = new Map(staff.map((row) => [row.id, row.name]));

    return (row: Row): { target: string; link: string | null; clinicName: string; groupName: string } => {
      const id = row.entity_id;
      const before = row.before ?? {};
      const details = row.details ?? {};
      const named = (value: unknown) => (typeof value === 'string' && value ? value : '');
      let target = '';
      let link: string | null = null;

      switch (row.entity) {
        case 'reservation': {
          const patientId = (id && visitPatient.get(id)) ?? num(before.patient_id) ?? num(details.patient_id);
          target = [id ? `كشف #${id}` : '', patientId ? patients.get(patientId)?.name ?? '' : ''].filter(Boolean).join(' · ');
          link = id && visitPatient.has(id) ? `/reservations-list/${id}` : null;
          break;
        }
        case 'patient': {
          const patientId = id ?? num(before.patient_id);
          target = (patientId && patients.get(patientId)?.name) || named(before.name) || named(details.name);
          if (before.file_name || details.file_name) target += ` · ${named(before.title) || named(before.file_name) || named(details.file_name)}`;
          link = patientId && patients.has(patientId) ? `/patients-list/${patientId}` : null;
          break;
        }
        case 'doctor':
        case 'schedule': {
          const doctorId = id ?? num(before.doctor_id) ?? num(details.doctor_id);
          target = (doctorId && doctors.get(doctorId)?.name) || named(before.name) || named(details.name);
          if (row.entity === 'schedule' && details.date) target += ` · ${details.date}`;
          link = doctorId && doctors.has(doctorId) ? `/doctors-list/${doctorId}` : null;
          break;
        }
        case 'staff':
          target = (id && staffName.get(id)) || named(before.name) || named(details.name);
          break;
        case 'clinic':
          target = (id && clinics.get(id)?.name) || named(before.name) || named(details.name);
          link = id && clinics.has(id) ? `/clinics-list/${id}` : null;
          break;
        case 'service':
          target = (id && services.get(id)?.name) || named(before.name) || named(details.name);
          break;
        case 'group':
          target = (id && groups.get(id)?.name) || named(before.name) || named(details.name);
          break;
        case 'list':
          target = named(before.title) || named(details.title);
          break;
      }

      return {
        target,
        link,
        clinicName: row.clinic_id ? clinics.get(row.clinic_id)?.name ?? '' : '',
        groupName: row.group_id ? groups.get(row.group_id)?.name ?? '' : '',
      };
    };
  }
}
