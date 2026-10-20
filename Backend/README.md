# MSSM Clinics — Backend

NestJS + MongoDB API for the MSSM Clinics dashboard in the folder above.

It replaces the old PHP API at `backend.mssmsolutions.com`. Endpoint names,
request bodies and `{ data: ... }` responses follow the old API where the
meaning didn't change, so the React app only needs `VITE_API` pointed at it. It
started as a copy of the Persona Clinics backend (`D:\Websites\2024\Persona\Backend`)
and is organised as a SaaS: the platform owner above groups (مجموعات), each
group running one or more branches (فروع).

---

## Running it

MongoDB must be running locally. The API uses its own `mssm` database.

```bash
npm --prefix Backend install
```

```bash
npm --prefix Backend run seed
```

```bash
npm --prefix Backend run dev
```

The API listens on **http://localhost:4000/api/**. The frontend picks it up from
`.env.local` in the project root (git-ignored), which overrides the production URL
in `.env`:

```
VITE_API = http://localhost:4000/api/
```

### Demo accounts

`npm run seed` **drops the `mssm` database** and loads demo data. Everyone signs in
on the same page (`/`); the email says which kind of account it is. Every account
uses the password `Mssm@2026`.

| Account | Email | Sees |
| --- | --- | --- |
| platform owner | `super@mssm.test` | every group, branch, account and visit; changes only groups |
| group owner | `nour@mssm.test` | مجموعة عيادات النور: Nasr City and Maadi branches |
| group owner | `shefa@mssm.test` | عيادة الشفاء للأسنان: one branch (Dokki) |
| receptionist | `reception.nasrcity@mssm.test` | Nasr City's front desk |
| receptionist | `reception.maadi@mssm.test` | Maadi's front desk |
| receptionist | `reception.dokki@mssm.test` | Dokki's front desk |
| doctor | `karim@mssm.test` | works at both النور branches: a queue at each |
| suspended group | `amal@mssm.test`, `reception.helwan@`, `sherif@` | refused at sign-in (`GROUP_SUSPENDED`) |

Other doctors: `mona@` (Nasr City), `hala@` and `amr@` (Maadi), `tarek@` and
`yasmin@` (Dokki).

What the seed shows: today's queue at every branch with a patient in every state,
bookings for the coming days, paid, part-paid and unpaid visits, and the re-visit
rule - including a patient seen by Dr. Karim at Nasr City who came back to him at
Maadi for free. النور re-visits are free within 14 days, الشفاء's cost 100 EGP
within 7. Every doctor has weekly hours (Saturday to Thursday; Karim mornings at
Nasr City and evenings at Maadi, Tarek a split day, Yasmin 30-minute slots), Mona
has a day off in 3 days and Karim later hours at Maadi in 2.

### Configuration

`.env` (see `.env.example`):

| Variable         | Default                                   |
| ---------------- | ----------------------------------------- |
| `PORT`           | `4000`                                    |
| `MONGODB_URI`    | `mongodb://127.0.0.1:27017/mssm`          |
| `JWT_SECRET`     | change this before deploying              |
| `JWT_EXPIRES_IN` | `7d`                                      |
| `CORS_ORIGIN`    | `http://localhost:5173` (comma-separated) |

---

## Who can do what

```
platform owner (admins) ── sees everything, including diagnoses; creates, edits,
   │                        suspends and deletes groups, resets owners' passwords.
   │                        Read-only inside a group.
   └─ group (groups) ── one price list, specialties, referral sources, re-visit
        │               rule and patient file for all its branches
        ├─ owner (staff, role owner) ── adds branches, doctors and receptionists,
        │        sets prices and settings, sees income; can also book and take
        │        payments; the only one who deletes visits, payments or patients
        ├─ doctor (doctors) ── works at one or more of the group's branches; sees
        │        their own visits and queues, calls the next patient, writes the
        │        diagnosis, sets their own working hours
        └─ branch (clinics) ── data only, no sign-in; open or closed
             └─ receptionist (staff, role receptionist) ── one branch's front
                      desk: registers patients, books, checks in, takes payments,
                      calls next, sets the hours of its branch's doctors. Never
                      sees income, settings, doctors' percentages or diagnoses;
                      can't delete.
```

