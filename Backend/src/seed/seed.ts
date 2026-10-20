import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { startOfDay, toDateString, toTimeString } from '../common/dates';
import { Counter } from '../counters/counter.schema';
import { Admin } from '../modules/admins/admin.schema';
import { hashPassword } from '../modules/auth/auth.service';
import { Clinic } from '../modules/clinics/clinic.schema';
import { Doctor } from '../modules/doctors/doctor.schema';
import { FollowupRule, Group, GroupStatus } from '../modules/groups/group.schema';
import { DoctorPayout } from '../modules/finance/payout.schema';
import { PatientAttachment } from '../modules/medical/attachment.schema';
import { Patient } from '../modules/patients/patient.schema';
import { Provider } from '../modules/providers/provider.schema';
import { followupApplies, followupPrice, queueNumbers } from '../modules/reservations/followup';
import { AWAY_STATUSES, BookingType, Payment, Reservation, ReservationStatus } from '../modules/reservations/reservation.schema';
import { WeeklyPeriod, hoursOn, withinHours } from '../modules/schedules/hours';
import { DoctorSchedule, ScheduleException } from '../modules/schedules/schedule.schema';
import { Service } from '../modules/services/service.schema';
import { Specialty } from '../modules/specialties/specialty.schema';
import { Staff, StaffRole } from '../modules/staff/staff.schema';

/** Shared by every demo account below - local development only. */
const DEMO_PASSWORD = 'Mssm@2026';
const logger = new Logger('Seed');

/** Deterministic pseudo-random generator, so reseeding produces the same dataset. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const random = makeRandom(20261019);
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

/** Hands out ids per collection while building rows, then seeds the counters. */
const ids = new Map<string, number>();
const nextId = (name: string) => {
  const id = (ids.get(name) ?? 0) + 1;
  ids.set(name, id);
  return id;
};

