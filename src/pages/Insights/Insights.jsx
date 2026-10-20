import { useMemo, useState } from "react";
import { Banknote, CalendarCheck, CalendarX, Clock, Coins, HandCoins, Hospital, Stethoscope, Headset, Users, Wallet } from "lucide-react";
import { Card, CardHeader, DataTable, Input, PageHeader, Select, StatCard } from "../../ui";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { PAYMENT_METHODS, STATUS, amount, dayString, monthRange, money, isAway } from "../../constants/visits";

const PERIODS = [
    { id: "month", name: "هذا الشهر" },
    { id: "last", name: "الشهر الماضي" },
    { id: "today", name: "اليوم" },
    { id: "custom", name: "فترة مخصصة" },
];

const periodRange = (period, custom) => {
    const now = new Date();
    if (period === "today") return { start: dayString(now), end: dayString(now) };
    if (period === "last") return monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (period === "custom") return custom;
    return monthRange(now);
};

const round = (value) => Math.round(value * 100) / 100;

// Groups visits by a key and adds up visits, collected money and doctor shares.
const breakdown = (visits, keyOf, nameOf) => {
    const groups = new Map();
    visits.forEach((visit) => {
        const key = keyOf(visit);
        const row = groups.get(key) ?? { id: key, name: nameOf(visit), visits: 0, collected: 0, share: 0 };
        row.visits += 1;
        row.collected += visit.paid || 0;
        row.share += ((visit.paid || 0) * (visit.doctor?.prectange || 0)) / 100;
        groups.set(key, row);
    });
    return [...groups.values()].sort((a, b) => b.collected - a.collected);
};

