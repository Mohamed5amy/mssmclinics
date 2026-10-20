import { useMemo, useState } from "react";
import { CopyCheck } from "lucide-react";
import { clsx } from "clsx";
import { Button, Card, CardBody, CardHeader, Segmented, Switch, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { DAY_NAMES, SLOT_LENGTHS, WEEK, periodsProblem, slotCount, toMinutes } from "../../lib/hours";
import PeriodsEditor from "./PeriodsEditor";
import StrandedVisits from "./StrandedVisits";

const LENGTHS = SLOT_LENGTHS.map((minutes) => ({ id: minutes, name: `${minutes} د` }));

const byDay = (hours) =>
    Object.fromEntries(WEEK.map((weekday) => [weekday, hours.filter((h) => h.weekday === weekday).map(({ start, end }) => ({ start, end }))]));

// Where in the day the periods fall, from 6 AM to midnight (morning on the start side).
const FROM = 6 * 60;
const TO = 24 * 60;
const Timeline = ({ periods }) => (
    <div className="relative h-2 rounded-full bg-slate-100">
        {periods.map((period, i) => {
            const start = Math.max(toMinutes(period.start), FROM);
            const end = Math.min(toMinutes(period.end), TO);
            if (end <= start) return null;
            return (
                <span
                    key={i}
                    className="absolute inset-y-0 rounded-full bg-brand-500"
                    style={{ insetInlineStart: `${((start - FROM) / (TO - FROM)) * 100}%`, width: `${((end - start) / (TO - FROM)) * 100}%` }}
                />
            );
        })}
    </div>
);

/**
 * The doctor's weekly timetable at a branch: which days, which hours, and how
 * long each appointment is. Turning a day on gives it the hours of the first
 * working day, so a regular week takes a few clicks.
 */
const WeeklyEditor = ({ schedule, canEdit, onSaved }) => {
    const toast = useToast();
    const [slot, setSlot] = useState(schedule.slot_minutes);
    const [days, setDays] = useState(() => byDay(schedule.hours));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stranded, setStranded] = useState(null);

    const problems = useMemo(() => Object.fromEntries(WEEK.map((weekday) => [weekday, periodsProblem(days[weekday])])), [days]);
    const invalid = WEEK.some((weekday) => problems[weekday]);
    const perWeek = WEEK.reduce((sum, weekday) => sum + slotCount(days[weekday], slot), 0);
    const workingDays = WEEK.filter((weekday) => days[weekday].length).length;

    const change = (update) => {
        setDays(update);
        setDirty(true);
        setStranded(null);
    };
    const setDay = (weekday, periods) => change((current) => ({ ...current, [weekday]: periods }));
    const template = () => (WEEK.map((weekday) => days[weekday]).find((periods) => periods.length) ?? [{ start: "10:00", end: "14:00" }]).map((p) => ({ ...p }));
    const copyToWorkingDays = (from) =>
        change((current) =>
            Object.fromEntries(WEEK.map((weekday) => [weekday, current[weekday].length ? current[from].map((p) => ({ ...p })) : current[weekday]])),
        );

    const save = () => {
        setSaving(true);
        setStranded(null);
        post("doctor-schedule", {
            doctor_id: schedule.doctor_id,
            clinic_id: schedule.clinic_id,
            slot_minutes: slot,
            hours: WEEK.flatMap((weekday) => days[weekday].map((period) => ({ weekday, ...period }))),
        })
            .then((saved) => {
                toast.success("تم حفظ المواعيد الأسبوعية");
                setDirty(false);
                onSaved(saved);
            })
            .catch((err) => {
                const data = err?.response?.data;
                if (data?.code === "BOOKINGS_OUTSIDE") setStranded(data.details?.visits ?? []);
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    return (
        <Card>
            <CardHeader
                title="الجدول الأسبوعي"
                description="المواعيد اللي بتتكرر كل أسبوع في الفرع ده. أي يوم مختلف (إجازة او مواعيد تانية) غيّره من التقويم."
            />
            <CardBody className="space-y-6">
                <div>
                    <p className="mb-1.5 text-sm font-medium text-slate-700">مدة الكشف</p>
                    {canEdit ? (
                        <Segmented
                            options={LENGTHS}
                            value={slot}
                            onChange={(value) => {
                                setSlot(value);
                                setDirty(true);
                            }}
                            className="flex-wrap"
                        />
                    ) : (
                        <p className="text-sm text-slate-600">{slot} دقيقة</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-500">كل ميعاد بياخد مريض واحد بس.</p>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    <div className="hidden items-center gap-4 rounded-t-xl bg-slate-50/80 px-4 py-2 text-[11px] text-slate-400 xl:grid xl:grid-cols-[8rem_minmax(0,1fr)_13rem]">
                        <span />
                        <span />
                        <div className="flex justify-between">
                            <span>6 ص</span>
                            <span>12 م</span>
                            <span>6 م</span>
                            <span>12 ص</span>
                        </div>
                    </div>
                    {WEEK.map((weekday) => {
                        const periods = days[weekday];
                        const on = periods.length > 0;
                        return (
                            <div
                                key={weekday}
                                className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start md:gap-x-4 xl:grid-cols-[8rem_minmax(0,1fr)_13rem]"
                            >
                                <div className="flex h-10 items-center gap-3">
                                    <Switch checked={on} onChange={(value) => setDay(weekday, value ? template() : [])} disabled={!canEdit} />
                                    <span className={clsx("text-sm font-medium", on ? "text-slate-900" : "text-slate-400")}>{DAY_NAMES[weekday]}</span>
                                </div>
                                <div className="min-w-0">
                                    {on ? (
                                        <>
                                            <PeriodsEditor periods={periods} onChange={(value) => setDay(weekday, value)} disabled={!canEdit} />
                                            {problems[weekday] && <p className="mt-1.5 text-xs font-medium text-red-600">{problems[weekday]}</p>}
                                        </>
                                    ) : (
                                        <p className="flex h-10 items-center text-sm text-slate-400">إجازة</p>
                                    )}
                                </div>
                                {/* Under the hours, beside them on wide screens */}
                                <div className="flex items-center gap-3 md:col-start-2 xl:col-start-auto xl:h-10">
                                    <div className="flex-1">
                                        <Timeline periods={periods} />
                                    </div>
                                    <span className="w-14 shrink-0 text-xs text-slate-500">{on ? `${slotCount(periods, slot)} كشف` : ""}</span>
                                    {canEdit && on && workingDays > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => copyToWorkingDays(weekday)}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            title="نفس المواعيد لكل الأيام الشغالة"
                                        >
                                            <CopyCheck className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {stranded && <StrandedVisits visits={stranded} />}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                        {workingDays ? `${workingDays} أيام في الأسبوع · ${perWeek} كشف` : "الدكتور ملوش مواعيد في الفرع ده"}
                    </p>
                    {canEdit && (
                        <Button onClick={save} loading={saving} disabled={!dirty || invalid}>
                            حفظ المواعيد
                        </Button>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default WeeklyEditor;