How it is enforced:

- **The account is loaded on every request** (`database/accounts.service.ts`, from
  `common/guards/jwt-auth.guard.ts`). The token only says who signed in; its group
  and branches come from the database. A deleted account gets 401. A suspended
  group gets 403 `code: GROUP_SUSPENDED`, and a receptionist of a closed branch 403
  `code: BRANCH_CLOSED`. Suspending, closing or moving takes effect on the next
  request.
- **Tenant isolation** lives in `database/scope.service.ts`. Group-wide records
  (patients, doctors, staff, prices) are filtered by `groupFilter`; visits by
  `clinicFilter`, which also limits receptionists and doctors to their branches.
  Records outside an account's reach answer **404**. `actingClinicId()` is the
  branch a desk action happens at: a receptionist's own; the owner names one
  (`clinic_id`) unless the group has a single open branch.
- **The platform is read-only inside groups** in one place:
  `common/guards/roles.guard.ts` refuses any non-GET request from the platform
  account unless the route names `'admin'` (only group management does).
- **Emails are unique across every kind of account**, so the one sign-in form
  always finds exactly one. A doctor who works for two groups needs two emails.

## Endpoints

All under `/api/`. Everything except the logins needs `Authorization: Bearer <api_token>`.
Roles: P platform, O owner, R receptionist, D doctor. "scoped" means everyone, each within their reach.

