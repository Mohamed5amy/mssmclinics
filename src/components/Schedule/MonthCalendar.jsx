import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { Button, Spinner } from "../../ui";
import { todayString } from "../../constants/visits";
import { DAY_LETTERS, DAY_NAMES, MONTHS, SHORT_DAY_NAMES, WEEK, monthCells, monthOf } from "../../lib/hours";

/**
 * A month at a glance, Saturday first. The page draws what each day shows
 * (`renderDay`) and says which days can't be picked (`isDisabled`), so the
 * schedule screen and the booking screen share it.
 *   month: { year, month } (month from 0); onMonthChange(month)
 *   tone(day): "open" | "full" | "off" - the day's background
 */
const MonthCalendar = ({ month, onMonthChange, selected, onSelect, renderDay, isDisabled, tone, compact = false, loading = false }) => {
    const today = todayString();
    const cells = monthCells(month);
    const shift = (by) => {
        const date = new Date(month.year, month.month + by, 1);
        onMonthChange({ year: date.getFullYear(), month: date.getMonth() });
    };

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 whitespace-nowrap font-semibold text-slate-900">
                    {MONTHS[month.month]} {month.year}
                    {loading && <Spinner className="h-4 w-4" />}
                </p>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="الشهر اللي فات" onClick={() => shift(-1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onMonthChange(monthOf(today))}>النهارده</Button>
                    <Button variant="ghost" size="icon" title="الشهر الجاي" onClick={() => shift(1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
                {WEEK.map((weekday) => (
                    <div key={weekday} className="py-1" title={DAY_NAMES[weekday]}>
                        {compact ? (
                            DAY_LETTERS[weekday]
                        ) : (
                            <>
                                <span className="sm:hidden">{SHORT_DAY_NAMES[weekday]}</span>
                                <span className="hidden sm:inline">{DAY_NAMES[weekday]}</span>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells.map((day) => {
                    const inMonth = +day.slice(5, 7) - 1 === month.month;
                    const disabled = isDisabled?.(day) ?? false;
                    const state = tone?.(day);
                    return (
                        <button
                            key={day}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect?.(day)}
                            className={clsx(
                                "relative flex min-w-0 flex-col rounded-lg border text-start transition",
                                compact ? "h-11 items-center justify-center p-1" : "min-h-[4.25rem] p-1.5 sm:min-h-[5.5rem] sm:p-2",
                                state === "open" && "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
                                state === "full" && "border-amber-200 bg-amber-50/60 hover:border-amber-300",
                                (state === "off" || !state) && "border-slate-100 bg-slate-50/80 hover:border-slate-200",
                                day === selected && "!border-brand-500 ring-2 ring-brand-500/25",
                                !inMonth && "opacity-40",
                                disabled && "cursor-not-allowed opacity-40 hover:border-slate-100",
                            )}
                        >
                            <span
                                className={clsx(
                                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold",
                                    day === today ? "bg-brand-600 text-white" : "text-slate-700",
                                )}
                            >
                                {+day.slice(8)}
                            </span>
                            {renderDay?.(day, inMonth)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthCalendar;
