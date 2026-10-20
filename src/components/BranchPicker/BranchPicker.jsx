import { useEffect } from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { Field, Select } from "../../ui";
import { useApi } from "../../lib/useApi";

/**
 * One of the group's open branches, or several (`multiple`, as toggle chips) -
 * a doctor's branches, a receptionist's branch, where an owner books a visit.
 * `value` is an id, or an array of ids when `multiple`. With a single open
 * branch it is chosen automatically.
 */
const BranchPicker = ({ label = "الفرع", value, onChange, error, multiple = false, required = true, hint }) => {
    const { data } = useApi("list-clinic");
    const open = (data ?? []).filter((branch) => branch.status !== "closed");

    useEffect(() => {
        if (open.length !== 1) return;
        if (multiple ? !value?.length : !value) onChange(multiple ? [open[0].id] : open[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open.length]);

    if (!multiple) {
        return (
            <Field label={label} required={required} error={error} hint={hint}>
                <Select value={value ?? ""} onChange={(e) => onChange(e.target.value ? +e.target.value : "")} invalid={!!error}>
                    <option value="">اختر الفرع</option>
                    {open.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </Select>
            </Field>
        );
    }

    const toggle = (id) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

    return (
        <Field label={label} required={required} error={error} hint={hint}>
            <div className="flex flex-wrap gap-2">
                {open.map((branch) => {
                    const on = value.includes(branch.id);
                    return (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => toggle(branch.id)}
                            className={clsx(
                                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                                on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                        >
                            <span className={clsx("flex h-4 w-4 items-center justify-center rounded border", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
                                {on && <Check className="h-3 w-3" />}
                            </span>
                            {branch.name}
                        </button>
                    );
                })}
            </div>
        </Field>
    );
};

export default BranchPicker;