| Endpoint | Who | Notes |
| --- | --- | --- |
| `POST login` | anyone | the one sign-in; returns the account, `role`, `group_id`, `clinic_ids`, `groupName`, `clinicName`, `api_token` |
| `POST admin-login`, `owner-login`, `doctor-login`, `receptionist-login` | anyone | the same, limited to those roles (`admin-login`: platform and owners) |
| `GET list-groups`, `GET show-group/:id` | P | groups with their owner, branches and counts |
| `POST add-group`, `edit-group`, `group-status`, `delete-group` | P | `add-group` creates the owner too; only a suspended group can be deleted |
| `POST update-owner-password` | P | |
| `GET list-clinic?group_id=`, `GET show-clinic/:id` | scoped | branches, with staff counts |
| `POST add-clinic`, `edit-clinic` (`status: active/closed`), `delete-clinic` | O | a branch with visits can't be deleted - close it |
| `GET clinic/settings?group_id=` / `POST clinic/settings` | P, O / O | the group's `followup` rule |
| `GET list-doctors?clinic_id&group_id`, `GET show-doctors/:id` | scoped | R sees its branch's doctors without `prectange`; D only themself |
| `POST clinic/add-doctors`, `clinic/edit-doctors` | O | `clinic_ids` = the group's open branches; can't leave a branch with upcoming bookings |
| `POST delete-doctors`, `update-doctor-password` | O | refused while the doctor has upcoming bookings |
| `GET list-receptionists?clinic_id&group_id`, `GET show-receptionist/:id` | P, O | |
| `POST clinic/add-receptionist`, `clinic/edit-receptionist`, `delete-receptionist`, `update-receptionist-password` | O | `clinic_id` = the branch; editing it moves the receptionist |
| `GET list-patients?group_id=`, `GET show-patients/:id` | scoped | one file per group; a patient's visits within the caller's reach |
| `POST clinic/add-patients`, `clinic/edit-patients` | O, R | |
| `POST delete-patient` | O | |
| `GET list-reservations?group_id&clinic_id&doctor_id&patient_id&start_date&end_date`, `GET show-reservation/:id` | scoped | R its branch, D their own visits |
| `POST clinic/add-reservation` | O, R | `clinic_id` (owner), `date`, `time`, `booking_type`, `discount`, `apply_followup`, `paid` + `payment_method`; the doctor must work at the branch, and `time` must be a free slot in their hours (see below). `override_hours: true` (owner only) books outside them |
| `POST clinic/edit-reservation` | O, R | the branch stays; a new doctor must work there; a new doctor, day or time takes a free slot, as booking does |
| `POST delete-reservation` | O | |
| `GET reservation-quote?patient_id&doctor_id&service_id&date&time&id` | O, R | the price, re-visit rule included (group-wide, no branch needed) |
| `GET queue?date&clinic_id&doctor_id&group_id` | scoped | one day's visits in turn order, per branch and doctor |
| `POST check-in-reservation` | O, R | `{ id }`; today's waiting visits only |
| `POST next-patient` | O, R, D | `{ doctor_id, clinic_id }`; either may be left out when it's obvious |
| `POST clinic/add-payment` | O, R | `{ id, amount, method }`; never more than what is left |
| `POST clinic/delete-payment` | O | `{ id, payment_id }` |
| `POST doctor/update-reservations` | D | diagnosis only |
| `GET doctor-schedule?doctor_id` | scoped | the doctor's weekly hours and `slot_minutes` at each branch the caller reaches |
| `GET doctor-calendar?doctor_id&clinic_id&start&end` | scoped | per day: `hours`, `source` (`weekly` / `custom` / `closed`), `note`, `slots`, `booked`, `free`; up to 62 days |
| `GET doctor-slots?doctor_id&clinic_id&date&exclude` | scoped | one day's slots: `time`, `end`, `state` (`free` / `taken` / `past`) and the `visit` holding it; `others` = visits off the slots |
| `POST doctor-schedule` | O, R, D | `{ doctor_id, clinic_id, slot_minutes, hours: [{ weekday, start, end }] }` - replaces the weekly hours at that branch |
| `POST doctor-schedule-day` | O, R, D | `{ doctor_id, clinic_id, date, closed, hours: [{ start, end }], note }` - a day off or other hours on one date |
| `POST reset-doctor-schedule-day` | O, R, D | `{ doctor_id, clinic_id, date }` - back to the weekly hours |
| `GET services`, `specialties`, `providers` (`?group_id=`) | scoped | the group's lists |
| `POST clinic/services`, `clinic/update-services`, `delete-services` | O | deleting a service also drops it from the re-visit rule |
| `POST clinic/specialties`, `delete-specialties`, `clinic/providers`, `delete-providers` | O | |
| `GET home?group_id&clinic_id` | P, O | counter tiles for the insights page |

Visit statuses are stored as the Arabic text the dashboard sends and compares
against: `فى الانتظار`, `مكتمل`, `ملغي`. Each visit keeps a snapshot of the service
price and the doctor's percentage, so later changes don't rewrite past income.

## Visits: doctors' hours, queue, payments, re-visits

- **Doctors' hours.** Each doctor has a weekly timetable per branch (`doctor_schedules`:
  periods per weekday, `0` = Sunday, ending as late as `24:00`) and an appointment
  length, `slot_minutes` (10, 15, 20, 30, 45 or 60). A date can be set apart
  (`schedule_exceptions`): a day off (`closed`) or other hours, which also makes an
  extra working day. The rules live in `modules/schedules/hours.ts`, shared with the
  seed. The doctor sets their own hours, the front desk those of its branch's
  doctors, the owner everyone's; the platform only reads them.
  - A doctor can't have hours at two branches at the same time (400 `HOURS_CLASH`,
    `details: { clinic, weekday | date }`).
  - Hours can't change from under booked patients: a change that leaves a waiting
    visit (today on) outside them is refused with 409 `BOOKINGS_OUTSIDE` and
    `details.visits`, to move or cancel first. Past days can't be changed.
  - Deleting a doctor, a branch or a group deletes its hours; so does a doctor
    leaving a branch.
