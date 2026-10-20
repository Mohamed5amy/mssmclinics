// Smoke test for the MSSM backend: the platform -> group -> branch structure,
// every role's reach and limits, doctors' hours and booking into them, the
// queue, payments and the re-visit rule.
//
//   npm run seed     (the test expects the seeded demo data)
//   npm run dev      (in another terminal)
//   npm run smoke
//
// It finds seeded records by email or name, creates its own records and removes
// them again, so it can be re-run against the same seed.
import { readFileSync } from 'node:fs';

const API = process.env.API ?? 'http://localhost:4000/api/';
const seed = readFileSync(new URL('../src/seed/seed.ts', import.meta.url), 'utf8');
const PASSWORD = seed.match(/DEMO_PASSWORD = '([^']+)'/)[1];

let failures = 0;
const check = (label, ok, extra = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);
};
const section = (title) => console.log(`\n--- ${title}`);

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data, message: json.message, errors: json.errors, code: json.code, details: json.details };
}
const get = (path, token) => call('GET', path, token);
const post = (path, token, body) => call('POST', path, token, body);

const login = async (email, password = PASSWORD) => {
  const r = await post('login', null, { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.message}`);
  return r.data;
};

/** Local `YYYY-MM-DD`, `offset` days from today - the format the date inputs send. */
const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};
const ALL_TIME = 'start_date=2000-01-01&end_date=2100-01-01&';
/** The same periods on every day of the week. */
const everyDay = (...periods) => [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => periods.map(([start, end]) => ({ weekday, start, end })));
const ids = (rows) => (rows ?? []).map((row) => row.id).sort((a, b) => a - b).join();

// ---------------------------------------------------------------------------
section('Sign-in');
check('no token -> 401', (await get('list-clinic')).status === 401);
check('bad password -> 401', (await post('login', null, { email: 'super@mssm.test', password: 'nope' })).status === 401);
check('clinic accounts are gone (no clinic-login)', (await post('clinic-login', null, { email: 'x@y.z', password: 'x' })).status === 404);

const platform = await login('super@mssm.test');
const nour = await login('nour@mssm.test');
const shefa = await login('shefa@mssm.test');
const deskNasr = await login('reception.nasrcity@mssm.test');
const deskMaadi = await login('reception.maadi@mssm.test');
const karim = await login('karim@mssm.test');
const P = platform.api_token;
const O = nour.api_token;
const S = shefa.api_token;
const R = deskNasr.api_token;
const RM = deskMaadi.api_token;
const K = karim.api_token;

check('one form signs in every kind of account', [platform, nour, deskNasr, karim].map((a) => a.role).join() === 'admin,owner,receptionist,doctor');
check('owner gets its group, all branches', nour.group_id > 0 && nour.clinic_ids.length === 0 && nour.groupName === 'مجموعة عيادات النور');
check('receptionist gets its one branch', deskNasr.clinic_ids.length === 1 && deskNasr.clinicName === 'فرع مدينة نصر');
check('doctor gets every branch they work at', karim.clinic_ids.length === 2);
check('per-role endpoints still filter', (await post('doctor-login', null, { email: 'nour@mssm.test', password: PASSWORD })).status === 401 && (await post('admin-login', null, { email: 'nour@mssm.test', password: PASSWORD })).status === 200);
const suspended = await post('login', null, { email: 'amal@mssm.test', password: PASSWORD });
check('suspended group: owner refused', suspended.status === 403 && suspended.code === 'GROUP_SUSPENDED', JSON.stringify(suspended));
check('suspended group: receptionist refused', (await post('login', null, { email: 'reception.helwan@mssm.test', password: PASSWORD })).code === 'GROUP_SUSPENDED');
check('suspended group: doctor refused', (await post('login', null, { email: 'sherif@mssm.test', password: PASSWORD })).code === 'GROUP_SUSPENDED');

const branches = (await get('list-clinic', P)).data;
const nasr = branches.find((b) => b.name === 'فرع مدينة نصر');
const maadi = branches.find((b) => b.name === 'فرع المعادي');
const dokki = branches.find((b) => b.name === 'فرع الدقي');
const groups = (await get('list-groups', P)).data;
const nourGroup = groups.find((g) => g.name === 'مجموعة عيادات النور');
const shefaGroup = groups.find((g) => g.name === 'عيادة الشفاء للأسنان');

// ---------------------------------------------------------------------------
section('Platform owner: sees everything');
check('lists every group with its size and owner', groups.length === 3 && nourGroup.clinics_count === 2 && nourGroup.doctors_count === 4 && nourGroup.receptionists_count === 2 && nourGroup.ownerEmail === 'nour@mssm.test');
const nourDetail = (await get(`show-group/${nourGroup.id}`, P)).data;
check('group drill-down: owners and branches with staff counts', nourDetail.owners.length === 1 && nourDetail.branches.length === 2 && nourDetail.branches.find((b) => b.id === maadi.id).doctors_count === 3);
check('sees every branch', branches.length === 4 && branches.every((b) => b.groupName));
check('filters branches by group', ids((await get(`list-clinic?group_id=${nourGroup.id}&`, P)).data) === ids([nasr, maadi]));
check('sees every doctor', (await get('list-doctors', P)).data.length === 7);
check('sees every receptionist, by branch', (await get(`list-receptionists?clinic_id=${maadi.id}&`, P)).data.map((r) => r.email).join() === 'reception.maadi@mssm.test');
check('sees a group\'s patients', (await get(`list-patients?group_id=${shefaGroup.id}&`, P)).data.length === 8);
const allVisits = (await get(`list-reservations?${ALL_TIME}`, P)).data;
check('sees every visit, with the group name', new Set(allVisits.map((r) => r.group_id)).size === 3 && allVisits.every((r) => r.groupName));
check('sees diagnoses and doctor shares', allVisits.some((r) => r.Diagnosis) && allVisits.every((r) => 'doctor_prectange' in r));
check('sees a branch\'s queue', (await get(`queue?clinic_id=${maadi.id}&`, P)).data.every((r) => r.clinic_id === maadi.id));
check('reads a group\'s settings', (await get(`clinic/settings?group_id=${shefaGroup.id}&`, P)).data?.followup?.mode === 'fixed');
const platformHome = (await get('home', P)).data;
check('insights across the platform', platformHome.groups_count === 3 && platformHome.clinics_count === 4, JSON.stringify(platformHome));

section('Platform owner: changes nothing inside a group');
const someVisit = allVisits.find((r) => r.clinic_id === nasr.id);
const writes = [
  ['add-clinic', { name: 'x', phone: '0', branch: 'x' }],
  ['edit-clinic', { id: nasr.id, name: 'x' }],
  ['clinic/add-doctors', {}],
  ['clinic/add-receptionist', {}],
  ['clinic/add-patients', {}],
  ['clinic/add-reservation', {}],
  ['clinic/edit-reservation', { id: someVisit.id }],
  ['delete-reservation', { id: someVisit.id }],
  ['check-in-reservation', { id: someVisit.id }],
  ['next-patient', { doctor_id: 1 }],
  ['clinic/add-payment', { id: someVisit.id, amount: 1, method: 'cash' }],
  ['clinic/services', { name: 'x', price: 1 }],
  ['clinic/specialties', { title: 'x' }],
  ['clinic/settings', { followup: { enabled: false, days: 1, mode: 'free', value: 0, service_ids: [] } }],
  ['update-doctor-password', { id: 1, password: PASSWORD, password_confirmation: PASSWORD }],
  ['doctor-schedule', { doctor_id: 1, clinic_id: nasr.id, slot_minutes: 20, hours: [] }],
  ['doctor-schedule-day', { doctor_id: 1, clinic_id: nasr.id, date: day(1), closed: true }],
];
const writeResults = await Promise.all(writes.map(([path, body]) => post(path, P, body)));
check(`every write inside a group -> 403 (${writes.length} routes)`, writeResults.every((r) => r.status === 403), writes.filter((_, i) => writeResults[i].status !== 403).map(([p]) => p).join());

section('Platform owner: manages groups');
const newGroup = await post('add-group', P, { name: 'مجموعة تجربة', phone: '0100', owner_name: 'مالك تجربة', owner_email: 'tmp-owner@mssm.test', owner_password: PASSWORD });
check('creates a group with its owner', newGroup.status === 200 && newGroup.data.owners[0].email === 'tmp-owner@mssm.test' && newGroup.data.status === 'active', newGroup.message);
check('owner email must be unused anywhere', (await post('add-group', P, { name: 'x', owner_name: 'x', owner_email: 'karim@mssm.test', owner_password: PASSWORD })).status === 409);
check('edits the group and its owner', (await post('edit-group', P, { id: newGroup.data.id, name: 'مجموعة تجربة 2', owner_phone: '0111' })).data?.owners?.[0]?.phone === '0111');
check("resets the owner's password", (await post('update-owner-password', P, { id: newGroup.data.owners[0].id, password: 'Owner@2026', password_confirmation: 'Owner@2026' })).status === 200);
const tmpOwner = await login('tmp-owner@mssm.test', 'Owner@2026');
check('the new owner signs in to an empty group', tmpOwner.role === 'owner' && (await get('list-clinic', tmpOwner.api_token)).data.length === 0);
check('an active group cannot be deleted', (await post('delete-group', P, { id: newGroup.data.id })).status === 409);
check('suspends the group', (await post('group-status', P, { id: newGroup.data.id, status: 'suspended' })).data?.status === 'suspended');
const lockedOut = await get('list-patients', tmpOwner.api_token);
check("suspension locks out tokens already issued", lockedOut.status === 403 && lockedOut.code === 'GROUP_SUSPENDED');
check('deletes a suspended group', (await post('delete-group', P, { id: newGroup.data.id })).status === 200);
check("a deleted group's owner is gone", (await post('login', null, { email: 'tmp-owner@mssm.test', password: 'Owner@2026' })).status === 401);
check('only the platform manages groups', (await get('list-groups', O)).status === 403 && (await post('group-status', O, { id: nourGroup.id, status: 'suspended' })).status === 403);

// ---------------------------------------------------------------------------
section('Group owner: its group only');
const ownBranches = (await get('list-clinic', O)).data;
check('sees its own branches', ids(ownBranches) === ids([nasr, maadi]));
check("another group's branch -> 404", (await get(`show-clinic/${dokki.id}`, O)).status === 404);
check('group filter outside its group is empty', (await get(`list-patients?group_id=${shefaGroup.id}&`, O)).data.length === 0);
const ownDoctors = (await get('list-doctors', O)).data;
check('sees its doctors with their branches and percentages', ownDoctors.length === 4 && ownDoctors.find((d) => d.email === 'karim@mssm.test').clinicNames.includes('فرع المعادي') && ownDoctors.every((d) => 'prectange' in d));
check('filters doctors by branch', ownDoctors.filter((d) => d.clinic_ids.includes(maadi.id)).length === (await get(`list-doctors?clinic_id=${maadi.id}&`, O)).data.length);
const groupPatients = (await get('list-patients', O)).data;
check('one patient list for the whole group', groupPatients.length === 14 && groupPatients.every((p) => p.group_id === nour.group_id));
const shefaVisit = (await get(`list-reservations?${ALL_TIME}`, S)).data[0];
check("another group's visit -> 404", (await get(`show-reservation/${shefaVisit.id}`, O)).status === 404);
const ownerHome = (await get('home', O)).data;
check('insights for its group', ownerHome.clinics_count === 2 && ownerHome.doctors_count === 4 && ownerHome.receptionists_count === 2, JSON.stringify(ownerHome));
check('insights narrowed to a branch', (await get(`home?clinic_id=${maadi.id}&`, O)).data.doctors_count === 3);

section('Group owner: runs its group');
const tmpBranch = await post('add-clinic', O, { name: 'فرع تجربة', phone: '0100', branch: 'التجمع' });
check('adds a branch to its group', tmpBranch.status === 200 && tmpBranch.data.group_id === nour.group_id && tmpBranch.data.status === 'active', tmpBranch.message);
const spec = await post('clinic/specialties', O, { title: 'عظام' });
const prov = await post('clinic/providers', O, { title: 'تيك توك' });
const svc = await post('clinic/services', O, { name: 'جلسة علاج طبيعي', price: '350' });
check('adds to the group-wide lists', spec.data?.group_id === nour.group_id && prov.data?.group_id === nour.group_id && svc.data?.price === 350);
check('every branch sees the same price list', (await get('services', R)).data.some((s) => s.id === svc.data.id) && (await get('services', RM)).data.some((s) => s.id === svc.data.id));
const shefaSpecialty = (await get('specialties', S)).data[0].id;
check("can't use another group's specialty", (await post('clinic/add-doctors', O, { name: 'x', phone: '0', prectange: 50, specialtie_id: shefaSpecialty, clinic_ids: [nasr.id], email: 'tmp-doc@mssm.test', password: PASSWORD })).status === 400);
check("can't put a doctor in another group's branch", (await post('clinic/add-doctors', O, { name: 'x', phone: '0', prectange: 50, specialtie_id: spec.data.id, clinic_ids: [dokki.id], email: 'tmp-doc@mssm.test', password: PASSWORD })).errors?.clinic_ids !== undefined);
check('a doctor needs a branch', (await post('clinic/add-doctors', O, { name: 'x', phone: '0', prectange: 50, specialtie_id: spec.data.id, clinic_ids: [], email: 'tmp-doc@mssm.test', password: PASSWORD })).status === 400);
check('doctor emails are unique across all accounts', (await post('clinic/add-doctors', O, { name: 'x', phone: '0', prectange: 50, specialtie_id: spec.data.id, clinic_ids: [nasr.id], email: 'super@mssm.test', password: PASSWORD })).status === 409);
const doc = await post('clinic/add-doctors', O, { name: 'د. تجربة', phone: '0101', prectange: '40', specialtie_id: String(spec.data.id), clinic_ids: [String(nasr.id), String(tmpBranch.data.id)], email: 'tmp-doc@mssm.test', password: PASSWORD });
check('adds a doctor working at two branches', doc.status === 200 && ids(doc.data.clinic_ids.map((id) => ({ id }))) === ids([nasr, tmpBranch.data]), doc.message);
const desk = await post('clinic/add-receptionist', O, { name: 'استقبال تجربة', phone: '0102', email: 'tmp-desk@mssm.test', password: PASSWORD, clinic_id: tmpBranch.data.id });
check('adds a receptionist to a branch', desk.status === 200 && desk.data.clinic_id === tmpBranch.data.id && desk.data.clinicName === 'فرع تجربة', desk.message);
check("can't put a receptionist in another group's branch", (await post('clinic/add-receptionist', O, { name: 'x', phone: '0', email: 'tmp-desk9@mssm.test', password: PASSWORD, clinic_id: dokki.id })).status === 400);
check('receptionist emails are unique across all accounts', (await post('clinic/add-receptionist', O, { name: 'x', phone: '0', email: 'karim@mssm.test', password: PASSWORD, clinic_id: nasr.id })).status === 409);
check("resets a receptionist's password", (await post('update-receptionist-password', O, { id: desk.data.id, password: 'Desk@2026', password_confirmation: 'Desk@2026' })).status === 200);
check("can't touch another group's receptionist", (await post('clinic/edit-receptionist', S, { id: desk.data.id, name: 'x' })).status === 404);
const pat = await post('clinic/add-patients', O, { name: 'مريض تجربة', phone: '01022222222', age: '30', address: 'مدينة نصر', provider_id: String(prov.data.id), sex: 'ذكر', clinic_id: nasr.id });
check('registers a patient to the group', pat.status === 200 && pat.data.group_id === nour.group_id && pat.data.registered_clinic_id === nasr.id, pat.message);

section("Doctors' hours");
// Round the clock at Nasr City, so this test can book "today" at any hour. The
// other branch gets no hours: the owner books there outside the hours on purpose.
const tmpHours = { doctor_id: doc.data.id, clinic_id: nasr.id, slot_minutes: 10, hours: everyDay(['00:00', '24:00']) };
const setHours = await post('doctor-schedule', R, tmpHours);
check("the branch's front desk sets a doctor's weekly hours", setHours.status === 200 && setHours.data.hours.length === 7 && setHours.data.slot_minutes === 10, setHours.message);
check("another branch's desk can't", (await post('doctor-schedule', RM, tmpHours)).errors?.clinic_id !== undefined);
check("another group's owner can't", (await post('doctor-schedule', S, tmpHours)).status === 404);
check('the appointment length is one of the set ones', (await post('doctor-schedule', R, { ...tmpHours, slot_minutes: 7 })).errors?.slot_minutes !== undefined);
check('periods on one day must not overlap', (await post('doctor-schedule', O, { ...tmpHours, hours: [{ weekday: 1, start: '10:00', end: '13:00' }, { weekday: 1, start: '12:00', end: '15:00' }] })).errors?.hours !== undefined);
check('a period must end after it starts', (await post('doctor-schedule', O, { ...tmpHours, hours: [{ weekday: 1, start: '15:00', end: '10:00' }] })).errors?.hours !== undefined);
const clash = await post('doctor-schedule', O, { doctor_id: doc.data.id, clinic_id: tmpBranch.data.id, slot_minutes: 20, hours: everyDay(['09:00', '10:00']) });
check('not at two branches at the same time', clash.status === 400 && clash.code === 'HOURS_CLASH' && clash.details?.clinic === 'فرع مدينة نصر', JSON.stringify(clash));
const tmpSchedule = (await get(`doctor-schedule?doctor_id=${doc.data.id}`, O)).data;
check("the owner sees the doctor's hours at each branch", tmpSchedule?.length === 2 && tmpSchedule.find((s) => s.clinic_id === tmpBranch.data.id).hours.length === 0);
check('a desk sees only its own branch', (await get(`doctor-schedule?doctor_id=${doc.data.id}`, R)).data?.map((s) => s.clinic_id).join() === String(nasr.id));

section('Booking at a branch');
const noBranch = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id });
check('an owner must choose the branch', noBranch.status === 400 && noBranch.errors?.clinic_id !== undefined, JSON.stringify(noBranch));
const wrongBranch = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: maadi.id });
check("the doctor must work at that branch", wrongBranch.status === 400 && wrongBranch.errors?.doctor_id !== undefined);
check("another group's branch is refused", (await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: dokki.id })).errors?.clinic_id !== undefined);
const noHours = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: tmpBranch.data.id });
check('no booking where the doctor has no hours', noHours.status === 400 && noHours.code === 'OUTSIDE_HOURS', JSON.stringify(noHours));
const atTmp = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: tmpBranch.data.id, paid: 100, payment_method: 'cash', override_hours: true });
check('owner books at a branch and takes a payment', atTmp.status === 200 && atTmp.data.clinic_id === tmpBranch.data.id && atTmp.data.group_id === nour.group_id && atTmp.data.payments[0].recorded_by_role === 'owner', atTmp.message);
check('...outside the hours, on purpose', atTmp.data?.outside_hours === true);
const atNasr = await post('clinic/add-reservation', R, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id });
check("a receptionist books at its own branch without naming it", atNasr.status === 200 && atNasr.data.clinic_id === nasr.id, atNasr.message);
check("a walk-in with no time takes the doctor's next free slot", /^\d\d:\d0$/.test(atNasr.data?.time ?? '') && atNasr.data.outside_hours === false, atNasr.data?.time);
check('each branch keeps its own queue for the doctor: #1 at both', atTmp.data.queue_number === 1 && atNasr.data.queue_number === 1);
check('a receptionist cannot book at another branch', (await post('clinic/add-reservation', R, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: maadi.id })).errors?.clinic_id !== undefined);
const laterToday = (await get(`doctor-slots?doctor_id=${doc.data.id}&clinic_id=${nasr.id}&date=${day(0)}`, R)).data.slots.filter((s) => s.state === 'free').pop();
const atNasr2 = await post('clinic/add-reservation', R, { patient_id: groupPatients[5].id, doctor_id: doc.data.id, service_id: svc.data.id, date: day(0), time: laterToday?.time, booking_type: 'booked' });
check('the next booking at the same branch is #2', atNasr2.data?.queue_number === 2);
check('the visit stays at its branch on edit', (await post('clinic/edit-reservation', R, { id: atNasr.data.id, clinic_id: tmpBranch.data.id })).data?.clinic_id === nasr.id);

section('Receptionist: its branch, the whole group\'s patients');
check('sees only its branch', ids((await get('list-clinic', R)).data) === String(nasr.id));
const deskDoctors = (await get('list-doctors', R)).data;
check("sees the doctors working at its branch, without percentages", deskDoctors.every((d) => d.clinic_ids.includes(nasr.id) && !('prectange' in d)) && deskDoctors.some((d) => d.id === doc.data.id) && !deskDoctors.some((d) => d.email === 'hala@mssm.test'));
check("sees the group's patients", (await get('list-patients', R)).data.length === 15);
const deskVisits = (await get(`list-reservations?${ALL_TIME}`, R)).data;
check('sees only its branch\'s visits, without diagnoses or shares', deskVisits.length > 0 && deskVisits.every((r) => r.clinic_id === nasr.id && !('Diagnosis' in r) && !('doctor_prectange' in r)));
const maadiVisit = (await get(`list-reservations?${ALL_TIME}`, RM)).data[0];
check("another branch's visit -> 404", (await get(`show-reservation/${maadiVisit.id}`, R)).status === 404);
check("another branch's visit can't be paid or checked in", (await post('clinic/add-payment', R, { id: maadiVisit.id, amount: 1, method: 'cash' })).status === 404 && (await post('check-in-reservation', R, { id: maadiVisit.id })).status === 404);
const karimProfile = (await get(`show-doctors/${karim.id}`, R)).data;
check("a doctor's history shows only this branch's visits", karimProfile.reservations.length > 0 && karimProfile.reservations.every((r) => r.clinic_id === nasr.id));
const patientFile = (await get(`show-patients/${pat.data.id}`, R)).data;
check("a patient's file shows only this branch's visits", ids(patientFile.reservations) === ids([atNasr.data, atNasr2.data].filter((r) => r.patient_id === pat.data.id)));
check('no insights, settings, staff or prices', (await get('home', R)).status === 403 && (await get('clinic/settings', R)).status === 403 && (await get('list-receptionists', R)).status === 403 && (await post('clinic/update-services', R, { id: svc.data.id, name: 'x', price: 1 })).status === 403);
check('no deletes', (await post('delete-reservation', R, { id: atNasr.data.id })).status === 403 && (await post('delete-patient', R, { id: pat.data.id })).status === 403);

section('Queue and next patient across branches');
const myQueue = (await get('queue', K)).data;
check("the doctor's queue covers both branches", new Set(myQueue.map((r) => r.clinic_id)).size === 2 && myQueue.every((r) => r.doctor_id === karim.id));
check('a doctor with two branches must say which', (await post('next-patient', K, {})).errors?.clinic_id !== undefined);
const docLogin = await login('tmp-doc@mssm.test');
const D = docLogin.api_token;
let next = await post('next-patient', D, { clinic_id: nasr.id });
check('next patient at one branch', next.status === 200 && next.data.current?.id === atNasr.data.id && next.data.current.clinic_id === nasr.id, JSON.stringify(next.data ?? next));
check('the other branch\'s queue is untouched', (await get(`show-reservation/${atTmp.data.id}`, O)).data.queue_state === 'waiting');
next = await post('next-patient', R, { doctor_id: doc.data.id });
check("the desk calls next for its branch without naming it", next.status === 200 && next.data.finished.join() === String(atNasr.data.id), JSON.stringify(next.data ?? next));
check('the desk cannot call next at another branch', (await post('next-patient', R, { doctor_id: doc.data.id, clinic_id: tmpBranch.data.id })).errors?.clinic_id !== undefined);
check('a doctor sees only themself in the doctors list', ids((await get('list-doctors', D)).data) === String(doc.data.id));
check('a doctor cannot book or take payments', (await post('clinic/add-reservation', D, {})).status === 403 && (await post('clinic/add-payment', D, { id: atTmp.data.id, amount: 1, method: 'cash' })).status === 403);
check('the doctor writes the diagnosis', (await post('doctor/update-reservations', D, { id: atNasr.data.id, Diagnosis: 'نزلة برد' })).data?.Diagnosis === 'نزلة برد');

section("Booking into the doctor's hours");
// Karim works 10:00-14:00 at Nasr City, Saturday to Thursday, in 20-minute slots.
const karimId = ownDoctors.find((d) => d.email === 'karim@mssm.test').id;
const karimWeek = (await get(`doctor-schedule?doctor_id=${karimId}`, R)).data?.[0];
check("the seed's weekly hours", karimWeek?.slot_minutes === 20 && karimWeek.hours.length === 6 && karimWeek.hours.every((h) => h.start === '10:00' && h.end === '14:00'), JSON.stringify(karimWeek));
const calendar = (await get(`doctor-calendar?doctor_id=${karimId}&clinic_id=${nasr.id}&start=${day(5)}&end=${day(14)}`, R)).data;
const freeDay = calendar?.days.find((d) => d.source === 'weekly' && d.slots === 12 && d.booked === 0)?.date;
check('the calendar gives each day its hours and free slots', !!freeDay && calendar.days.some((d) => d.slots === 0), JSON.stringify(calendar?.days?.slice(0, 2)));
const monaClosed = (await get(`doctor-calendar?doctor_id=${ownDoctors.find((d) => d.email === 'mona@mssm.test').id}&clinic_id=${nasr.id}&start=${day(3)}&end=${day(3)}`, O)).data;
check("the seed's day off", monaClosed?.days[0].source === 'closed' && monaClosed.days[0].slots === 0 && monaClosed.days[0].note === 'إجازة');
const booking = { patient_id: groupPatients[6].id, doctor_id: karimId, service_id: (await get('services', R)).data[0].id, date: freeDay, booking_type: 'booked' };
check('not between slots', (await post('clinic/add-reservation', R, { ...booking, time: '10:05' })).code === 'OUTSIDE_HOURS');
check('not outside the hours', (await post('clinic/add-reservation', R, { ...booking, time: '15:00' })).code === 'OUTSIDE_HOURS');
check('a time is needed on a later day', (await post('clinic/add-reservation', R, booking)).errors?.time !== undefined);
check('not on a day that has passed', (await post('clinic/add-reservation', R, { ...booking, date: day(-1), time: '10:00' })).errors?.date !== undefined);
const inSlot = await post('clinic/add-reservation', R, { ...booking, time: '10:00' });
check('books a free slot', inSlot.status === 200 && inSlot.data.time === '10:00' && inSlot.data.outside_hours === false, inSlot.message);
const taken = await post('clinic/add-reservation', R, { ...booking, patient_id: groupPatients[7].id, time: '10:00' });
check('one patient per slot', taken.status === 400 && taken.code === 'SLOT_TAKEN');
check('the visit being moved frees its own slot', (await get(`doctor-slots?doctor_id=${karimId}&clinic_id=${nasr.id}&date=${freeDay}&exclude=${inSlot.data.id}`, R)).data?.slots[0].state === 'free');
check("the desk can't override", (await post('clinic/add-reservation', R, { ...booking, time: '15:00', override_hours: true })).code === 'OUTSIDE_HOURS');
const squeezed = await post('clinic/add-reservation', O, { ...booking, patient_id: groupPatients[7].id, clinic_id: nasr.id, time: '10:00', override_hours: true });
check('the owner can, on purpose', squeezed.status === 200 && squeezed.data.outside_hours === true, squeezed.message);
const daySlots = (await get(`doctor-slots?doctor_id=${karimId}&clinic_id=${nasr.id}&date=${freeDay}`, R)).data;
check("the day's slots show who holds which", daySlots?.slots.length === 12 && daySlots.slots[0].state === 'taken' && daySlots.slots[0].visit.id === inSlot.data.id && daySlots.slots[1].state === 'free' && daySlots.others.map((v) => v.id).join() === String(squeezed.data.id));
const moved = await post('clinic/edit-reservation', R, { id: inSlot.data.id, time: '10:40' });
check('moving a visit to another free slot', moved.data?.time === '10:40', moved.message);
check('...but not into a taken one', (await post('clinic/edit-reservation', R, { id: squeezed.data.id, time: '10:40' })).code === 'SLOT_TAKEN');
check('the doctor and the platform can see the slots', (await get(`doctor-slots?doctor_id=${karimId}&clinic_id=${nasr.id}&date=${freeDay}`, K)).status === 200 && (await get(`doctor-slots?doctor_id=${karimId}&clinic_id=${nasr.id}&date=${freeDay}`, P)).status === 200);
check("a doctor can't see another doctor's hours", (await get(`doctor-slots?doctor_id=${doc.data.id}&clinic_id=${nasr.id}&date=${freeDay}`, K)).status === 404);

// The queue is numbered by appointment time: squeezed is at 10:00, moved at 10:40.
const numberOf = async (visit) => (await get(`show-reservation/${visit.data.id}`, R)).data?.queue_number;
check('the queue follows appointment time, not booking order', (await numberOf(squeezed)) === 1 && (await numberOf(moved)) === 2);
const later = await post('clinic/add-reservation', R, { ...booking, patient_id: groupPatients[8].id, time: '11:20' });
check('a later slot takes a later number', later.data?.queue_number === 3, later.message);
const earlier = await post('clinic/add-reservation', R, { ...booking, patient_id: groupPatients[9].id, time: '10:20' });
check('booking an earlier slot moves the later ones down', earlier.data?.queue_number === 2 && (await numberOf(moved)) === 3 && (await numberOf(later)) === 4);
await post('clinic/edit-reservation', R, { id: earlier.data.id, status: 'ملغي' });
check('a canceled visit goes to the end of the queue', (await numberOf(earlier)) === 4 && (await numberOf(moved)) === 2 && (await numberOf(later)) === 3);
await post('delete-reservation', O, { id: later.data.id });
check('deleting a visit closes the gap', (await numberOf(earlier)) === 3);
await post('delete-reservation', O, { id: earlier.data.id });

const dayOff = { doctor_id: karimId, clinic_id: nasr.id, date: freeDay, closed: true, note: 'مؤتمر' };
const stranded = await post('doctor-schedule-day', K, dayOff);
check('no day off while patients are booked in it', stranded.status === 409 && stranded.code === 'BOOKINGS_OUTSIDE' && stranded.details?.visits?.map((v) => v.id).join() === String(moved.data.id), JSON.stringify(stranded));
const shorter = await post('doctor-schedule', R, { ...karimWeek, hours: karimWeek.hours.map((h) => ({ ...h, start: '11:00' })) });
check('no weekly change that leaves booked patients out', shorter.status === 409 && shorter.details?.visits?.some((v) => v.id === moved.data.id));
check('hours not at two branches at once (on one date)', (await post('doctor-schedule-day', K, { doctor_id: karimId, clinic_id: maadi.id, date: freeDay, closed: false, hours: [{ start: '13:00', end: '17:00' }] })).code === 'HOURS_CLASH');
await post('delete-reservation', O, { id: moved.data.id });
await post('delete-reservation', O, { id: squeezed.data.id });
const closed = await post('doctor-schedule-day', K, dayOff);
check('the doctor takes a day off', closed.status === 200 && closed.data.source === 'closed' && closed.data.slots.length === 0, closed.message);
check('no booking on a day off', (await post('clinic/add-reservation', R, { ...booking, time: '10:00' })).code === 'OUTSIDE_HOURS');
check("past days can't be changed", (await post('doctor-schedule-day', K, { ...dayOff, date: day(-1) })).errors?.date !== undefined);
const other = await post('doctor-schedule-day', R, { ...dayOff, closed: false, hours: [{ start: '12:00', end: '13:00' }] });
check('other hours for one date', other.status === 200 && other.data.source === 'custom' && other.data.slots.map((s) => s.time).join() === '12:00,12:20,12:40', other.message);
const reset = await post('reset-doctor-schedule-day', R, { doctor_id: karimId, clinic_id: nasr.id, date: freeDay });
check('back to the weekly hours', reset.data?.source === 'weekly' && reset.data.slots.length === 12);

section('Re-visit rule across branches');
const settings = (await get('clinic/settings', O)).data;
check('the group has one rule', settings.followup.enabled === true && settings.followup.days === 14);
check('a rule cannot name another group\'s service', (await post('clinic/settings', O, { followup: { ...settings.followup, service_ids: [(await get('services', S)).data[0].id] } })).status === 400);
await post('clinic/settings', O, { followup: { enabled: true, days: 10, mode: 'percent', value: 50, service_ids: [svc.data.id] } });
const fullVisit = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: nasr.id, date: day(-3), time: '12:00', status: 'مكتمل', override_hours: true });
check('a full visit at one branch', fullVisit.data?.is_followup === false && fullVisit.data.price === 350, fullVisit.message);
const quote = (await get(`reservation-quote?patient_id=${pat.data.id}&doctor_id=${doc.data.id}&service_id=${svc.data.id}&date=${day(0)}`, O)).data;
// Today's full-price visits at both branches are the most recent full visits.
check('the quote needs no branch', quote?.is_followup === true && quote.price === 175 && [atTmp.data.id, atNasr.data.id].includes(quote.followup_of), JSON.stringify(quote));
const revisit = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: svc.data.id, clinic_id: tmpBranch.data.id, date: day(-1), time: '12:00', override_hours: true });
check('a re-visit at the other branch is priced by the rule', revisit.data?.is_followup === true && revisit.data.price === 175 && revisit.data.clinic_id === tmpBranch.data.id);
const seededFollowUp = (await get(`list-reservations?${ALL_TIME}`, O)).data.find((r) => r.is_followup && r.clinic_id === maadi.id);
const seededFull = seededFollowUp && (await get(`show-reservation/${seededFollowUp.followup_of}`, O)).data;
check('the seed has a free re-visit at Maadi after a visit at Nasr City', seededFull?.clinic_id === nasr.id && seededFollowUp.price === 0, JSON.stringify(seededFollowUp && { of: seededFollowUp.followup_of, at: seededFull?.clinic_id }));
await post('clinic/settings', O, settings);
check('settings restored', JSON.stringify((await get('clinic/settings', O)).data) === JSON.stringify(settings));
await post('delete-services', O, { id: svc.data.id });
check('a deleted service leaves the rule', !(await get('clinic/settings', O)).data.followup.service_ids.includes(svc.data.id));

section('Branches open, close, move');
const upcoming = await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: (await get('services', O)).data[0].id, clinic_id: tmpBranch.data.id, date: day(2), time: '12:00', override_hours: true });
check("a doctor can't leave a branch with upcoming bookings", (await post('clinic/edit-doctors', O, { id: doc.data.id, clinic_ids: [nasr.id] })).status === 409);
check("a doctor with upcoming bookings can't be deleted", (await post('delete-doctors', O, { id: doc.data.id })).status === 409);
check('a branch with visits cannot be deleted', (await post('delete-clinic', O, { id: tmpBranch.data.id })).status === 409);
const deskToken = (await login('tmp-desk@mssm.test', 'Desk@2026')).api_token;
check("the receptionist sees its branch's visits", (await get(`list-reservations?${ALL_TIME}`, deskToken)).data.every((r) => r.clinic_id === tmpBranch.data.id));
check('closing the branch', (await post('edit-clinic', O, { id: tmpBranch.data.id, status: 'closed' })).data?.status === 'closed');
check("a closed branch's receptionist is locked out", (await get('list-patients', deskToken)).code === 'BRANCH_CLOSED' && (await post('login', null, { email: 'tmp-desk@mssm.test', password: 'Desk@2026' })).code === 'BRANCH_CLOSED');
check('a closed branch takes no bookings', (await post('clinic/add-reservation', O, { patient_id: pat.data.id, doctor_id: doc.data.id, service_id: upcoming.data.service_id, clinic_id: tmpBranch.data.id })).errors?.clinic_id !== undefined);
check('moving the receptionist to another branch', (await post('clinic/edit-receptionist', O, { id: desk.data.id, clinic_id: nasr.id })).data?.clinic_id === nasr.id);
check('the move applies to the token already issued', (await get(`list-reservations?${ALL_TIME}`, deskToken)).data.every((r) => r.clinic_id === nasr.id));

section('Clean up what this test created');
const mine = (await get(`list-reservations?doctor_id=${doc.data.id}&${ALL_TIME}`, O)).data;
const deletes = await Promise.all(mine.map((r) => post('delete-reservation', O, { id: r.id })));
check('owner deletes the visits', mine.length >= 6 && deletes.every((r) => r.status === 200), `${mine.length} rows`);
check('deletes the doctor', (await post('delete-doctors', O, { id: doc.data.id })).status === 200);
check('deletes the receptionist', (await post('delete-receptionist', O, { id: desk.data.id })).status === 200);
check('deletes the patient', (await post('delete-patient', O, { id: pat.data.id })).status === 200);
check('deletes the empty branch', (await post('delete-clinic', O, { id: tmpBranch.data.id })).status === 200);
check('deletes the lists', (await post('delete-providers', O, { id: prov.data.id })).status === 200 && (await post('delete-specialties', O, { id: spec.data.id })).status === 200);
check('deleted accounts cannot sign in', (await post('login', null, { email: 'tmp-doc@mssm.test', password: PASSWORD })).status === 401 && (await post('login', null, { email: 'tmp-desk@mssm.test', password: 'Desk@2026' })).status === 401);
check("a deleted account's token is refused", (await get('list-patients', D)).status === 401);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
