import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Banknote, CheckCircle2, Pencil, Plus, RotateCcw, Trash2, UserCheck, UserX } from "lucide-react";
import { clsx } from "clsx";
import { Alert, Badge, Button, ButtonLink, Card, CardBody, CardHeader, ConfirmDialog, Details, Field, Input, Modal, PageHeader, PageLoader, Textarea, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { BOOKING_TYPES, PAYMENT_METHODS, STATUS, isAway, labelOf, money, todayString, visitBadge } from "../../constants/visits";
import AllergyAlert from "../../components/Medical/AllergyAlert";
import Attachments from "../../components/Medical/Attachments";
import MedicalBackground from "../../components/Medical/MedicalBackground";
import VisitHistory from "../../components/Medical/VisitHistory";
import WhatsAppButton from "../../components/WhatsApp/WhatsAppButton";
import { confirmationText, receiptText, reminderText } from "../../lib/whatsapp";

const dateTime = (value) => {
    const date = new Date(value);
    return `${date.toLocaleDateString("en-CA")} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

// One visit: who, where, when, its money and payments, the diagnosis - and,
// for the doctors (not the front desk), the patient's medical file.
const Profile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const me = currentUser();
    const role = me.role;
    const desk = role === "owner" || role === "receptionist";
    const medicalOn = role !== "receptionist";
    const writesMedical = role === "doctor" || role === "owner";

    const { data: visit, loading, setData } = useApi(`show-reservation/${id}`);
    const file = useApi(visit && medicalOn ? `patient-medical/${visit.patient_id}` : null);
    const [paying, setPaying] = useState(false);
    const [justPaid, setJustPaid] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    // Just booked from the booking page: offer to send the confirmation
    const justBooked = location.state?.booked === true;

    if (loading || !visit) return <PageLoader />;

    const badge = visitBadge(visit);
    const canPay = desk && !isAway(visit.status) && visit.remaining > 0;
    // A booked patient who hasn't come, on a day that has come
    const canMarkNoShow = desk && visit.status === STATUS.PENDING && !visit.arrived_at && visit.CustomDate <= todayString();
    const canDeleteFile = (item) =>
        role === "owner" || (role === "doctor" && item.uploaded_by_role === "doctor" && item.uploaded_by_id === me.id);

    // Still to come: worth confirming or reminding
    const upcoming = visit.status === STATUS.PENDING && visit.CustomDate >= todayString();
    const markReminded = () =>
        post("mark-reminded", { id: +id })
            .then(setData)
            .catch(() => {});

    const markNoShow = () => {
        setBusy(true);
        post("clinic/edit-reservation", { id: +id, status: STATUS.NO_SHOW })
            .then((row) => {
                setData(row);
                toast.info("اتسجل لم يحضر");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const checkIn = () => {
        setBusy(true);
        post("check-in-reservation", { id: +id })
            .then((row) => {
                setData(row);
                toast.success("تم تسجيل الوصول");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const removeVisit = () => {
        setBusy(true);
        post("delete-reservation", { id: +id })
            .then(() => {
                toast.success("تم حذف الكشف");
                navigate("/reservations-list");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const removePayment = () => {
        setBusy(true);
        post("clinic/delete-payment", { id: +id, payment_id: confirm.payment.id })
            .then((row) => {
                setData(row);
                setConfirm(null);
                toast.success("تم حذف الدفعة");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title={visit.name}
                subtitle={`كشف #${visit.id} · ${visit.serviceName}`}
                back
                actions={
                    <>
                        {desk && visit.queue_state === "not_arrived" && visit.CustomDate === todayString() && (
                            <Button variant="success" icon={UserCheck} onClick={checkIn} loading={busy}>تسجيل وصول</Button>
                        )}
                        {canMarkNoShow && <Button variant="secondary" icon={UserX} onClick={markNoShow} loading={busy}>لم يحضر</Button>}
                        {canPay && <Button icon={Banknote} onClick={() => setPaying(true)}>تسجيل دفعة</Button>}
                        {desk && <ButtonLink to={`/reservations-list/edit/${id}`} variant="secondary" icon={Pencil}>تعديل</ButtonLink>}
                        {role === "owner" && <Button variant="danger-ghost" size="icon" title="حذف الكشف" onClick={() => setConfirm({ type: "visit" })}><Trash2 className="h-4 w-4" /></Button>}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {desk && justBooked && upcoming && (
                        <Alert tone="success" icon={CheckCircle2} title={`تم الحجز · دور رقم ${visit.queue_number}`}>
                            <p>ابعت تأكيد الحجز للمريض على واتساب.</p>
                            <WhatsAppButton phone={visit.patientPhone} text={confirmationText(visit)} size="sm" className="mt-2">
                                ابعت التأكيد
                            </WhatsAppButton>
                        </Alert>
                    )}
                    {medicalOn && <AllergyAlert medical={file.data?.medical} />}

                    {/* Turn and status */}
                    <Card>
                        <div className="flex flex-wrap items-center gap-5 p-5">
                            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                <span className="text-[10px] font-medium">الدور</span>
                                <span className="text-2xl font-bold leading-none">{visit.queue_number}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge tone={badge.tone} dot>{badge.name}</Badge>
                                <Badge>{labelOf(BOOKING_TYPES, visit.booking_type)}</Badge>
                                {visit.is_followup && <Badge tone="violet">إعادة</Badge>}
                                {visit.outside_hours && <Badge tone="amber">برة مواعيد الدكتور</Badge>}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="التفاصيل" />
                        <CardBody>
                            <Details
                                items={[
                                    {
                                        label: "المريض",
                                        value: role === "doctor" ? visit.name : <Link to={`/patients-list/${visit.patient_id}`} className="text-brand-700 hover:underline">{visit.name}</Link>,
                                    },
                                    { label: "الدكتور", value: `${visit.doctorName} · ${visit.doctorSpecalite}` },
                                    { label: "الفرع", value: visit.clinicName },
                                    { label: "الخدمة", value: visit.serviceName },
                                    { label: "اليوم", value: visit.CustomDate },
                                    { label: "الساعة", value: visit.time || "بدون موعد محدد" },
                                    { label: "المجموعة", value: visit.groupName, hidden: role !== "admin" },
                                ]}
                            />
                        </CardBody>
                    </Card>

                    {role !== "receptionist" && <Diagnosis visit={visit} role={role} onSaved={setData} />}

                    {medicalOn && file.data && (
                        <>
                            <Attachments
                                patientId={visit.patient_id}
                                reservationId={visit.id}
                                items={file.data.attachments}
                                onChange={(attachments) => file.setData((current) => ({ ...current, attachments }))}
                                canUpload={writesMedical}
                                canDelete={canDeleteFile}
                            />
                            <VisitHistory visits={file.data.visits} currentId={visit.id} />
                        </>
                    )}
                </div>

                {/* The patient's medical background, WhatsApp messages, then the money */}
                <div className="space-y-6">
                    {desk && (
                        <Card>
                            <CardHeader
                                title="رسائل واتساب"
                                description={visit.patientPhone ? <span className="ltr-nums">{visit.patientPhone}</span> : "مفيش رقم تليفون للمريض"}
                            />
                            <CardBody className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {upcoming && (
                                        <>
                                            <WhatsAppButton phone={visit.patientPhone} text={confirmationText(visit)} size="sm">تأكيد الحجز</WhatsAppButton>
                                            <WhatsAppButton phone={visit.patientPhone} text={reminderText(visit)} onSent={markReminded} size="sm">تذكير</WhatsAppButton>
                                        </>
                                    )}
                                    {visit.paid > 0 && (
                                        <WhatsAppButton phone={visit.patientPhone} text={receiptText(visit)} size="sm">إيصال الدفع</WhatsAppButton>
                                    )}
                                    {!upcoming && !(visit.paid > 0) && <p className="text-sm text-slate-500">مفيش رسايل للكشف ده</p>}
                                </div>
                                {visit.reminded_at && <p className="text-xs text-slate-500">اتبعت تذكير {dateTime(visit.reminded_at)}</p>}
                            </CardBody>
                        </Card>
                    )}
                    {medicalOn && file.data && (
                        <MedicalBackground
                            patientId={visit.patient_id}
                            medical={file.data.medical}
                            canEdit={writesMedical}
                            onSaved={(medical) => file.setData((current) => ({ ...current, medical }))}
                        />
                    )}
                    <Card>
                        <CardHeader title="الحساب" />
                        <CardBody className="space-y-3 text-sm">
                            {visit.is_followup && (
                                <Alert tone="info" icon={RotateCcw}>
                                    إعادة {visit.price === 0 ? "مجانية" : `بـ ${money(visit.price)}`} بدل {money(visit.service_price)}
                                </Alert>
                            )}
                            <Row label="سعر الخدمة" value={money(visit.service_price)} muted={visit.is_followup} />
                            {visit.is_followup && <Row label="سعر الإعادة" value={money(visit.price)} />}
                            {visit.discount > 0 && <Row label="الخصم" value={`− ${money(visit.discount)}`} />}
                            <Row label="المطلوب" value={money(visit.net_price)} strong />
                            <Row label="المدفوع" value={money(visit.paid)} />
                            <div className={clsx("flex items-center justify-between rounded-lg px-4 py-3", visit.remaining > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")}>
                                <span className="font-medium">المتبقي</span>
                                <span className="text-lg font-bold">{money(visit.remaining)}</span>
                            </div>
                            {role !== "receptionist" && visit.doctor?.prectange !== undefined && (
                                <Row label={`نسبة الدكتور (${visit.doctor.prectange}%)`} value={money((visit.paid * visit.doctor.prectange) / 100)} />
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="المدفوعات" actions={canPay && <Button size="sm" variant="soft" icon={Plus} onClick={() => setPaying(true)}>دفعة</Button>} />
                        {justPaid && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                                <span>اتسجلت الدفعة. ابعت الإيصال؟</span>
                                <WhatsAppButton phone={visit.patientPhone} text={receiptText(visit)} onSent={() => setJustPaid(false)} size="sm">إيصال واتساب</WhatsAppButton>
                            </div>
                        )}
                        {visit.payments.length ? (
                            <ul className="divide-y divide-slate-100">
                                {visit.payments.map((payment) => (
                                    <li key={payment.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900">{money(payment.amount)} <span className="font-normal text-slate-500">· {labelOf(PAYMENT_METHODS, payment.method)}</span></p>
                                            <p className="text-xs text-slate-500">{dateTime(payment.paid_at)} · {payment.recorded_by_role === "receptionist" ? "الاستقبال" : "الإدارة"}</p>
                                        </div>
                                        {role === "owner" && (
                                            <button type="button" onClick={() => setConfirm({ type: "payment", payment })} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="حذف الدفعة">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="px-5 py-6 text-center text-sm text-slate-500">{visit.net_price === 0 ? "زيارة مجانية" : "لم يتم دفع اي مبلغ"}</p>
                        )}
                    </Card>
                </div>
            </div>

            {paying && <PaymentModal visit={visit} onClose={() => setPaying(false)} onPaid={(row) => { setData(row); setPaying(false); setJustPaid(true); }} />}
            <ConfirmDialog
                open={confirm?.type === "visit"}
                onClose={() => setConfirm(null)}
                onConfirm={removeVisit}
                loading={busy}
                title="حذف الكشف نهائياً؟"
                message="لو الكشف اتلغى، الأفضل تغير حالته لـ ملغي بدل الحذف عشان يفضل في السجل."
                confirmLabel="حذف"
            />
            <ConfirmDialog
                open={confirm?.type === "payment"}
                onClose={() => setConfirm(null)}
                onConfirm={removePayment}
                loading={busy}
                title={`حذف دفعة ${confirm?.payment ? money(confirm.payment.amount) : ""}؟`}
                message="استخدمها لتصحيح دفعة اتسجلت غلط."
                confirmLabel="حذف الدفعة"
            />
        </>
    );
};

const Row = ({ label, value, strong, muted }) => (
    <div className="flex items-center justify-between">
        <span className="text-slate-500">{label}</span>
        <span className={clsx(strong ? "font-bold text-slate-900" : "font-medium text-slate-700", muted && "text-slate-400 line-through")}>{value}</span>
    </div>
);

// The doctor writes it; the owner can correct it; the platform only reads it.
const Diagnosis = ({ visit, role, onSaved }) => {
    const toast = useToast();
    const canWrite = role === "doctor" || role === "owner";
    const [text, setText] = useState(visit.Diagnosis ?? "");
    const [saving, setSaving] = useState(false);
    const changed = text !== (visit.Diagnosis ?? "");

    const save = () => {
        setSaving(true);
        post(role === "doctor" ? "doctor/update-reservations" : "clinic/edit-reservation", { id: visit.id, Diagnosis: text })
            .then((row) => {
                onSaved(row);
                toast.success("تم حفظ التشخيص");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Card>
            <CardHeader title="التشخيص" />
            <CardBody>
                {canWrite ? (
                    <>
                        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب التشخيص والملاحظات..." rows={5} />
                        <div className="mt-3 flex justify-end">
                            <Button onClick={save} loading={saving} disabled={!changed}>حفظ التشخيص</Button>
                        </div>
                    </>
                ) : (
                    <p className="whitespace-pre-line text-sm text-slate-700">{visit.Diagnosis || "لا يوجد تشخيص"}</p>
                )}
            </CardBody>
        </Card>
    );
};

// Takes an amount towards the visit, recorded by hand (cash, InstaPay, ...).
const PaymentModal = ({ visit, onClose, onPaid }) => {
    const toast = useToast();
    const [amount, setAmount] = useState(String(visit.remaining));
    const [method, setMethod] = useState("cash");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (!(+amount > 0)) return setError("ادخل مبلغ صحيح");
        if (+amount > visit.remaining) return setError(`المبلغ اكبر من المتبقي (${money(visit.remaining)})`);
        setSaving(true);
        post("clinic/add-payment", { id: visit.id, amount: +amount, method })
            .then((row) => {
                toast.success(`تم تسجيل ${money(amount)}`);
                onPaid(row);
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="sm"
            title="تسجيل دفعة"
            description={`المتبقي ${money(visit.remaining)}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>تسجيل</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="المبلغ (جنيه)" error={error}>
                    <Input type="number" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} invalid={!!error} autoFocus />
                </Field>
                <div>
                    <p className="mb-1.5 text-sm font-medium text-slate-700">طريقة الدفع</p>
                    <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setMethod(item.id)}
                                className={clsx(
                                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                                    method === item.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300",
                                )}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default Profile;
