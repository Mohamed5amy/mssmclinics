import { useState } from "react";
import { Plus, X } from "lucide-react";
import { clsx } from "clsx";

const TONES = {
    red: "bg-red-50 text-red-700 ring-red-600/15",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    blue: "bg-brand-50 text-brand-700 ring-brand-600/15",
};

/**
 * A short list typed as chips: Enter adds what was typed, × removes one, and
 * the common choices are a click away.
 */
const TagInput = ({ label, values, onChange, suggestions = [], placeholder, tone = "blue" }) => {
    const [text, setText] = useState("");
    const add = (value) => {
        const item = value.trim();
        if (item && !values.includes(item)) onChange([...values, item]);
        setText("");
    };
    const left = suggestions.filter((item) => !values.includes(item));

    return (
        <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                {values.map((value) => (
                    <span key={value} className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone])}>
                        {value}
                        <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} className="opacity-60 hover:opacity-100" title="شيل">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            add(text);
                        } else if (e.key === "Backspace" && !text && values.length) {
                            onChange(values.slice(0, -1));
                        }
                    }}
                    onBlur={() => add(text)}
                    placeholder={values.length ? "" : placeholder}
                    className="min-w-[8rem] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
                />
            </div>
            {left.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {left.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => add(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700"
                        >
                            <Plus className="h-3 w-3" /> {item}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