// The owner's (or the platform's) figures for a period: money first, then visits.
const Insights = () => {
    const user = currentUser();
    const platform = user.role === "admin";

    const [groupId, setGroupId] = useState("");
    const [clinicId, setClinicId] = useState("");
    const [period, setPeriod] = useState("month");
    const [custom, setCustom] = useState(monthRange());
    const range = periodRange(period, custom);
    const scope = { group_id: groupId, clinic_id: clinicId };

    const groups = useApi(platform ? "list-groups" : null);
    const branches = useApi("list-clinic", { group_id: groupId });
    const counts = useApi("home", scope);
    const visits = useApi("list-reservations", { ...scope, start_date: range.start, end_date: range.end });

    const figures = useMemo(() => {
        const all = visits.data ?? [];
        const counted = all.filter((visit) => !isAway(visit.status));
        const collected = counted.reduce((sum, visit) => sum + (visit.paid || 0), 0);
        const shares = counted.reduce((sum, visit) => sum + ((visit.paid || 0) * (visit.doctor?.prectange || 0)) / 100, 0);
        const methods = {};
        counted.forEach((visit) => (visit.payments || []).forEach((payment) => {
            methods[payment.method] = (methods[payment.method] || 0) + payment.amount;
        }));
        return {
            total: all.length,
            done: all.filter((visit) => visit.status === STATUS.DONE).length,
            canceled: all.filter((visit) => visit.status === STATUS.CANCELED).length,
            pending: all.filter((visit) => visit.status === STATUS.PENDING).length,
            collected: round(collected),
            shares: round(shares),
            owed: round(counted.reduce((sum, visit) => sum + Math.max(visit.remaining || 0, 0), 0)),
            discounts: round(counted.reduce((sum, visit) => sum + (visit.discount || 0), 0)),
            methods,
            byDoctor: breakdown(counted, (visit) => visit.doctor_id, (visit) => visit.doctorName),
            byBranch: breakdown(counted, (visit) => visit.clinic_id, (visit) => visit.clinicName + (platform ? ` · ${visit.groupName}` : "")),
        };
    }, [visits.data, platform]);

    const loading = visits.loading;
    const methodTotal = Object.values(figures.methods).reduce((sum, value) => sum + value, 0);
    const scopeName = platform
        ? groupId ? groups.data?.find((group) => group.id === +groupId)?.name : "كل المجموعات"
        : user.groupName;

    return (
        <>
            <PageHeader
                title="لوحة التحكم"
                subtitle={scopeName}
                actions={
                    <>
                        {platform && (
                            <Select value={groupId} onChange={(e) => { setGroupId(e.target.value); setClinicId(""); }} className="w-auto min-w-40">
                                <option value="">كل المجموعات</option>
                                {groups.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </Select>
                        )}
                        {(branches.data?.length ?? 0) > 1 && (
                            <Select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="w-auto min-w-36">
                                <option value="">كل الفروع</option>
                                {branches.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </Select>
                        )}
                        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-auto">
                            {PERIODS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                    </>
                }
            />

            {period === "custom" && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <Input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="w-auto" />
                    <span className="text-sm text-slate-400">إلى</span>
                    <Input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="w-auto" />
                </div>
            )}

            {/* Money */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="المحصّل" value={money(figures.collected)} icon={Wallet} tone="blue" loading={loading} hint="المدفوع فعلياً، بدون الملغي" />
                <StatCard label="صافي العيادة" value={money(figures.collected - figures.shares)} icon={Banknote} tone="green" loading={loading} hint="بعد نسب الدكاترة" />
                <StatCard label="نسب الدكاترة" value={money(figures.shares)} icon={HandCoins} tone="violet" loading={loading} />
                <StatCard label="متبقي على المرضى" value={money(figures.owed)} icon={Coins} tone="amber" loading={loading} hint={figures.discounts ? `الخصومات: ${money(figures.discounts)}` : undefined} />
            </div>

            {/* Visits */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="الكشوفات" value={figures.total} icon={CalendarCheck} tone="gray" loading={loading} />
                <StatCard label="مكتملة" value={figures.done} icon={CalendarCheck} tone="green" loading={loading} />
                <StatCard label="في الانتظار" value={figures.pending} icon={Clock} tone="amber" loading={loading} />
                <StatCard label="ملغاة" value={figures.canceled} icon={CalendarX} tone="red" loading={loading} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* By doctor */}
                <Card className="lg:col-span-2">
                    <CardHeader title="حسب الطبيب" description="الكشوفات غير الملغاة في الفترة" />
                    <DataTable
                        loading={loading}
                        rows={figures.byDoctor}
                        empty="لا توجد كشوفات في الفترة دي"
                        columns={[
                            { key: "name", header: "الطبيب", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
                            { key: "visits", header: "الكشوفات" },
                            { key: "collected", header: "المحصّل", render: (row) => money(row.collected) },
                            { key: "share", header: "نسبته", render: (row) => money(row.share) },
                        ]}
                    />
                </Card>

                {/* By payment method */}
                <Card>
                    <CardHeader title="طرق الدفع" />
                    <div className="space-y-4 p-5">
                        {PAYMENT_METHODS.map((method) => {
                            const value = figures.methods[method.id] || 0;
                            const share = methodTotal ? Math.round((value / methodTotal) * 100) : 0;
                            return (
                                <div key={method.id}>
                                    <div className="mb-1.5 flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">{method.name}</span>
                                        <span className="text-slate-500">{amount(value)} <span className="text-xs">({share}%)</span></span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${share}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!methodTotal && !loading && <p className="text-center text-sm text-slate-400">لا توجد مدفوعات</p>}
                    </div>
                </Card>
            </div>

            {/* By branch, when there is more than one */}
            {!clinicId && figures.byBranch.length > 1 && (
                <Card className="mt-6">
                    <CardHeader title="حسب الفرع" />
                    <DataTable
                        rows={figures.byBranch}
                        columns={[
                            { key: "name", header: "الفرع", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
                            { key: "visits", header: "الكشوفات" },
                            { key: "collected", header: "المحصّل", render: (row) => money(row.collected) },
                            { key: "net", header: "صافي العيادة", render: (row) => money(row.collected - row.share) },
                        ]}
                    />
                </Card>
            )}

            {/* Size */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {platform && !groupId && <StatCard label="المجموعات" value={counts.data?.groups_count} icon={Hospital} tone="gray" loading={counts.loading} />}
                {!clinicId && <StatCard label="الفروع" value={counts.data?.clinics_count} icon={Hospital} tone="gray" loading={counts.loading} />}
                <StatCard label="الدكاترة" value={counts.data?.doctors_count} icon={Stethoscope} tone="gray" loading={counts.loading} />
                <StatCard label="الاستقبال" value={counts.data?.receptionists_count} icon={Headset} tone="gray" loading={counts.loading} />
                <StatCard label="المرضى" value={counts.data?.patients_count} icon={Users} tone="gray" loading={counts.loading} />
            </div>
        </>
    );
};

export default Insights;
