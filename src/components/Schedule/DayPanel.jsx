import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Field, Input, Modal, PageLoader, Segmented, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { todayString } from "../../constants/visits";
import { DAY_SOURCES, dayTitle, formatPeriods, formatTime, periodsProblem, weekdayOf } from "../../lib/hours";
import PeriodsEditor from "./PeriodsEditor";
import SlotGrid from "./SlotGrid";
import StrandedVisits from "./StrandedVisits";

const MODES = [
    { id: "weekly", name: "حسب الجدول" },
    { id: "custom", name: "مواعيد مختلفة" },
    { id: "closed", name: "إجازة" },
];

/**
 * One day of a doctor's schedule at a branch: its slots (who is booked when,
 * and a quick booking for a free one), and - for upcoming days - setting it
 * apart from the weekly hours: a day off, or other hours.
 *   weekly: the branch's weekly hours, to start "other hours" from
 */
const DayPanel = ({ doctorId, clinicId, date, weekly, canEdit, canBook, onClose, onChanged }) => {
    const toast = useToast();
    const { data: day, loading, setData } = useApi("doctor-slots", { doctor_id: doctorId, clinic_id: clinicId, date });

    const [mode, setMode] = useState("weekly");
    const [periods, setPeriods] = useState([]);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [stranded, setStranded] = useState(null);

    // Start from what the day is now; "other hours" starts from its usual ones.
    useEffect(() => {
        if (!day) return;
        const usual = weekly.filter((period) => period.weekday === weekdayOf(date)).map(({ start, end }) => ({ start, end }));
        setMode(day.source);
        setPeriods(day.source === "custom" ? day.hours : usual.length ? usual : [{ start: "10:00", end: "14:00" }]);
        setNote(day.note ?? "");
        setStranded(null);
    }, [day, weekly, date]);

    const editable = canEdit && date >= todayString();
    const problem = mode === "custom" ? periodsProblem(periods) || (!periods.length && "حدد المواعيد او خلي اليوم إجازة") : null;

    const save = () => {
        const target = { doctor_id: doctorId, clinic_id: clinicId, date };
        setSaving(true);
        setStranded(null);
        (mode === "weekly"
            ? post("reset-doctor-schedule-day", target)
            : post("doctor-schedule-day", { ...target, closed: mode === "closed", hours: mode === "custom" ? periods : [], note }))
            .then((updated) => {
                setData(updated);
                toast.success(mode === "closed" ? "اليوم بقى إجازة" : "تم حفظ مواعيد اليوم");
                onChanged();
            })
            .catch((err) => {
                const data = err?.response?.data;
                if (data?.code === "BOOKINGS_OUTSIDE") setStranded(data.details?.visits ?? []);
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    const free = day?.slots.filter((slot) => slot.state === "free").length ?? 0;
    const bookLink = canBook ? (slot) => `/reservations-list/add?doctor_id=${doctorId}&clinic_id=${clinicId}&date=${date}&time=${slot.time}` : null;

    return (
        <Modal open onClose={onClose} size="xl" title={dayTitle(date)} description={day ? (day.hours.length ? formatPeriods(day.hours, false) : "الدكتور مش موجود اليوم ده") : ""}>
            {loading && !day ? (
                <PageLoader />
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={DAY_SOURCES[day.source].tone}>{DAY_SOURCES[day.source].name}</Badge>
                        {day.note && <Badge>{day.note}</Badge>}
                        {day.slots.length > 0 && (
                            <span className="text-sm text-slate-500">
                                {day.slots.length - free - day.slots.filter((slot) => slot.state === "past").length} محجوز · {free} فاضي · كل كشف {day.slot_minutes} دقيقة
                            </span>
                        )}
                    </div>

                    {day.slots.length > 0 && <SlotGrid slots={day.slots} mode="view" bookLink={bookLink} />}

                    {day.others.length > 0 && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">حجوزات برة المواعيد</p>
                            <ul className="space-y-1 text-sm">
                                {day.others.map((visit) => (
                                    <li key={visit.id}>
                                        <Link to={`/reservations-list/${visit.id}`} className="font-medium text-brand-700 hover:underline">{visit.name}</Link>
                                        <span className="text-slate-500"> · {visit.time ? formatTime(visit.time) : "بدون ميعاد"}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {editable && (
                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-slate-700">اليوم ده</p>
                                <Segmented options={MODES} value={mode} onChange={setMode} />
                            </div>
                            {mode === "custom" && <PeriodsEditor periods={periods} onChange={setPeriods} />}
                            {mode !== "weekly" && (
                                <Field label="ملاحظة" hint="بتظهر في التقويم، مثلاً: مؤتمر، سفر">
                                    <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
                                </Field>
                            )}
                            {problem && <p className="text-xs font-medium text-red-600">{problem}</p>}
                            {stranded && <StrandedVisits visits={stranded} />}
                            <Button onClick={save} loading={saving} disabled={!!problem || (mode === "weekly" && day.source === "weekly")}>
                                حفظ
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default DayPanel;
