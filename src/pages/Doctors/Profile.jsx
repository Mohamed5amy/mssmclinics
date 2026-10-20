import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, CalendarDays, HandCoins, KeyRound, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, ButtonLink, Card, CardHeader, ConfirmDialog, DataTable, Details, PageHeader, PageLoader, StatCard, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { isAway, money, monthRange, visitBadge } from "../../constants/visits";
import { weekSummary } from "../../lib/hours";
import ResetPassword from "../../components/ResetPassword/ResetPassword";

// A doctor's file: details, this month's numbers, and their latest visits.
const Profile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const owner = currentUser().role === "owner";

    const { data: doctor, loading } = useApi(`show-doctors/${id}`);
    const hours = useApi("doctor-schedule", { doctor_id: id });
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [resetting, setResetting] = useState(false);

    const month = useMemo(() => {
        const { start, end } = monthRange();
        const visits = (doctor?.reservations ?? []).filter((visit) => visit.CustomDate >= start && visit.CustomDate <= end && !isAway(visit.status));
        const collected = visits.reduce((sum, visit) => sum + (visit.paid || 0), 0);
        return { count: visits.length, collected, share: (collected * (doctor?.prectange || 0)) / 100 };
    }, [doctor]);

    if (loading || !doctor) return <PageLoader />;

    const remove = () => {
        setBusy(true);
        post("delete-doctors", { id: +id })
            .then(() => {
                toast.success("تم حذف الدكتور");
                navigate("/doctors-list");
            })
            .catch((err) => {
                toast.error(errorMessage(err));
                setConfirm(false);
            })
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title={doctor.name}
                subtitle={doctor.specializeName}
                back="/doctors-list"
                actions={
                    owner && (
                        <>
                            <ButtonLink to={`/statement?doctor_id=${id}`} variant="secondary" icon={HandCoins}>كشف الحساب</ButtonLink>
                            <ButtonLink to={`/doctors-list/edit/${id}`} variant="secondary" icon={Pencil}>تعديل</ButtonLink>
                            <Button variant="secondary" icon={KeyRound} onClick={() => setResetting(true)}>كلمة المرور</Button>
                            <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirm(true)}>حذف</Button>
                        </>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="كشوفات الشهر" value={month.count} icon={CalendarDays} />
                <StatCard label="المحصّل هذا الشهر" value={money(month.collected)} tone="green" />
                <StatCard label="نسبته هذا الشهر" value={money(month.share)} tone="violet" hint={`${doctor.prectange}% من المدفوع`} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="البيانات" />
                        <div className="p-5">
                            <Details
                                columns={1}
                                items={[
                                    { label: "الهاتف", value: <span className="ltr-nums">{doctor.phone}</span> },
                                    { label: "الايميل", value: <span className="ltr-nums">{doctor.email}</span> },
                                    {
                                        label: "الفروع",
                                        value: (
                                            <div className="flex flex-wrap gap-1">
                                                {doctor.clinicNames.split("، ").filter(Boolean).map((name) => <Badge key={name} tone="blue">{name}</Badge>)}
                                            </div>
                                        ),
                                    },
                                    { label: "النسبة", value: `${doctor.prectange}%` },
                                    { label: "المجموعة", value: doctor.groupName, hidden: !doctor.groupName || owner },
                                ]}
                            />
                        </div>
                    </Card>
                    <Card>
                        <CardHeader
                            title="المواعيد"
                            actions={
                                <ButtonLink to={`/schedules?doctor_id=${id}`} variant="ghost" size="sm" icon={CalendarClock}>
                                    {owner ? "تعديل" : "التقويم"}
                                </ButtonLink>
                            }
                        />
                        <div className="space-y-4 p-5">
                            {hours.data?.map((branch) => (
                                <div key={branch.clinic_id}>
                                    <p className="text-sm font-medium text-slate-900">
                                        {branch.clinicName}
                                        <span className="font-normal text-slate-500"> · كل كشف {branch.slot_minutes} دقيقة</span>
                                    </p>
                                    {branch.hours.length ? (
                                        weekSummary(branch.hours).map((line) => (
                                            <p key={line.days} className="mt-1 text-sm text-slate-600">
                                                <span className="text-slate-500">{line.days}:</span> {line.hours}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="mt-1 text-sm text-amber-700">ملوش مواعيد هنا لسه</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                <Card className="lg:col-span-2">
                    <CardHeader title="آخر الكشوفات" />
                    <DataTable
                        rows={doctor.reservations.slice(0, 15)}
                        rowLink={(row) => `/reservations-list/${row.id}`}
                        empty="لسه مفيش كشوفات"
                        columns={[
                            { key: "CustomDate", header: "التاريخ" },
                            { key: "name", header: "المريض", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
                            { key: "clinicName", header: "الفرع" },
                            { key: "status", header: "الحالة", render: (row) => <Badge tone={visitBadge(row).tone}>{visitBadge(row).name}</Badge> },
                            { key: "paid", header: "المدفوع", render: (row) => money(row.paid) },
                        ]}
                    />
                </Card>
            </div>

            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={busy}
                title="حذف الدكتور؟"
                message="مش هيقدر يدخل تاني. كشوفاته القديمة بتفضل محفوظة. لو عنده حجوزات جاية لازم تتنقل او تتلغي الاول."
                confirmLabel="حذف"
            />
            {resetting && <ResetPassword name={doctor.name} id={doctor.id} endpoint="update-doctor-password" onClose={() => setResetting(false)} />}
        </>
    );
};

export default Profile;