- **Booking into the hours.** `date` is the day (`YYYY-MM-DD`, local time) and
  `time` must be the start of a free slot in the doctor's hours at that branch that
  day: one patient per slot (`OUTSIDE_HOURS`, `SLOT_TAKEN`, or a 400 on `date` for a
  day that has passed). A booking for today with no time takes the next free slot
  (`NO_FREE_SLOT` when there is none). The owner can book outside the hours or into
  a taken slot with `override_hours: true`; the visit is then marked
  `outside_hours` and holds no slot. A visit sent without a date is for today.
  `booking_type` is `booked` or `walk_in`; it defaults to walk-in for today and
  booked for any other day.
- **Queue (الدور).** Every visit has a `queue_number`, counting from 1 per branch,
  doctor and day, in appointment-time order: the earliest slot is 1 (ties go to
  the earlier booking; canceled visits are numbered after everyone still
  expected). The day is renumbered whenever a visit is added, moved, canceled or
  deleted, so booking an earlier slot moves the later patients down one
  (`queueNumbers()` in `reservations/followup.ts`, shared with the seed). A doctor
  at two branches has two queues. Walk-ins are in line as soon as they're booked;
  booked patients join when the desk checks them in (`arrived_at`). `next-patient`
  completes whoever is with the doctor at that branch and calls the arrived
  patient with the lowest number (`called_at`). Rows carry `queue_state`:
  `not_arrived`, `waiting`, `with_doctor`, `done` or `canceled`.
- **Payments.** Recorded by hand: there is no online payment integration. A visit
  has `discount` (EGP) and a `payments` list (`amount`, `method` = `cash`,
  `instapay`, `vodafone_cash` or `card`, `paid_at`, `recorded_by_role` = `owner` or
  `receptionist`, `recorded_by_id`), so it can be paid in parts on different days.
  Responses add `net_price` (price minus discount), `paid`, `remaining` and the
  latest `payment_method`. The dashboard's income totals are the amounts actually
  paid on visits that weren't canceled.
- **Re-visits (الإعادة).** A group's `followup` setting names the services that
  count as a full visit (كشف) and how a return within `days` is priced: `free`,
  `percent` (of the full price) or `fixed`. Booking one of those services for the
  same patient with the same doctor - at any of the group's branches - within the
  window of the last full, non-canceled visit sets `price` by the rule,
  `is_followup` and `followup_of`; `service_price` keeps the full price. The desk
  can send `apply_followup: false` to charge full price (`followup_waived`).
  Follow-ups never start a new window.

## Smoke test

`npm run smoke` runs `scripts/smoke.mjs` against the running API (`API=` to point it
elsewhere). It expects freshly seeded data and finds seeded records by email or
name. It signs in as every kind of account and checks that:

- every write inside a group is refused for the platform owner;
- suspending a group works, and isolation between groups holds;
- booking happens at a branch, with numbering per branch, by appointment time;
- the receptionist's limits hold;
- the queue works across branches, and the re-visit rule applies across branches;
- doctors' hours: who may set them, no overlap between branches, bookings only in
  free slots (and the owner's override), days off and other hours, and changes
  refused while patients are booked in the hours being removed;
- closing a branch and moving a receptionist take effect.

It deletes what it created, so it can be run again.

## How it is put together

```
src/
  main.ts                  bootstrap: /api prefix, CORS, global pipe/filter/interceptor
  app.module.ts            wires every module, registers the two global guards
  common/                  response envelope, error shape, guards, decorators, date helpers
  counters/                numeric-id sequences
  database/                every Mongoose model (global), accounts, lookups, tenant scoping
  modules/                 one folder per resource: schema, DTOs, service, controller
  seed/seed.ts             demo data
scripts/smoke.mjs          end-to-end API check (npm run smoke)
```
