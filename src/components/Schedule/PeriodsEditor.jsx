import { Plus, X } from "lucide-react";
import { Select } from "../../ui";
import { END_OPTIONS, TIME_OPTIONS, formatTime, fromMinutes, toMinutes } from "../../lib/hours";

// A new period starts where the last one ended (or at 10 AM) and runs four hours.
const nextPeriod = (periods) => {
    const from = periods.length ? Math.min(toMinutes(periods[periods.length - 1].end) + 60, 20 * 60) : 10 * 60;
    return { start: fromMinutes(from), end: fromMinutes(Math.min(from + 4 * 60, 24 * 60)) };
};

/**
 * One day's working periods ("من 10 ص إلى 2 م"), each with a remove button,
 * and "فترة تانية" to split the day (mornings and evenings).
 */
const PeriodsEditor = ({ periods, onChange, disabled = false }) => {
    const update = (index, key, value) => onChange(periods.map((period, i) => (i === index ? { ...period, [key]: value } : period)));

    return (
        <div className="space-y-2">
            {periods.map((period, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">من</span>
                    <Select value={period.start} onChange={(e) => update(index, "start", e.target.value)} disabled={disabled} className="w-28 pe-8">
                        {TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                    </Select>
                    <span className="text-sm text-slate-500">إلى</span>
                    <Select value={period.end} onChange={(e) => update(index, "end", e.target.value)} disabled={disabled} className="w-28 pe-8">
                        {END_OPTIONS.map((time) => <option key={time} value={time}>{time === "24:00" ? "12:00 ص (آخر اليوم)" : formatTime(time)}</option>)}
                    </Select>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onChange(periods.filter((_, i) => i !== index))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="شيل الفترة"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ))}
            {!disabled && (
                <button
                    type="button"
                    onClick={() => onChange([...periods, nextPeriod(periods)])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                    <Plus className="h-4 w-4" /> {periods.length ? "فترة تانية" : "ضيف فترة"}
                </button>
            )}
        </div>
    );
};

export default PeriodsEditor;