/** A local time on a day relative to today: `at(-3, 18, 30)` is 18:30 three days ago. */
function at(dayOffset: number, hours: number, minutes = 0): Date {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

/** Saturday to Thursday - Friday is the usual day off. */
const WORK_WEEK = [6, 0, 1, 2, 3, 4];

/** A doctor's hours at one branch: the same periods on every working day. */
const weekly = (...periods: Array<[string, string]>): WeeklyPeriod[] =>
  WORK_WEEK.flatMap((weekday) => periods.map(([start, end]) => ({ weekday, start, end })));

const GENERAL = {
  specialties: ['باطنة', 'أطفال', 'جلدية'],
  services: [
    { name: 'كشف', price: 300 },
    { name: 'استشارة (إعادة)', price: 150 },
    { name: 'سونار', price: 400 },
  ],
  providers: ['فيسبوك', 'ترشيح من صديق', 'جوجل ماب'],
};

const DENTAL = {
  specialties: ['تقويم أسنان', 'علاج جذور', 'تجميل أسنان'],
  services: [
    { name: 'كشف أسنان', price: 250 },
    { name: 'حشو عصب', price: 1200 },
    { name: 'تنظيف جير', price: 500 },
    { name: 'تبييض', price: 2000 },
  ],
  providers: ['فيسبوك', 'انستجرام', 'ترشيح من صديق'],
};

/** Where a patient is in today's queue. */
type QueueState = 'seen' | 'with_doctor' | 'waiting' | 'waiting_part_paid' | 'waiting_unpaid' | 'not_arrived';

interface GroupSpec {
  name: string;
  phone: string;
  status: string;
  owner: { name: string; email: string };
  catalog: typeof GENERAL;
  /** `service` names the service that counts as the full visit. */
  followup: { days: number; mode: string; value: number; service: string };
  branches: Array<{ key: string; name: string; phone: string; branch: string; receptionist: { name: string; email: string } }>;
  /** `hours` per branch key; appointments last `slot` minutes (20 by default). */
  doctors: Array<{
    name: string;
    email: string;
    prectange: number;
    branches: string[];
    slot?: number;
    hours: Record<string, WeeklyPeriod[]>;
  }>;
  patients: string[];
  /** Past visits per branch, on random days. */
  randomVisits: number;
  /** Visits placed on purpose, to show the re-visit rule (patients by index). */
  history: Array<{ branch: string; doctor: string; patient: number; service: string; day: number; hour: number }>;
  /** Today's queues, one per branch and doctor, in turn order. */
  today: Array<{
    branch: string;
    doctor: string;
    from: number;
    visits: Array<{ patient: number; state: QueueState; service?: string; booked?: boolean; discount?: number }>;
  }>;
  /** Bookings for the coming days, each on a slot of the doctor's hours. */
  upcoming: Array<{ branch: string; doctor: string; patient: number; day: number; time: string; pay: number }>;
  /** Dates set apart from the weekly hours, `day` days from today. */
  exceptions: Array<{ branch: string; doctor: string; day: number; closed: boolean; hours?: Array<[string, string]>; note: string }>;
  /** Medical backgrounds, by patient index, as a doctor left them. */
  medical?: Array<{ patient: number; doctor: string; chronic: string[]; allergies: string[]; medications: string[]; notes?: string }>;
  /** Past bookings the patient never came to (لم يحضر). */
  noShows?: Array<{ branch: string; doctor: string; patient: number; day: number; time: string }>;
  /** Money the owner paid doctors towards their share, `day` days from today. */
  payouts?: Array<{ doctor: string; day: number; amount: number; note: string }>;
}

/**
 * The platform owner sees all three groups:
 *   النور  - two branches, one doctor (Karim) working at both, a re-visit across branches
 *   الشفاء - a single dental branch, with a different re-visit rule
 *   الأمل  - suspended: nobody in it can sign in
 */
const GROUPS: GroupSpec[] = [
  {
    name: 'مجموعة عيادات النور',
    phone: '01001234567',
    status: GroupStatus.Active,
    owner: { name: 'د. أحمد النور', email: 'nour@mssm.test' },
    catalog: GENERAL,
    followup: { days: 14, mode: 'free', value: 0, service: 'كشف' },
    branches: [
      {
        key: 'nasr',
        name: 'فرع مدينة نصر',
        phone: '01001234567',
        branch: '12 شارع عباس العقاد، مدينة نصر، القاهرة',
        receptionist: { name: 'سلمى عبد الله', email: 'reception.nasrcity@mssm.test' },
      },
      {
        key: 'maadi',
        name: 'فرع المعادي',
        phone: '01112345678',
        branch: 'شارع 9، المعادي، القاهرة',
        receptionist: { name: 'ريم مصطفى', email: 'reception.maadi@mssm.test' },
      },
    ],
    doctors: [
      // Mornings at Nasr City, evenings at Maadi.
      {
        name: 'د. كريم حسن',
        email: 'karim@mssm.test',
        prectange: 50,
        branches: ['nasr', 'maadi'],
        hours: { nasr: weekly(['10:00', '14:00']), maadi: weekly(['16:00', '21:00']) },
      },
      { name: 'د. منى عادل', email: 'mona@mssm.test', prectange: 40, branches: ['nasr'], hours: { nasr: weekly(['11:00', '15:00']) } },
      { name: 'د. هالة رمزي', email: 'hala@mssm.test', prectange: 45, branches: ['maadi'], hours: { maadi: weekly(['12:00', '16:00']) } },
      { name: 'د. عمرو شوقي', email: 'amr@mssm.test', prectange: 50, branches: ['maadi'], hours: { maadi: weekly(['17:00', '21:00']) } },
    ],
    patients: [
      'يوسف إبراهيم', 'نورهان سعيد', 'محمود عادل', 'ملك حسن', 'عمر خالد', 'دينا مجدي', 'زياد أشرف',
      'فاطمة الزهراء', 'كريم وليد', 'سلمى نبيل', 'أدهم شريف', 'هنا ياسر', 'مصطفى جمال', 'رنا طارق',
    ],
    randomVisits: 22,
    history: [
      // Back within 14 days of a full visit: free.
      { branch: 'nasr', doctor: 'karim@mssm.test', patient: 0, service: 'كشف', day: -12, hour: 13 },
      { branch: 'nasr', doctor: 'karim@mssm.test', patient: 0, service: 'كشف', day: -1, hour: 14 },
      // Back after 18 days: full price again.
      { branch: 'maadi', doctor: 'hala@mssm.test', patient: 1, service: 'كشف', day: -20, hour: 17 },
      { branch: 'maadi', doctor: 'hala@mssm.test', patient: 1, service: 'كشف', day: -2, hour: 18 },
      // Seen at Nasr City; comes back to the same doctor at Maadi today (below).
      { branch: 'nasr', doctor: 'karim@mssm.test', patient: 2, service: 'كشف', day: -4, hour: 12 },
    ],
    today: [
      {
        branch: 'nasr',
        doctor: 'karim@mssm.test',
        from: 10,
        visits: [
          { patient: 3, state: 'seen', discount: 50 },
          { patient: 4, state: 'seen', booked: true },
          { patient: 5, state: 'with_doctor', booked: true },
          { patient: 6, state: 'waiting_part_paid' },
          { patient: 7, state: 'waiting_unpaid' },
          { patient: 8, state: 'not_arrived', booked: true },
        ],
      },
      {
        branch: 'maadi',
        doctor: 'karim@mssm.test',
        from: 16,
        visits: [
          { patient: 2, state: 'seen', service: 'كشف', booked: true },
          { patient: 9, state: 'with_doctor' },
          { patient: 10, state: 'waiting' },
        ],
      },
      {
        branch: 'nasr',
        doctor: 'mona@mssm.test',
        from: 11,
        visits: [
          { patient: 11, state: 'seen' },
          { patient: 12, state: 'with_doctor', booked: true },
          { patient: 13, state: 'waiting' },
        ],
      },
      {
        branch: 'maadi',
        doctor: 'hala@mssm.test',
        from: 12,
        visits: [
          { patient: 3, state: 'with_doctor' },
          { patient: 4, state: 'not_arrived', booked: true },
        ],
      },
    ],
    upcoming: [
      { branch: 'nasr', doctor: 'karim@mssm.test', patient: 5, day: 1, time: '12:00', pay: 0.5 },
      { branch: 'maadi', doctor: 'amr@mssm.test', patient: 6, day: 2, time: '18:00', pay: 0 },
      { branch: 'maadi', doctor: 'karim@mssm.test', patient: 7, day: 4, time: '19:40', pay: 0 },
    ],
    exceptions: [
      { branch: 'nasr', doctor: 'mona@mssm.test', day: 3, closed: true, note: 'إجازة' },
      { branch: 'maadi', doctor: 'karim@mssm.test', day: 2, closed: false, hours: [['18:00', '22:00']], note: 'مواعيد متأخرة' },
    ],
    medical: [
      {
        patient: 0,
        doctor: 'karim@mssm.test',
        chronic: ['سكر', 'ضغط'],
        allergies: ['بنسلين'],
        medications: ['جلوكوفاج 500 مجم مرتين يومياً', 'كونكور 5 مجم صباحاً'],
        notes: 'متابعة السكر التراكمي كل 3 شهور',
      },
      { patient: 2, doctor: 'karim@mssm.test', chronic: ['ربو'], allergies: [], medications: ['فنتولين بخاخ عند اللزوم'] },
      { patient: 5, doctor: 'mona@mssm.test', chronic: [], allergies: ['أسبرين', 'سلفا'], medications: [] },
    ],
    // Karim was paid last month's share, and something on account this month.
    payouts: [
      { doctor: 'karim@mssm.test', day: -25, amount: 1500, note: 'مستحقات الشهر اللي فات' },
      { doctor: 'karim@mssm.test', day: -3, amount: 500, note: 'دفعة تحت الحساب' },
    ],
    // Ziad (in today's queue) missed two bookings; Karim Waleed one.
    noShows: [
      { branch: 'nasr', doctor: 'karim@mssm.test', patient: 6, day: -9, time: '11:00' },
      { branch: 'maadi', doctor: 'hala@mssm.test', patient: 6, day: -16, time: '13:00' },
      { branch: 'nasr', doctor: 'mona@mssm.test', patient: 8, day: -5, time: '12:00' },
    ],
  },
  {
    name: 'عيادة الشفاء للأسنان',
    phone: '01223456789',
    status: GroupStatus.Active,
    owner: { name: 'د. سامح فوزي', email: 'shefa@mssm.test' },
    catalog: DENTAL,
    followup: { days: 7, mode: 'fixed', value: 100, service: 'كشف أسنان' },
    branches: [
      {
        key: 'dokki',
        name: 'فرع الدقي',
        phone: '01223456789',
        branch: 'شارع التحرير، الدقي، الجيزة',
        receptionist: { name: 'ندى إبراهيم', email: 'reception.dokki@mssm.test' },
      },
    ],
    doctors: [
      // A split day: mornings and evenings.
      {
        name: 'د. طارق سليم',
        email: 'tarek@mssm.test',
        prectange: 60,
        branches: ['dokki'],
        hours: { dokki: weekly(['10:00', '14:00'], ['17:00', '20:00']) },
      },
      {
        name: 'د. ياسمين فريد',
        email: 'yasmin@mssm.test',
        prectange: 55,
        branches: ['dokki'],
        slot: 30,
        hours: { dokki: weekly(['13:00', '18:00']) },
      },
    ],
    patients: ['علي محمد', 'جنى أحمد', 'حسام الدين', 'مريم سامي', 'عمر خالد', 'هنا ياسر', 'ملك حسن', 'زياد أشرف'],
    medical: [
      { patient: 0, doctor: 'tarek@mssm.test', chronic: ['سكر'], allergies: ['ليدوكايين (بنج موضعي)'], medications: ['أماريل 2 مجم صباحاً'] },
    ],
    randomVisits: 26,
    history: [
      { branch: 'dokki', doctor: 'tarek@mssm.test', patient: 0, service: 'كشف أسنان', day: -5, hour: 13 },
      { branch: 'dokki', doctor: 'tarek@mssm.test', patient: 0, service: 'كشف أسنان', day: -1, hour: 15 },
      { branch: 'dokki', doctor: 'yasmin@mssm.test', patient: 1, service: 'كشف أسنان', day: -15, hour: 17 },
      { branch: 'dokki', doctor: 'yasmin@mssm.test', patient: 1, service: 'كشف أسنان', day: -3, hour: 18 },
      { branch: 'dokki', doctor: 'tarek@mssm.test', patient: 2, service: 'كشف أسنان', day: -3, hour: 12 },
    ],
    today: [
      {
        branch: 'dokki',
        doctor: 'tarek@mssm.test',
        from: 10,
        visits: [
          { patient: 3, state: 'seen' },
          { patient: 2, state: 'seen', service: 'كشف أسنان', booked: true },
          { patient: 4, state: 'with_doctor' },
          { patient: 5, state: 'waiting_part_paid', booked: true },
          { patient: 6, state: 'not_arrived', booked: true },
        ],
      },
      { branch: 'dokki', doctor: 'yasmin@mssm.test', from: 13, visits: [{ patient: 7, state: 'waiting_unpaid' }] },
    ],
    upcoming: [
      { branch: 'dokki', doctor: 'tarek@mssm.test', patient: 3, day: 1, time: '18:00', pay: 0.5 },
      { branch: 'dokki', doctor: 'yasmin@mssm.test', patient: 4, day: 3, time: '15:00', pay: 0 },
    ],
    exceptions: [],
  },
  {
    name: 'مركز الأمل الطبي',
    phone: '01500000001',
    status: GroupStatus.Suspended,
    owner: { name: 'د. وائل منصور', email: 'amal@mssm.test' },
    catalog: GENERAL,
    followup: { days: 10, mode: 'percent', value: 50, service: 'كشف' },
    branches: [
      {
        key: 'helwan',
        name: 'فرع حلوان',
        phone: '01500000002',
        branch: 'شارع منصور، حلوان، القاهرة',
        receptionist: { name: 'إيمان رضا', email: 'reception.helwan@mssm.test' },
      },
    ],
    doctors: [
      { name: 'د. شريف عزت', email: 'sherif@mssm.test', prectange: 50, branches: ['helwan'], hours: { helwan: weekly(['10:00', '14:00']) } },
    ],
    patients: ['حازم فتحي', 'منة الله', 'سيف علاء', 'روان حمدي'],
    randomVisits: 8,
    history: [],
    today: [],
    upcoming: [],
    exceptions: [],
  },
];

const ADDRESSES = ['مدينة نصر', 'المعادي', 'الدقي', 'مصر الجديدة', 'الشيخ زايد', 'حلوان', 'شبرا'];
const DIAGNOSES = ['التهاب حلق', 'نزلة برد', 'حساسية جلد', 'متابعة دورية', 'التهاب لثة', 'تسوس', ''];

/** Cash dominates at an Egyptian front desk; the rest is spread over the other methods. */
const METHODS = ['cash', 'cash', 'cash', 'cash', 'cash', 'cash', 'instapay', 'instapay', 'vodafone_cash', 'card'];

/** A visit before pricing, queue numbers and payments are worked out. */
interface Draft {
  clinic_id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  date: Date;
  /** Empty for a booking made for a day with no set time. */
  time?: string;
  booking_type: string;
  status: string;
  arrived_at: Date | null;
  called_at: Date | null;
  /** Share of the net price paid so far: 1 all of it, 0.5 half, 0 nothing. */
  pay: number;
  discount?: number;
}

/** The status, arrival and payment of a visit at `date` in a given queue state. */
function stateAt(state: QueueState, date: Date): Pick<Draft, 'status' | 'arrived_at' | 'called_at' | 'pay'> {
  switch (state) {
    case 'seen':
      return { status: ReservationStatus.Completed, arrived_at: addMinutes(date, -20), called_at: date, pay: 1 };
    case 'with_doctor':
      return { status: ReservationStatus.Pending, arrived_at: addMinutes(date, -15), called_at: date, pay: 1 };
    case 'waiting':
      return { status: ReservationStatus.Pending, arrived_at: date, called_at: null, pay: 1 };
    case 'waiting_part_paid':
      return { status: ReservationStatus.Pending, arrived_at: date, called_at: null, pay: 0.5 };
    case 'waiting_unpaid':
      return { status: ReservationStatus.Pending, arrived_at: date, called_at: null, pay: 0 };
    default:
      return { status: ReservationStatus.Pending, arrived_at: null, called_at: null, pay: 0 };
  }
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const model = <T>(token: string): Model<T> => app.get<Model<T>>(getModelToken(token));

  const admins = model<Admin>(Admin.name);
  const groups = model<Group>(Group.name);
  const staff = model<Staff>(Staff.name);
  const clinics = model<Clinic>(Clinic.name);
  const doctors = model<Doctor>(Doctor.name);
  const patients = model<Patient>(Patient.name);
  const providers = model<Provider>(Provider.name);
  const reservations = model<Reservation>(Reservation.name);
  const services = model<Service>(Service.name);
  const specialties = model<Specialty>(Specialty.name);
  const counters = model<Counter>(Counter.name);
  const schedules = model<DoctorSchedule>(DoctorSchedule.name);
  const exceptions = model<ScheduleException>(ScheduleException.name);
  const attachments = model<PatientAttachment>(PatientAttachment.name);
  const payouts = model<DoctorPayout>(DoctorPayout.name);

  const database = admins.db.name;
  logger.log(`Clearing database "${database}"...`);
  const collections: Model<any>[] = [
    admins, groups, staff, clinics, doctors, patients, providers, reservations, services, specialties, counters,
    schedules, exceptions, attachments, payouts,
  ];
  // A clean slate: dropping the database also clears collections and indexes
  // left over from older shapes of the data; the indexes are then rebuilt from
  // the current schemas.
  await admins.db.dropDatabase();
  await Promise.all(collections.map((collection) => collection.syncIndexes()));

  const password = await hashPassword(DEMO_PASSWORD);

  // --- The platform owner ----------------------------------------------------
  await admins.create({ id: nextId('admin'), name: 'MSSM Solutions', email: 'super@mssm.test', password });

  let reservationCount = 0;

  for (const spec of GROUPS) {
    const groupId = nextId('group');
    const owned = { group_id: groupId };

    // --- The group's price list and lists ------------------------------------
    const specialtyRows = spec.catalog.specialties.map((title) => ({ id: nextId('specialty'), title, ...owned }));
    const serviceRows = spec.catalog.services.map((row) => ({ id: nextId('service'), ...row, ...owned }));
    const providerRows = spec.catalog.providers.map((title) => ({ id: nextId('provider'), title, ...owned }));
    const serviceNamed = (name: string) => serviceRows.find((row) => row.name === name);

    const rule: FollowupRule = {
      enabled: true,
      days: spec.followup.days,
      mode: spec.followup.mode,
      value: spec.followup.value,
      service_ids: [serviceNamed(spec.followup.service).id],
    };

    await groups.create({ id: groupId, name: spec.name, phone: spec.phone, status: spec.status, followup: rule });
    await specialties.insertMany(specialtyRows);
    await services.insertMany(serviceRows);
    await providers.insertMany(providerRows);

    // --- Branches, their receptionists, and the owner --------------------------
    const branchRows = spec.branches.map((row) => ({
      ...owned,
      id: nextId('clinic'),
      key: row.key,
      name: row.name,
      phone: row.phone,
      branch: row.branch,
      receptionist: row.receptionist,
    }));
    await clinics.insertMany(branchRows.map(({ key: _key, receptionist: _desk, ...row }) => row));
    const branchId = (key: string) => branchRows.find((row) => row.key === key).id;

    const ownerId = nextId('staff');
    const deskIds = new Map<number, number>();
    await staff.create({
      ...owned,
      id: ownerId,
      role: StaffRole.Owner,
      clinic_ids: [],
      name: spec.owner.name,
      email: spec.owner.email,
      phone: `010${between(10000000, 99999999)}`,
      password,
    });
    for (const branch of branchRows) {
      const id = nextId('staff');
      deskIds.set(branch.id, id);
      await staff.create({
        ...owned,
        id,
        role: StaffRole.Receptionist,
        clinic_ids: [branch.id],
        name: branch.receptionist.name,
        email: branch.receptionist.email,
        phone: `011${between(10000000, 99999999)}`,
        password,
      });
    }

    // --- Doctors, each at one or more branches ---------------------------------
    const doctorRows = spec.doctors.map((row, i) => ({
      ...owned,
      id: nextId('doctor'),
      name: row.name,
      email: row.email,
      prectange: row.prectange,
      phone: `010${between(10000000, 99999999)}`,
      specialtie_id: specialtyRows[i % specialtyRows.length].id,
      clinic_ids: row.branches.map(branchId),
      password,
    }));
    await doctors.insertMany(doctorRows);
    const doctorEmailed = (email: string) => doctorRows.find((row) => row.email === email);

    // --- Their working hours at each branch ---------------------------------------
    const scheduleRows = spec.doctors.flatMap((row) =>
      Object.entries(row.hours).map(([branch, hours]) => ({
        ...owned,
        doctor_id: doctorEmailed(row.email).id,
        clinic_id: branchId(branch),
        slot_minutes: row.slot ?? 20,
        hours,
      })),
    );
    await schedules.insertMany(scheduleRows);
    const scheduleOf = (doctorId: number, clinicId: number) =>
      scheduleRows.find((row) => row.doctor_id === doctorId && row.clinic_id === clinicId);

    const exceptionRows = spec.exceptions.map((row) => ({
      ...owned,
      doctor_id: doctorEmailed(row.doctor).id,
      clinic_id: branchId(row.branch),
      date: toDateString(at(row.day, 0)),
      closed: row.closed,
      hours: (row.hours ?? []).map(([start, end]) => ({ start, end })),
      note: row.note,
    }));

    // --- Patients: one file per patient for the whole group ---------------------
    const background = (i: number) => {
      const row = spec.medical?.find((item) => item.patient === i);
      if (!row) return {};
      const { patient: _patient, doctor, notes, ...lists } = row;
      return {
        medical: { ...lists, notes: notes ?? '', updated_at: at(-3, 12), updated_by: spec.doctors.find((d) => d.email === doctor).name },
      };
    };
    const patientRows = spec.patients.map((name, i) => ({
      ...owned,
      id: nextId('patient'),
      name,
      phone: `01${pick(['0', '1', '2', '5'])}${between(10000000, 99999999)}`,
      sex: i % 2 === 0 ? 'ذكر' : 'انثي',
      age: between(4, 70),
      address: `${pick(ADDRESSES)}، القاهرة`,
      provider_id: pick(providerRows).id,
      registered_clinic_id: pick(branchRows).id,
      ...background(i),
    }));
    await patients.insertMany(patientRows);

    // --- Visits ----------------------------------------------------------------
    const drafts: Draft[] = [];
    // The first three patients are kept out of the random history so the
    // re-visit examples price the way their comments say.
    const pool = patientRows.length > 3 ? patientRows.slice(3) : patientRows;

    // Past visits over the last 60 days, so the default "current month" view
    // and the date pickers have something to show.
    for (const branch of branchRows) {
      const here = doctorRows.filter((doctor) => doctor.clinic_ids.includes(branch.id));
      for (let i = 0; i < spec.randomVisits; i++) {
        const date = at(-between(1, 59), between(12, 21), pick([0, 15, 30, 45]));
        const canceled = random() < 0.25;
        drafts.push({
          clinic_id: branch.id,
          patient_id: pick(pool).id,
          doctor_id: pick(here).id,
          service_id: pick(serviceRows).id,
          date,
          booking_type: pick([BookingType.Booked, BookingType.WalkIn]),
          ...(canceled
            ? { status: ReservationStatus.Canceled, arrived_at: null, called_at: null, pay: 0 }
            : { ...stateAt('seen', date), pay: pick([1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0]) }),
        });
      }
    }

    for (const visit of spec.history) {
      const date = at(visit.day, visit.hour);
      drafts.push({
        clinic_id: branchId(visit.branch),
        patient_id: patientRows[visit.patient].id,
        doctor_id: doctorEmailed(visit.doctor).id,
        service_id: serviceNamed(visit.service).id,
        date,
        booking_type: BookingType.Booked,
        ...stateAt('seen', date),
      });
    }

    for (const queue of spec.today) {
      queue.visits.forEach((visit, i) => {
        const date = at(0, queue.from, i * 20);
        drafts.push({
          clinic_id: branchId(queue.branch),
          patient_id: patientRows[visit.patient].id,
          doctor_id: doctorEmailed(queue.doctor).id,
          service_id: visit.service ? serviceNamed(visit.service).id : pick(serviceRows).id,
          date,
          booking_type: visit.booked ? BookingType.Booked : BookingType.WalkIn,
          discount: visit.discount,
          ...stateAt(visit.state, date),
        });
      });
    }

    // Bookings for the coming days - one left a deposit.
    for (const missed of spec.noShows ?? []) {
      drafts.push({
        clinic_id: branchId(missed.branch),
        patient_id: patientRows[missed.patient].id,
        doctor_id: doctorEmailed(missed.doctor).id,
        service_id: serviceNamed(spec.followup.service).id,
        date: at(missed.day, +missed.time.slice(0, 2), +missed.time.slice(3)),
        time: missed.time,
        booking_type: BookingType.Booked,
        status: ReservationStatus.NoShow,
        arrived_at: null,
        called_at: null,
        pay: 0,
      });
    }

    for (const booking of spec.upcoming) {
      drafts.push({
        clinic_id: branchId(booking.branch),
        patient_id: patientRows[booking.patient].id,
        doctor_id: doctorEmailed(booking.doctor).id,
        service_id: serviceNamed(spec.followup.service).id,
        date: at(booking.day, +booking.time.slice(0, 2), +booking.time.slice(3)),
        time: booking.time,
        booking_type: BookingType.Booked,
        ...stateAt('not_arrived', new Date()),
        pay: booking.pay,
      });
    }

    // Today's and upcoming visits must sit in the doctor's hours. The demo is
    // seeded relative to today, so when one lands on a Friday that day becomes
    // an extra working day with the doctor's usual hours.
    for (const draft of drafts.filter((row) => row.date >= startOfDay(new Date()))) {
      const day = toDateString(draft.date);
      const schedule = scheduleOf(draft.doctor_id, draft.clinic_id);
      const exception = exceptionRows.find(
        (row) => row.doctor_id === draft.doctor_id && row.clinic_id === draft.clinic_id && row.date === day,
      );
      if (withinHours(draft.time ?? toTimeString(draft.date), hoursOn(day, schedule.hours, exception))) continue;
      if (exception) throw new Error(`Seed: a visit on ${day} falls outside that day's set hours`);

      const usual = schedule.hours.filter((period) => period.weekday === schedule.hours[0].weekday);
      exceptionRows.push({
        ...owned,
        doctor_id: draft.doctor_id,
        clinic_id: draft.clinic_id,
        date: day,
        closed: false,
        hours: usual.map(({ start, end }) => ({ start, end })),
        note: 'يوم إضافي',
      });
    }
    await exceptions.insertMany(exceptionRows);

    // Price, number and pay for each visit in the order they happened, so a
    // re-visit is priced against the visits before it - at any branch of the
    // group - as the API would.
    drafts.sort((a, b) => a.date.getTime() - b.date.getTime());
    const rows: Reservation[] = [];

    for (const draft of drafts) {
      const service = serviceRows.find((row) => row.id === draft.service_id);
      const doctor = doctorRows.find((row) => row.id === draft.doctor_id);

      let price = service.price;
      let followupOf: number | null = null;
      if (followupApplies(rule, service.id)) {
        const since = startOfDay(draft.date);
        since.setDate(since.getDate() - rule.days);
        const previous = rows
          .filter(
            (row) =>
              row.patient_id === draft.patient_id &&
              row.doctor_id === draft.doctor_id &&
              rule.service_ids.includes(row.service_id) &&
              !row.is_followup &&
              !AWAY_STATUSES.includes(row.status) &&
              row.date >= since,
          )
          .pop();
        if (previous) {
          price = followupPrice(rule, service.price);
          followupOf = previous.id;
        }
      }

      const discount = Math.min(draft.discount ?? 0, price);
      const net = price - discount;
      const amount = draft.pay === 1 ? net : Math.round((net * draft.pay) / 10) * 10;

      // Most payments are taken by the branch's receptionist, a few by the owner.
      const byOwner = random() < 0.2;
      const payments: Payment[] =
        amount > 0
          ? [
              {
                id: nextId('payment'),
                amount,
                method: pick(METHODS),
                // A deposit on a future booking was left the day before.
                paid_at: draft.arrived_at ?? addMinutes(draft.date, -60 * 24),
                recorded_by_role: byOwner ? StaffRole.Owner : StaffRole.Receptionist,
                recorded_by_id: byOwner ? ownerId : deskIds.get(draft.clinic_id),
              },
            ]
          : [];

      rows.push({
        ...owned,
        id: nextId('reservation'),
        clinic_id: draft.clinic_id,
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id,
        service_id: draft.service_id,
        price,
        service_price: service.price,
        doctor_prectange: doctor.prectange,
        date: draft.date,
        time: draft.time ?? toTimeString(draft.date),
        outside_hours: false,
        reminded_at: null,
        booking_type: draft.booking_type,
        queue_number: 0,
        arrived_at: draft.arrived_at,
        called_at: draft.called_at,
        is_followup: followupOf !== null,
        followup_of: followupOf,
        followup_waived: false,
        discount,
        payments,
        Diagnosis: draft.status === ReservationStatus.Completed ? pick(DIAGNOSES) : '',
        status: draft.status,
      });
    }

    // Each day's queue is numbered by appointment time, as the API does.
    const queues = new Map<string, Reservation[]>();
    for (const row of rows) {
      const key = `${row.clinic_id}:${row.doctor_id}:${toDateString(row.date)}`;
      queues.set(key, [...(queues.get(key) ?? []), row]);
    }
    for (const visits of queues.values()) {
      const numbers = queueNumbers(visits);
      for (const row of visits) row.queue_number = numbers.get(row.id);
    }

    await reservations.insertMany(rows);

    await payouts.insertMany(
      (spec.payouts ?? []).map((payout) => ({
        ...owned,
        id: nextId('payout'),
        doctor_id: doctorEmailed(payout.doctor).id,
        amount: payout.amount,
        paid_at: at(payout.day, 13),
        note: payout.note,
        recorded_by_id: ownerId,
        recorded_by_name: spec.owner.name,
      })),
    );
    reservationCount += rows.length;
  }

  // --- Counters -------------------------------------------------------------
  // Start each sequence past the seeded ids so new records never collide.
  await counters.insertMany([...ids].map(([name, seq]) => ({ name, seq })));

  logger.log('Seed complete.');
  logger.log(`  ${GROUPS.length} groups, ${ids.get('clinic')} branches, ${reservationCount} reservations`);
  logger.log('  Demo accounts and their shared password are listed in Backend/README.md');

  await app.close();
}

seed().catch((error) => {
  logger.error(error);
  process.exit(1);
});
