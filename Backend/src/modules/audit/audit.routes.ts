import { toDateString } from '../../common/dates';

/**
 * What each write route means for the activity log: an Arabic label, the
 * kind of record it touches, whether it's about money or access, and - for
 * edits and deletions - how to find and keep the record as it was before, so
 * "deleted visit #55" still says whose visit it was and what it cost.
 */

type Body = Record<string, unknown>;
type Doc = Record<string, unknown>;
export type Category = 'general' | 'money' | 'access';

export interface AuditRoute {
  label: string;
  action: 'create' | 'update' | 'delete' | 'action';
  entity: string;
  category?: Category | ((body: Body) => Category);
  before?: {
    /** The Mongoose model name, e.g. `Reservation`. */
    model: string;
    filter: (body: Body) => Record<string, unknown> | null;
    pick: (doc: Doc, body: Body) => Record<string, unknown> | null;
  };
  /** Which record the entry is about, when it isn't `body.id` or the result's `id`. */
  entityId?: (body: Body, result: Doc | null) => number | null;
  /** The platform's actions on a group belong to that group's log too. */
  groupFromEntity?: boolean;
}

const byId = (body: Body) => (typeof body.id === 'number' ? { id: body.id } : null);
const pick = (doc: Doc, keys: string[]) => Object.fromEntries(keys.filter((key) => key in doc).map((key) => [key, doc[key]]));
const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

const paidOn = (doc: Doc) =>
  ((doc.payments as Array<{ amount: number }>) ?? []).reduce((sum, payment) => sum + payment.amount, 0);

/** A visit as the log keeps it. */
const visit = (doc: Doc) => ({
  ...pick(doc, ['patient_id', 'doctor_id', 'service_id', 'clinic_id', 'status', 'time', 'discount', 'price', 'queue_number']),
  date: doc.date ? toDateString(new Date(doc.date as string)) : null,
  paid: paidOn(doc),
});

const money = (body: Body): Category =>
  (typeof body.paid === 'number' && body.paid > 0) || 'discount' in body ? 'money' : 'general';

