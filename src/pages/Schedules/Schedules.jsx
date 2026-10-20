import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Stethoscope } from "lucide-react";
import { clsx } from "clsx";
import { Alert, Button, Card, CardBody, EmptyState, Field, PageHeader, PageLoader, Segmented, Select, Tabs } from "../../ui";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { todayString } from "../../constants/visits";
import { formatPeriods, monthCells, monthOf } from "../../lib/hours";
import MonthCalendar from "../../components/Schedule/MonthCalendar";
import WeeklyEditor from "../../components/Schedule/WeeklyEditor";
import DayPanel from "../../components/Schedule/DayPanel";

const TABS = [
    { key: "calendar", label: "التقويم" },
    { key: "weekly", label: "الجدول الأسبوعي" },
];

/**
 * Doctors' working hours at a branch: the month at a glance (each day's hours
 * and how full it is; a day opens its slots and can be set apart - a day off,
 * other hours), and the weekly timetable behind it. Bookings only go into
 * these hours. A doctor sees their own; the desk the doctors at its branch.
 */
const Schedules = () => {
    const user = currentUser();
    const isDoctor = user.role === "doctor";
    const canEdit = user.role !== "admin";
    const canBook = user.role === "owner" || user.role === "receptionist";
    const [params, setParams] = useSearchParams();

    const doctors = useApi(isDoctor ? null : "list-doctors");
    const doctorId = isDoctor ? user.id : +params.get("doctor_id") || doctors.data?.[0]?.id;
    const schedule = useApi(doctorId ? "doctor-schedule" : null, { doctor_id: doctorId });
    const branches = schedule.data ?? [];
    const branch = branches.find((row) => row.clinic_id === +params.get("clinic_id")) ?? branches[0];

    const [tab, setTab] = useState("calendar");
    const [month, setMonth] = useState(() => monthOf(todayString()));
    const [openDay, setOpenDay] = useState(null);
    const cells = monthCells(month);
    const calendar = useApi(branch ? "doctor-calendar" : null, {
        doctor_id: doctorId,
        clinic_id: branch?.clinic_id,
        start: cells[0],
        end: cells[cells.length - 1],
    });
    const days = useMemo(() => new Map((calendar.data?.days ?? []).map((day) => [day.date, day])), [calendar.data]);

    const choose = (changes) =>
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
                return next;
            },
            { replace: true },
        );

    if ((!isDoctor && doctors.loading) || (doctorId && schedule.loading && !schedule.data)) return <PageLoader />;

    const header = (
        <PageHeader
            title={isDoctor ? "مواعيدي" : "مواعيد الدكاترة"}
            subtitle="الأيام والساعات اللي الدكتور موجود فيها. الحجز بيبقى في المواعيد دي بس."
        />
    );

    if (!doctorId || !branch) {
        return (
            <>
                {header}
                <Card>
                    <EmptyState icon={Stethoscope} title="مفيش دكاترة هنا لسه" text="لما يتضاف دكتور للفرع، تقدر تحدد مواعيده من هنا." />
                </Card>
            </>
        );
    }

    const hasHours = branch.hours.length > 0;

    return (
        <>
            {header}

            <Card className="mb-6">
                <CardBody className="flex flex-wrap items-end gap-x-6 gap-y-4">
                    {!isDoctor && (
                        <Field label="الدكتور">
                            <Select value={doctorId} onChange={(e) => choose({ doctor_id: e.target.value, clinic_id: "" })} className="w-auto min-w-[14rem]">
                                {doctors.data.map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specializeName}</option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    {branches.length > 1 ? (
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-slate-700">الفرع</p>
                            <Segmented
                                options={branches.map((row) => ({ id: row.clinic_id, name: row.clinicName }))}
                                value={branch.clinic_id}
                                onChange={(id) => choose({ clinic_id: id })}
                            />
                        </div>
                    ) : (
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-slate-700">الفرع</p>
                            <p className="flex h-10 items-center text-sm text-slate-900">{branch.clinicName}</p>
                        </div>
                    )}
                </CardBody>
            </Card>

            <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />

            {tab === "weekly" ? (
                <WeeklyEditor
                    key={`${doctorId}-${branch.clinic_id}`}
                    schedule={branch}
                    canEdit={canEdit}
                    onSaved={(saved) => {
                        schedule.setData((rows) => rows.map((row) => (row.clinic_id === saved.clinic_id ? saved : row)));
                        calendar.reload(true);
                    }}
                />
            ) : (
                <>
                    {!hasHours && (
                        <Alert tone="warning" icon={CalendarClock} title={`الدكتور ملوش مواعيد أسبوعية في ${branch.clinicName} لسه`} className="mb-4">
                            <p>من غير مواعيد مش هينفع حد يحجز معاه هنا.</p>
                            {canEdit && (
                                <Button size="sm" className="mt-2" onClick={() => setTab("weekly")}>حدد الجدول الأسبوعي</Button>
                            )}
                        </Alert>
                    )}
                    <Card>
                        <CardBody>
                            <MonthCalendar
                                month={month}
                                onMonthChange={setMonth}
                                loading={calendar.loading}
                                onSelect={setOpenDay}
                                tone={(day) => {
                                    const info = days.get(day);
                                    if (!info?.slots) return "off";
                                    return info.booked >= info.slots ? "full" : "open";
                                }}
                                renderDay={(day) => {
                                    const info = days.get(day);
                                    if (!info) return null;
                                    if (info.source === "closed") {
                                        return <span className="mt-auto truncate text-[11px] font-medium text-red-600">{info.note || "إجازة"}</span>;
                                    }
                                    if (!info.slots) return null;
                                    const full = Math.min(Math.round((info.booked / info.slots) * 100), 100);
                                    return (
                                        <span className="mt-auto block w-full space-y-1">
                                            <span className="hidden truncate text-[11px] text-slate-500 sm:block">{formatPeriods(info.hours)}</span>
                                            <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <span
                                                    className={clsx("block h-full rounded-full", full >= 100 ? "bg-amber-500" : "bg-emerald-500")}
                                                    style={{ width: `${Math.max(full, info.booked ? 8 : 0)}%` }}
                                                />
                                            </span>
                                            <span className="flex items-center justify-between gap-1 text-[11px] text-slate-600">
                                                <span className="font-medium">{info.booked}/{info.slots}</span>
                                                {info.source === "custom" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" title="مواعيد مختلفة" />}
                                            </span>
                                        </span>
                                    );
                                }}
                            />
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-emerald-500" /> محجوز / كل المواعيد</span>
                                <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-amber-500" /> اليوم اتملى</span>
                                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> مواعيد مختلفة عن الجدول</span>
                                <span className="flex items-center gap-1.5"><span className="font-medium text-red-600">إجازة</span></span>
                                <span>اضغط على أي يوم عشان تشوف مواعيده{canEdit ? " او تغيّرها" : ""}.</span>
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}

            {openDay && (
                <DayPanel
                    key={openDay}
                    doctorId={doctorId}
                    clinicId={branch.clinic_id}
                    date={openDay}
                    weekly={branch.hours}
                    canEdit={canEdit}
                    canBook={canBook}
                    onClose={() => setOpenDay(null)}
                    onChanged={() => calendar.reload(true)}
                />
            )}
        </>
    );
};

export default Schedules;
