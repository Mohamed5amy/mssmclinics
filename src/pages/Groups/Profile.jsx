import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Hospital, KeyRound, Pencil, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Alert, Badge, Button, ButtonLink, Card, CardHeader, ConfirmDialog, DataTable, Details, PageHeader, PageLoader, StatCard, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import ResetPassword from "../../components/ResetPassword/ResetPassword";
import { BRANCH_STATUS, GROUP_STATUS } from "../../constants/statuses";

// A group, as the platform owner sees it: its owner, its size, its branches
// (each opening onto its staff, doctors, visits and queue), and the only
// things the platform changes - details, status, the owner's password, and
// deleting it once suspended.
const Profile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { data: group, loading, setData } = useApi(`show-group/${id}`);

    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [resetting, setResetting] = useState(false);

    if (loading || !group) return <PageLoader />;

    const owner = group.owners?.[0];
    const suspended = group.status === "suspended";

    const toggleStatus = () => {
        setBusy(true);
        post("group-status", { id: +id, status: suspended ? "active" : "suspended" })
            .then((updated) => {
                setData(updated);
                toast.success(suspended ? "تم تفعيل المجموعة" : "تم إيقاف المجموعة");
                setConfirm(null);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const remove = () => {
        setBusy(true);
        post("delete-group", { id: +id })
            .then(() => {
                toast.success("تم حذف المجموعة");
                navigate("/groups");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title={group.name}
                subtitle={<Badge tone={GROUP_STATUS[group.status]?.tone} dot>{GROUP_STATUS[group.status]?.name}</Badge>}
                back="/groups"
                actions={
                    <>
                        <ButtonLink to={`/groups/edit/${id}`} variant="secondary" icon={Pencil}>تعديل</ButtonLink>
                        {suspended ? (
                            <Button variant="success" icon={PlayCircle} onClick={() => setConfirm("status")}>تفعيل</Button>
                        ) : (
                            <Button variant="secondary" icon={PauseCircle} onClick={() => setConfirm("status")}>إيقاف</Button>
                        )}
                        {suspended && <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirm("delete")}>حذف</Button>}
                    </>
                }
            />

            {suspended && (
                <Alert tone="error" icon={PauseCircle} title="المجموعة موقوفة" className="mb-6">
                    مفيش حد فيها يقدر يسجل دخول (المالك، الاستقبال، الدكاترة). بياناتها محفوظة وترجع بالتفعيل.
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="الفروع" value={group.clinics_count} tone="blue" />
                <StatCard label="الدكاترة" value={group.doctors_count} tone="blue" />
                <StatCard label="الاستقبال" value={group.receptionists_count} tone="blue" />
                <StatCard label="المرضى" value={group.patients_count} tone="blue" />
                <StatCard label="الكشوفات" value={group.reservations_count} tone="blue" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader
                        title="صاحب المجموعة"
                        actions={owner && <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetting(true)}>كلمة المرور</Button>}
                    />
                    <div className="p-5">
                        <Details
                            columns={1}
                            items={[
                                { label: "الاسم", value: owner?.name },
                                { label: "الايميل", value: <span className="ltr-nums">{owner?.email}</span> },
                                { label: "الهاتف", value: owner?.phone ? <span className="ltr-nums">{owner.phone}</span> : "—" },
                                { label: "تليفون المجموعة", value: group.phone ? <span className="ltr-nums">{group.phone}</span> : "—" },
                            ]}
                        />
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader title="الفروع" description="افتح الفرع لتشوف الاستقبال والدكاترة والكشوفات والدور" />
                    <DataTable
                        rows={group.branches}
                        rowLink={(row) => `/clinics-list/${row.id}`}
                        emptyIcon={Hospital}
                        empty="لسه مفيش فروع"
                        emptyText="صاحب المجموعة بيضيف الفروع من حسابه"
                        columns={[
                            { key: "name", header: "الفرع", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
                            { key: "doctors_count", header: "الدكاترة" },
                            { key: "receptionists_count", header: "الاستقبال" },
                            { key: "status", header: "الحالة", render: (row) => <Badge tone={BRANCH_STATUS[row.status]?.tone}>{BRANCH_STATUS[row.status]?.name}</Badge> },
                        ]}
                    />
                </Card>
            </div>

            <ConfirmDialog
                open={confirm === "status"}
                onClose={() => setConfirm(null)}
                onConfirm={toggleStatus}
                loading={busy}
                tone={suspended ? "primary" : "danger"}
                title={suspended ? "تفعيل المجموعة؟" : "إيقاف المجموعة؟"}
                message={suspended ? "كل حسابات المجموعة هترجع تقدر تدخل." : "كل حسابات المجموعة هتخرج فوراً ومش هتقدر تدخل لحد ما تفعلها تاني."}
                confirmLabel={suspended ? "تفعيل" : "إيقاف"}
            />
            <ConfirmDialog
                open={confirm === "delete"}
                onClose={() => setConfirm(null)}
                onConfirm={remove}
                loading={busy}
                title="حذف المجموعة نهائياً؟"
                message="هيتحذف كل فروعها وحساباتها ومرضاها وكشوفاتها، ومفيش رجوع."
                confirmLabel="حذف نهائي"
            />
            {resetting && owner && <ResetPassword name={owner.name} id={owner.id} endpoint="update-owner-password" onClose={() => setResetting(false)} />}
        </>
    );
};

export default Profile;
