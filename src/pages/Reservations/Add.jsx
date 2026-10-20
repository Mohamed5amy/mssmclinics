import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, PageHeader, Segmented, Select, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { BOOKING_TYPES, PAYMENT_METHODS, money, todayString } from "../../constants/visits";
import BranchPicker from "../../components/BranchPicker/BranchPicker";
import PatientPicker from "../../components/Patients/PatientPicker";
import SlotPicker from "../../components/Schedule/SlotPicker";

// Booking a visit at the desk: who, with which doctor, which free slot in the
// doctor's hours - and what it costs (the group's re-visit rule included) and
// what was paid now. The schedule page links here with the doctor, branch,
// day and time filled in.
const Add = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [params] = useSearchParams();
    const user = currentUser();
    const pickBranch = user.role === "owner";

    const [clinicId, setClinicId] = useState(pickBranch && params.get("clinic_id") ? +params.get("clinic_id") : "");
    const [patientId, setPatientId] = useState(params.get("patient_id") ? +params.get("patient_id") : "");
    const [doctorId, setDoctorId] = useState(params.get("doctor_id") ?? "");
    const [serviceId, setServiceId] = useState("");
    const [date, setDate] = useState(params.get("date") ?? todayString());
    const [time, setTime] = useState(params.get("time") ?? "");
    const [override, setOverride] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [bookingType, setBookingType] = useState("");
    const [discount, setDiscount] = useState("");
    const [paid, setPaid] = useState("");
    const [method, setMethod] = useState("cash");
    const [applyFollowup, setApplyFollowup] = useState(true);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Booked or walk-in follows the day until the desk picks one
    const type = bookingType || (date === todayString() ? "walk_in" : "booked");
    // The receptionist's branch is fixed; the owner picks one
    const branchId = pickBranch ? clinicId : user.clinic_ids?.[0];

    const patients = useApi("list-patients");
    const doctors = useApi(pickBranch && !clinicId ? null : "list-doctors", { clinic_id: clinicId });
    const services = useApi("services");

    // What this booking costs
    const [quote, setQuote] = useState(null);
    useEffect(() => {
        if (!patientId || !doctorId || !serviceId || !date) return setQuote(null);
        get("reservation-quote", { patient_id: patientId, doctor_id: doctorId, service_id: serviceId, date, time })
            .then(setQuote)
            .catch(() => setQuote(null));
    }, [patientId, doctorId, serviceId, date, time]);

    const price = quote ? (quote.is_followup && applyFollowup ? quote.price : quote.service_price) : 0;
    const net = Math.max(price - (+discount || 0), 0);
    const remaining = net - (+paid || 0);

    const submit = (e) => {
        e.preventDefault();
        const problems = {};
        if (pickBranch && !clinicId) problems.clinic_id = "اختر الفرع";
        if (!patientId) problems.patient_id = "اختر المريض";
        if (!doctorId) problems.doctor_id = "اختر الدكتور";
        if (!serviceId) problems.service_id = "اختر الخدمة";
        if (!time && !override) problems.time = "اختر الميعاد";
        if (+discount > price) problems.discount = "الخصم اكبر من السعر";
        if (+paid > net) problems.paid = "المبلغ اكبر من المطلوب";
        setErrors(problems);
        if (Object.keys(problems).length) return;

        setSaving(true);
        post("clinic/add-reservation", {
            patient_id: patientId,
            doctor_id: +doctorId,
            service_id: +serviceId,
            date,
            ...(time ? { time } : {}),
            booking_type: type,
            discount: +discount || 0,
            apply_followup: applyFollowup,
            ...(+paid > 0 ? { paid: +paid, payment_method: method } : {}),
            ...(pickBranch ? { clinic_id: clinicId } : {}),
            ...(override ? { override_hours: true } : {}),
        })
            .then((visit) => {
                toast.success(`تم الحجز · دور رقم ${visit.queue_number}`);
                navigate(`/reservations-list/${visit.id}`);
            })
            .catch((err) => {
                setErrors(fieldErrors(err));
                toast.error(errorMessage(err));
                // Someone took the slot meanwhile: show the day as it is now
                if (["SLOT_TAKEN", "NO_FREE_SLOT"].includes(err?.response?.data?.code)) {
                    setTime("");
                    setRefresh((count) => count + 1);
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <form onSubmit={submit}>
            <PageHeader title="حجز جديد" back />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title="المريض والدكتور" />
                        <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {pickBranch && (
                                <div className="sm:col-span-2">
                                    <BranchPicker value={clinicId} onChange={(value) => { setClinicId(value); setDoctorId(""); setTime(""); }} error={errors.clinic_id} />
                                </div>
                            )}
                            <Field label="المريض" required error={errors.patient_id} className="sm:col-span-2">
                                <PatientPicker
                                    patients={patients.data}
                                    value={patientId}
                                    onChange={setPatientId}
                                    onCreated={(patient) => patients.setData((list) => [...(list ?? []), patient])}
                                    invalid={!!errors.patient_id}
                                    clinicId={clinicId}
                                />
                            </Field>
                            <Field label="الدكتور" required error={errors.doctor_id}>
                                <Select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setTime(""); }} invalid={!!errors.doctor_id} disabled={pickBranch && !clinicId}>
                                    <option value="">{pickBranch && !clinicId ? "اختر الفرع الاول" : "اختر الدكتور"}</option>
                                    {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specializeName}</option>)}
                                </Select>
                            </Field>
                            <Field label="الخدمة" required error={errors.service_id}>
                                <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} invalid={!!errors.service_id}>
                                    <option value="">اختر الخدمة</option>
                                    {services.data?.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}
                                </Select>
                            </Field>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="الموعد" description="ميعاد فاضي من مواعيد الدكتور. رقم الدور بيمشي بالميعاد: أبدر ميعاد في اليوم هو الدور الأول" />
                        <CardBody className="space-y-5">
                            {!doctorId || !branchId ? (
                                <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    {pickBranch && !clinicId ? "اختر الفرع والدكتور عشان تظهر مواعيده" : "اختر الدكتور عشان تظهر مواعيده"}
                                </p>
                            ) : override ? (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field label="اليوم" required error={errors.date}>
                                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                    </Field>
                                    <Field label="الساعة" error={errors.time}>
                                        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                                    </Field>
                                </div>
                            ) : (
                                <SlotPicker
                                    doctorId={+doctorId}
                                    clinicId={+branchId}
                                    value={{ date, time }}
                                    onChange={(value) => {
                                        setDate(value.date);
                                        setTime(value.time);
                                    }}
                                    autoPick={type === "walk_in"}
                                    refresh={refresh}
                                    className="xl:grid-cols-2"
                                />
                            )}
                            {!override && (errors.time || errors.date) && <p className="text-xs font-medium text-red-600">{errors.time || errors.date}</p>}
                            {pickBranch && doctorId && (
                                <div className="space-y-2">
                                    <Checkbox checked={override} onChange={setOverride} label="حجز برة مواعيد الدكتور (للحالات الطارئة)" />
                                    {override && (
                                        <Alert tone="warning" icon={AlertTriangle}>
                                            الحجز ده هيتسجل برة مواعيد الدكتور او في ميعاد محجوز، ومش هيتعرض كميعاد فاضي لحد تاني.
                                        </Alert>
                                    )}
                                </div>
                            )}
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-slate-700">نوع الحجز</p>
                                <Segmented options={BOOKING_TYPES} value={type} onChange={setBookingType} />
                                <p className="mt-1.5 text-xs text-slate-500">
                                    {type === "walk_in" ? "بيدخل الدور على طول" : "بيدخل الدور لما يوصل ويتسجل وصوله"}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Price and payment */}
                <div className="lg:col-span-1">
                    <Card className="lg:sticky lg:top-24">
                        <CardHeader title="الحساب" />
                        <CardBody className="space-y-5">
                            {!quote ? (
                                <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">اختر المريض والدكتور والخدمة عشان يظهر السعر</p>
                            ) : (
                                <>
                                    {quote.is_followup && (
                                        <Alert tone="info" icon={RotateCcw} title={`إعادة ${quote.price === 0 ? "مجانية" : "بـ " + money(quote.price)}`}>
                                            <p>آخر كشف مع نفس الدكتور يوم {quote.followup_date} (خلال {quote.followup_days} يوم).</p>
                                            <div className="mt-2">
                                                <Checkbox checked={applyFollowup} onChange={setApplyFollowup} label="احسبها إعادة" />
                                            </div>
                                        </Alert>
                                    )}
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-slate-500">سعر الخدمة</dt>
                                            <dd className={clsx("font-medium", quote.is_followup && applyFollowup && "text-slate-400 line-through")}>{money(quote.service_price)}</dd>
                                        </div>
                                        {quote.is_followup && applyFollowup && (
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">سعر الإعادة</dt>
                                                <dd className="font-medium">{money(quote.price)}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    <Field label="خصم (جنيه)" error={errors.discount}>
                                        <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} invalid={!!errors.discount} />
                                    </Field>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-medium text-slate-600">المطلوب</span>
                                        <span className="text-lg font-bold text-slate-900">{money(net)}</span>
                                    </div>
                                    <Field label="المدفوع الآن (جنيه)" error={errors.paid}>
                                        <div className="flex gap-2">
                                            <Input type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} invalid={!!errors.paid} />
                                            <Button variant="soft" onClick={() => setPaid(String(net))} disabled={!net}>الكل</Button>
                                        </div>
                                    </Field>
                                    {+paid > 0 && (
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
                                    )}
                                    <div className="flex justify-between border-t border-slate-100 pt-4 text-sm">
                                        <span className="font-medium text-slate-600">المتبقي</span>
                                        <span className={clsx("font-bold", remaining > 0 ? "text-amber-700" : "text-emerald-700")}>{money(remaining)}</span>
                                    </div>
                                </>
                            )}
                            <Button type="submit" size="lg" className="w-full" loading={saving}>تأكيد الحجز</Button>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </form>
    );
};

export default Add;