export const AUDIT_ROUTES: Record<string, AuditRoute> = {
  // --- Visits ---
  'clinic/add-reservation': { label: 'حجز كشف', action: 'create', entity: 'reservation', category: money },
  'clinic/edit-reservation': {
    label: 'عدّل كشف',
    action: 'update',
    entity: 'reservation',
    category: (body) => ('discount' in body ? 'money' : 'general'),
    before: { model: 'Reservation', filter: byId, pick: visit },
  },
  'delete-reservation': {
    label: 'حذف كشف',
    action: 'delete',
    entity: 'reservation',
    category: 'money',
    before: { model: 'Reservation', filter: byId, pick: visit },
  },
  'doctor/update-reservations': {
    label: 'كتب التشخيص',
    action: 'update',
    entity: 'reservation',
    before: { model: 'Reservation', filter: byId, pick: (doc) => ({ Diagnosis: doc.Diagnosis ?? '', patient_id: doc.patient_id }) },
  },
  'check-in-reservation': { label: 'سجّل وصول مريض', action: 'action', entity: 'reservation' },
  'mark-reminded': { label: 'بعت تذكير على واتساب', action: 'action', entity: 'reservation' },
  'next-patient': {
    label: 'نادى المريض التالي',
    action: 'action',
    entity: 'reservation',
    entityId: (_body, result) => asNumber((result?.current as Doc | null)?.id),
  },
  'clinic/add-payment': { label: 'سجّل دفعة', action: 'create', entity: 'reservation', category: 'money' },
  'clinic/delete-payment': {
    label: 'حذف دفعة',
    action: 'delete',
    entity: 'reservation',
    category: 'money',
    before: {
      model: 'Reservation',
      filter: byId,
      pick: (doc, body) => {
        const payment = ((doc.payments as Doc[]) ?? []).find((row) => row.id === body.payment_id);
        return payment ? { ...pick(payment, ['amount', 'method', 'paid_at']), patient_id: doc.patient_id } : null;
      },
    },
  },

  // --- Patients and their medical file ---
  'clinic/add-patients': { label: 'سجّل مريض جديد', action: 'create', entity: 'patient' },
  'clinic/edit-patients': {
    label: 'عدّل بيانات مريض',
    action: 'update',
    entity: 'patient',
    before: { model: 'Patient', filter: byId, pick: (doc) => pick(doc, ['name', 'phone', 'sex', 'age', 'address', 'provider_id']) },
  },
  'delete-patient': {
    label: 'حذف ملف مريض',
    action: 'delete',
    entity: 'patient',
    before: { model: 'Patient', filter: byId, pick: (doc) => pick(doc, ['name', 'phone', 'age']) },
  },
  'patient-medical': {
    label: 'عدّل الملف الطبي',
    action: 'update',
    entity: 'patient',
    entityId: (body) => asNumber(body.patient_id),
    before: {
      model: 'Patient',
      filter: (body) => (typeof body.patient_id === 'number' ? { id: body.patient_id } : null),
      pick: (doc) => pick((doc.medical as Doc) ?? {}, ['chronic', 'allergies', 'medications', 'notes']),
    },
  },
  'patient-attachments': { label: 'أضاف ملف للمريض', action: 'create', entity: 'patient', entityId: (body) => asNumber(body.patient_id) },
  'delete-patient-attachment': {
    label: 'حذف ملف من ملف مريض',
    action: 'delete',
    entity: 'patient',
    entityId: () => null,
    before: { model: 'PatientAttachment', filter: byId, pick: (doc) => pick(doc, ['patient_id', 'title', 'file_name', 'kind']) },
  },

  // --- Doctors, their hours and payouts ---
  'clinic/add-doctors': { label: 'أضاف دكتور', action: 'create', entity: 'doctor' },
  'clinic/edit-doctors': {
    label: 'عدّل دكتور',
    action: 'update',
    entity: 'doctor',
    category: (body) => ('prectange' in body ? 'money' : 'general'),
    before: { model: 'Doctor', filter: byId, pick: (doc) => pick(doc, ['name', 'phone', 'email', 'prectange', 'specialtie_id', 'clinic_ids']) },
  },
  'delete-doctors': {
    label: 'حذف دكتور',
    action: 'delete',
    entity: 'doctor',
    before: { model: 'Doctor', filter: byId, pick: (doc) => pick(doc, ['name', 'email']) },
  },
  'update-doctor-password': { label: 'غيّر كلمة مرور دكتور', action: 'update', entity: 'doctor', category: 'access' },
  'doctor-schedule': {
    label: 'عدّل مواعيد دكتور الأسبوعية',
    action: 'update',
    entity: 'schedule',
    entityId: (body) => asNumber(body.doctor_id),
    before: {
      model: 'DoctorSchedule',
      filter: (body) => ({ doctor_id: body.doctor_id, clinic_id: body.clinic_id }),
      pick: (doc) => pick(doc, ['slot_minutes', 'hours']),
    },
  },
  'doctor-schedule-day': { label: 'غيّر مواعيد يوم لدكتور', action: 'update', entity: 'schedule', entityId: (body) => asNumber(body.doctor_id) },
  'reset-doctor-schedule-day': { label: 'رجّع يوم للجدول الأسبوعي', action: 'update', entity: 'schedule', entityId: (body) => asNumber(body.doctor_id) },
  'doctor-payout': { label: 'صرف مبلغ لدكتور', action: 'create', entity: 'doctor', category: 'money', entityId: (body) => asNumber(body.doctor_id) },
  'delete-doctor-payout': {
    label: 'حذف مبلغ مصروف لدكتور',
    action: 'delete',
    entity: 'doctor',
    category: 'money',
    entityId: () => null,
    before: { model: 'DoctorPayout', filter: byId, pick: (doc) => ({ ...pick(doc, ['doctor_id', 'amount', 'note']), paid_at: doc.paid_at }) },
  },

  // --- Front desk and branches ---
  'clinic/add-receptionist': { label: 'أضاف استقبال', action: 'create', entity: 'staff' },
  'clinic/edit-receptionist': {
    label: 'عدّل استقبال',
    action: 'update',
    entity: 'staff',
    before: { model: 'Staff', filter: byId, pick: (doc) => pick(doc, ['name', 'phone', 'email', 'clinic_ids']) },
  },
  'delete-receptionist': {
    label: 'حذف استقبال',
    action: 'delete',
    entity: 'staff',
    before: { model: 'Staff', filter: byId, pick: (doc) => pick(doc, ['name', 'email']) },
  },
  'update-receptionist-password': { label: 'غيّر كلمة مرور استقبال', action: 'update', entity: 'staff', category: 'access' },
  'add-clinic': { label: 'أضاف فرع', action: 'create', entity: 'clinic' },
  'edit-clinic': {
    label: 'عدّل فرع',
    action: 'update',
    entity: 'clinic',
    before: { model: 'Clinic', filter: byId, pick: (doc) => pick(doc, ['name', 'phone', 'branch', 'status']) },
  },
  'delete-clinic': {
    label: 'حذف فرع',
    action: 'delete',
    entity: 'clinic',
    before: { model: 'Clinic', filter: byId, pick: (doc) => pick(doc, ['name', 'branch']) },
  },

  // --- Prices and lists ---
  'clinic/services': { label: 'أضاف خدمة', action: 'create', entity: 'service', category: 'money' },
  'clinic/update-services': {
    label: 'عدّل خدمة او سعرها',
    action: 'update',
    entity: 'service',
    category: 'money',
    before: { model: 'Service', filter: byId, pick: (doc) => pick(doc, ['name', 'price']) },
  },
  'delete-services': {
    label: 'حذف خدمة',
    action: 'delete',
    entity: 'service',
    category: 'money',
    before: { model: 'Service', filter: byId, pick: (doc) => pick(doc, ['name', 'price']) },
  },
  'clinic/settings': { label: 'غيّر قاعدة الإعادة', action: 'update', entity: 'group', category: 'money' },
  'clinic/specialties': { label: 'أضاف تخصص', action: 'create', entity: 'list' },
  'delete-specialties': {
    label: 'حذف تخصص',
    action: 'delete',
    entity: 'list',
    before: { model: 'Specialty', filter: byId, pick: (doc) => pick(doc, ['title']) },
  },
  'clinic/providers': { label: 'أضاف "عرفنا عن طريق"', action: 'create', entity: 'list' },
  'delete-providers': {
    label: 'حذف "عرفنا عن طريق"',
    action: 'delete',
    entity: 'list',
    before: { model: 'Provider', filter: byId, pick: (doc) => pick(doc, ['title']) },
  },

  // --- Accounts ---
  'change-password': { label: 'غيّر كلمة المرور بتاعته', action: 'update', entity: 'session', category: 'access', entityId: () => null },

  // --- The platform managing groups ---
  'add-group': { label: 'أضاف مجموعة', action: 'create', entity: 'group', groupFromEntity: true },
  'edit-group': {
    label: 'عدّل مجموعة',
    action: 'update',
    entity: 'group',
    groupFromEntity: true,
    before: { model: 'Group', filter: byId, pick: (doc) => pick(doc, ['name', 'phone']) },
  },
  'group-status': {
    label: 'غيّر حالة مجموعة',
    action: 'update',
    entity: 'group',
    groupFromEntity: true,
    before: { model: 'Group', filter: byId, pick: (doc) => pick(doc, ['status']) },
  },
  'delete-group': {
    label: 'حذف مجموعة',
    action: 'delete',
    entity: 'group',
    groupFromEntity: true,
    before: { model: 'Group', filter: byId, pick: (doc) => pick(doc, ['name']) },
  },
  // The owner's group is read from the account, so the reset shows in that group's log too.
  'update-owner-password': {
    label: 'غيّر كلمة مرور صاحب مجموعة',
    action: 'update',
    entity: 'staff',
    category: 'access',
    before: { model: 'Staff', filter: byId, pick: (doc) => pick(doc, ['name', 'email', 'group_id']) },
  },
};
