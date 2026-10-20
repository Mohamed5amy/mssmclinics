import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, History, KeyRound, LogIn, Pencil, Plus, ShieldAlert, Trash2, Zap } from "lucide-react";
import { clsx } from "clsx";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, PageLoader, Segmented, Select } from "../../ui";
import { get } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { dayString } from "../../constants/visits";
import { ACTOR_ROLES, describeChanges } from "../../lib/activity";

const KINDS = [
    { id: "", name: "الكل" },
    { id: "money", name: "الفلوس" },
    { id: "delete", name: "الحذف" },
    { id: "access", name: "الدخول" },
];

const ICONS = { create: Plus, update: Pencil, delete: Trash2, action: Zap, login: LogIn, login_failed: ShieldAlert };
const TONES = {
    create: "bg-emerald-50 text-emerald-600",
    update: "bg-brand-50 text-brand-600",
    delete: "bg-red-50 text-red-600",
    action: "bg-slate-100 text-slate-500",
    login: "bg-slate-100 text-slate-500",
    login_failed: "bg-amber-50 text-amber-600",
};

const weekAgo = () => {
    const now = new Date();
    return dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
};
const when = (value) =>
    new Date(value).toLocaleString("ar-EG-u-nu-latn", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * The activity log (سجل النشاط): who did what and when - every change, with
 * what it was before, and every sign-in. The owner sees its group's; the
 * platform everyone's, or one group's.
 */
const Activity = () => {
    const platform = currentUser().role === "admin";
    const [kind, setKind] = useState("");
    const [actor, setActor] = useState("");
    const [groupId, setGroupId] = useState("");
    const [start, setStart] = useState(weekAgo());
    const [end, setEnd] = useState(dayString());

    const params = {
        group_id: groupId,
        actor,
        start,
        end,
        ...(kind === "delete" ? { action: "delete" } : kind ? { category: kind } : {}),
    };
    const groups = useApi(platform ? "list-groups" : null);
    const first = useApi("activity-log", params);

    // Later pages are appended as the reader asks for them
    const [more, setMore] = useState({ rows: [], next: null });
    const [loadingMore, setLoadingMore] = useState(false);
    useEffect(() => setMore({ rows: [], next: null }), [first.data]);
    const rows = [...(first.data?.rows ?? []), ...more.rows];
    const next = more.next ?? (more.rows.length ? null : first.data?.next);

    const loadMore = () => {
        setLoadingMore(true);
        get("activity-log", { ...params, before: next })
            .then((page) => setMore((current) => ({ rows: [...current.rows, ...page.rows], next: page.next })))
            .finally(() => setLoadingMore(false));
    };

    return (
        <>
            <PageHeader title="سجل النشاط" subtitle="مين عمل إيه وإمتى: كل تعديل، وكان إيه قبله، وكل دخول للسيستم" />

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4 p-5">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-slate-700">النوع</p>
                        <Segmented options={KINDS} value={kind} onChange={setKind} />
                    </div>
                    {platform && (
                        <Field label="المجموعة">
                            <Select value={groupId} onChange={(e) => { setGroupId(e.target.value); setActor(""); }} className="w-auto">
                                <option value="">الكل</option>
                                {groups.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <Field label="الشخص">
                        <Select value={actor} onChange={(e) => setActor(e.target.value)} className="w-auto min-w-[12rem]">
                            <option value="">الكل</option>
                            {first.data?.actors.map((person) => (
                                <option key={person.key} value={person.key}>{person.name} · {ACTOR_ROLES[person.role] ?? person.role}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="من">
                        <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="w-auto" />
                    </Field>
                    <Field label="إلى">
                        <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-auto" />
                    </Field>
                </div>
            </Card>

            <Card>
                {first.loading && !first.data ? (
                    <PageLoader />
                ) : rows.length ? (
                    <>
                        <ul className="divide-y divide-slate-100">
                            {rows.map((row) => {
                                const Icon = row.category === "access" && row.action === "update" ? KeyRound : row.category === "money" && row.action !== "delete" ? Banknote : ICONS[row.action] ?? Zap;
                                const changes = describeChanges(row);
                                return (
                                    <li key={row.id} className="flex gap-3 px-5 py-3.5">
                                        <span className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONES[row.action] ?? TONES.action)}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-slate-900">
                                                <span className="font-semibold">{row.actor_name || "حد مش معروف"}</span>
                                                <span className="text-slate-500"> {row.label}</span>
                                                {row.target && (
                                                    <>
                                                        {" · "}
                                                        {row.link ? <Link to={row.link} className="font-medium text-brand-700 hover:underline">{row.target}</Link> : <span className="font-medium">{row.target}</span>}
                                                    </>
                                                )}
                                            </p>
                                            {changes.length > 0 && (
                                                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                                                    {changes.map((line) => <li key={line}>{line}</li>)}
                                                </ul>
                                            )}
                                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                                                <span>{when(row.at)}</span>
                                                {row.actor_role && <span>· {ACTOR_ROLES[row.actor_role] ?? row.actor_role}</span>}
                                                {row.clinicName && <span>· {row.clinicName}</span>}
                                                {platform && row.groupName && <span>· {row.groupName}</span>}
                                                {row.ip && <span className="ltr-nums">· {row.ip}</span>}
                                                {row.category === "money" && <Badge tone="green">فلوس</Badge>}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {next && (
                            <div className="border-t border-slate-100 p-4 text-center">
                                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>المزيد</Button>
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState icon={History} title="مفيش نشاط" text="غيّر الفترة او الفلاتر" />
                )}
            </Card>
        </>
    );
};

export default Activity;
