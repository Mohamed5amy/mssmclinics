import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge, Button, ButtonLink, Card, CardHeader, ConfirmDialog, DataTable, Details, PageHeader, PageLoader, StatCard, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { isAway, money, visitBadge } from "../../constants/visits";
import Attachments from "../../components/Medical/Attachments";
import MedicalBackground from "../../components/Medical/MedicalBackground";

// A patient's file: who they are, what they owe, how often they didn't come,
// and every visit (within the account's reach - a receptionist sees its own
// branch's). The owner and the platform also see the medical file.
const Profile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const role = currentUser().role;
    const desk = role === "owner" || role === "receptionist";

    const { data: patient, loading } = useApi(`show-patients/${id}`);
    const file = useApi(role !== "receptionist" ? `patient-medical/${id}` : null);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const totals = useMemo(() => {
        const visits = (patient?.reservations ?? []).filter((visit) => !isAway(visit.status));
        return {
            visits: visits.length,
            paid: visits.reduce((sum, visit) => sum + (visit.paid || 0), 0),
            owed: visits.reduce((sum, visit) => sum + Math.max(visit.remaining || 0, 0), 0),
        };
    }, [patient]);

    if (loading || !patient) return <PageLoader />;

    const remove = () => {
        setBusy(true);
        post("delete-patient", { id: +id })
            .then(() => {
                toast.success("تم حذف الملف");
                navigate("/patients-list");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title={patient.name}
                subtitle={<span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /><span className="ltr-nums">{patient.phone}</span></span>}
                back
                actions={
                    <>
                        {desk && <ButtonLink to={`/reservations-list/add?patient_id=${id}`} icon={CalendarPlus}>حجز</ButtonLink>}
                        {desk && <ButtonLink to={`/patients-list/edit/${id}`} variant="secondary" icon={Pencil}>تعديل</ButtonLink>}
                        {role === "owner" && <Button variant="danger-ghost" size="icon" title="حذف" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /></Button>}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="الزيارات" value={totals.visits} />
                <StatCard label="المدفوع" value={money(totals.paid)} tone="green" />
                <StatCard label="المتبقي عليه" value={money(totals.owed)} tone={totals.owed > 0 ? "amber" : "gray"} />
                <StatCard label="مرات الغياب" value={patient.no_shows} tone={patient.no_shows > 0 ? "red" : "gray"} hint={patient.no_shows > 0 ? "حجز وماجاش" : undefined} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="البيانات" />
                        <div className="p-5">
                            <Details
                                columns={1}
                                items={[
                                    { label: "النوع", value: patient.sex },
                                    { label: "السن", value: `${patient.age} سنة` },
                                    { label: "العنوان", value: patient.address },
                                    { label: "عرفنا عن طريق", value: patient.providerName },
                                    { label: "اتسجل في", value: patient.clinicName || "—" },
                                    { label: "عميل من", value: patient.created_at?.slice(0, 10) },
                                    { label: "المجموعة", value: patient.groupName, hidden: role !== "admin" },
                                ]}
                            />
                        </div>
                    </Card>
                    {file.data && (
                        <>
                            <MedicalBackground
                                patientId={+id}
                                medical={file.data.medical}
                                canEdit={role === "owner"}
                                onSaved={(medical) => file.setData((current) => ({ ...current, medical }))}
                            />
                            <Attachments
                                patientId={+id}
                                items={file.data.attachments}
                                onChange={(attachments) => file.setData((current) => ({ ...current, attachments }))}
                                canUpload={role === "owner"}
                                canDelete={() => role === "owner"}
                            />
                        </>
                    )}
                </div>
                <Card className="lg:col-span-2">
                    <CardHeader title="الزيارات" />
                    <DataTable
                        rows={patient.reservations}
                        rowLink={(row) => `/reservations-list/${row.id}`}
                        empty="لسه مفيش زيارات"
                        emptyAction={desk && <ButtonLink to={`/reservations-list/add?patient_id=${id}`} icon={CalendarPlus}>حجز</ButtonLink>}
                        columns={[
                            { key: "CustomDate", header: "التاريخ" },
                            {
                                key: "doctorName",
                                header: "الدكتور",
                                render: (row) => (
                                    <div>
                                        <p className="font-medium text-slate-900">{row.doctorName}</p>
                                        <p className="text-xs text-slate-500">{row.clinicName}</p>
                                    </div>
                                ),
                            },
                            { key: "serviceName", header: "الخدمة", render: (row) => <>{row.serviceName}{row.is_followup && <Badge tone="violet" className="ms-2">إعادة</Badge>}</> },
                            { key: "status", header: "الحالة", render: (row) => <Badge tone={visitBadge(row).tone}>{visitBadge(row).name}</Badge> },
                            { key: "paid", header: "المدفوع", render: (row) => money(row.paid) },
                            {
                                key: "remaining",
                                header: "المتبقي",
                                render: (row) => (row.remaining > 0 && !isAway(row.status) ? <span className="font-medium text-amber-700">{money(row.remaining)}</span> : <span className="text-slate-400">—</span>),
                            },
                        ]}
                    />
                </Card>
            </div>

            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={busy}
                title={`حذف ملف ${patient.name}؟`}
                message="الملف هيتحذف من كل الفروع. الأفضل تسيبه لو عنده زيارات."
                confirmLabel="حذف"
            />
        </>
    );
};

export default Profile;
