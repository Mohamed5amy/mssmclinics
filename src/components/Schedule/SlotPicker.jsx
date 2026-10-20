import { useEffect, useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { clsx } from "clsx";
import { Button, Spinner } from "../../ui";
import { useApi } from "../../lib/useApi";
import { todayString } from "../../constants/visits";
import { dayTitle, formatPeriods, monthCells, monthOf } from "../../lib/hours";
import MonthCalendar from "./MonthCalendar";
import SlotGrid from "./SlotGrid";

/**
 * A booking's day and time, picked from the doctor's free slots at the branch:
 * the month marks the days with free time, then the chosen day's slots.
 *   value: { date, time }; onChange({ date, time })
 *   exclude: the visit being moved, so its own slot shows as free
 *   autoPick: today with no time chosen takes the next free slot (a walk-in)
 *   refresh: bump to reload, e.g. after a slot was taken meanwhile
 *   className: when the calendar and the slots sit side by side (by the room the page gives)
 */
const SlotPicker = ({ doctorId, clinicId, value, onChange, exclude, autoPick = false, refresh = 0, className = "md:grid-cols-2" }) => {
    const today = todayString();
    const [month, setMonth] = useState(() => monthOf(value.date || today));
    const cells = monthCells(month);

    const calendar = useApi("doctor-calendar", { doctor_id: doctorId, clinic_id: clinicId, start: cells[0], end: cells[cells.length - 1] });
    const slots = useApi(value.date ? "doctor-slots" : null, { doctor_id: doctorId, clinic_id: clinicId, date: value.date, exclude });
    const days = useMemo(() => new Map((calendar.data?.days ?? []).map((day) => [day.date, day])), [calendar.data]);
    const day = slots.data?.date === value.date ? slots.data : null;

    useEffect(() => {
        if (!refresh) return;
        calendar.reload(true);
        slots.reload(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]);

    // A walk-in today takes the next free slot, unless the desk picks another.
    useEffect(() => {
        if (!autoPick || value.time || value.date !== today || !day) return;
        const next = day.slots.find((slot) => slot.state === "free");
        if (next) onChange({ date: value.date, time: next.time });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, autoPick]);

    const tone = (date) => {
        const info = days.get(date);
        if (!info?.slots || date < today) return "off";
        return info.free ? "open" : "full";
    };
    const nextOpen = [...days.values()].find((info) => info.date >= today && info.free > 0 && info.date !== value.date);
    const free = day?.slots.filter((slot) => slot.state === "free").length ?? 0;

    return (
        <div className={clsx("grid grid-cols-1 gap-6", className)}>
            <MonthCalendar
                compact
                month={month}
                onMonthChange={setMonth}
                selected={value.date}
                loading={calendar.loading}
                onSelect={(date) => onChange({ date, time: "" })}
                isDisabled={(date) => date < today}
                tone={tone}
                renderDay={(date) => {
                    const info = days.get(date);
                    if (!info?.slots || date < today) return null;
                    return <span className={clsx("mt-0.5 h-1 w-4 rounded-full", info.free ? "bg-emerald-500" : "bg-amber-400")} />;
                }}
            />

            <div className="min-w-0">
                {!value.date ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">اختر اليوم من التقويم</p>
                ) : !day ? (
                    <div className="flex justify-center py-10">
                        <Spinner />
                    </div>
                ) : (
                    <>
                        <div className="mb-3">
                            <p className="font-semibold text-slate-900">{dayTitle(value.date)}</p>
                            <p className="text-sm text-slate-500">
                                {day.hours.length ? `${formatPeriods(day.hours)} · كل كشف ${day.slot_minutes} دقيقة` : "الدكتور مش موجود اليوم ده"}
                                {day.note && ` · ${day.note}`}
                            </p>
                        </div>

                        {day.slots.length > 0 && <SlotGrid slots={day.slots} value={value.time} onPick={(time) => onChange({ date: value.date, time })} />}

                        {!free && (
                            <div className="mt-3 flex flex-col items-center rounded-lg bg-slate-50 px-4 py-6 text-center">
                                <CalendarX2 className="h-6 w-6 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-600">{day.slots.length ? "مفيش مواعيد فاضية اليوم ده" : "اختر يوم تاني"}</p>
                                {nextOpen && (
                                    <Button variant="soft" size="sm" className="mt-3" onClick={() => onChange({ date: nextOpen.date, time: "" })}>
                                        أقرب يوم فاضي: {dayTitle(nextOpen.date)}
                                    </Button>
                                )}
                            </div>
                        )}

                        {day.slots.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-slate-200 bg-white" /> فاضي</span>
                                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-600" /> اختيارك</span>
                                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100" /> محجوز</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SlotPicker;
