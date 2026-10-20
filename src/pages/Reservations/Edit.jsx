import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, PageHeader, PageLoader, Segmented, Select, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { BOOKING_TYPES, STATUS, STATUSES, money, todayString } from "../../constants/visits";
import { dayTitle, formatTime } from "../../lib/hours";
import PatientPicker from "../../components/Patients/PatientPicker";
import SlotPicker from "../../components/Schedule/SlotPicker";

// Changing a booking at the desk. The branch stays; moving the day, time or
// doctor takes a free slot in the doctor's hours and gives a new turn there,
// and the re-visit price is worked out again.
const Edit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const owner = currentUser().role === "owner";

    const [form, setForm] = useState(null);
    const [visit, setVisit] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [override, setOverride] = useState(false);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        get(`show-reservation/${id}`).then((row) => {
            setVisit(row);
            setForm({
                patient_id: row.patient_id,
                doctor_id: row.doctor_id,
                service_id: row.service_id,
                status: row.status,
                date: row.CustomDate,
                time: row.time || "",
                booking_type: row.booking_type,
                discount: row.discount ?? 0,
            });
        });
    }, [id]);

    const patients = useApi("list-patients");
    const doctors = useApi(visit ? "list-doctors" : null, { clinic_id: visit?.clinic_id });
    const services = useApi("services");

    if (!form) return <PageLoader />;

    const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value?.target ? value.target.value : value }));
    // An upcoming visit can move to another free slot; a past one keeps its day.
    const movable = visit.status === STATUS.PENDING && visit.CustomDate >= todayString();

    const submit = (e) => {
        e.preventDefault();
        if (movable && !override && !form.time) {
            setErrors({ time: "اختر الميعاد" });
            return;
        }
        setSaving(true);
        post("clinic/edit-reservation", {
            ...form,
            id: +id,
            doctor_id: +form.doctor_id,
            service_id: +form.service_id,
            discount: +form.discount || 0,
            ...(override ? { override_hours: true } : {}),
        })
            .then(() => {
                toast.success("تم حفظ التعديلات");
                navigate(`/reservations-list/${id}`);
            })
            .catch((err) => {
                setErrors(fieldErrors(err));
                toast.error(errorMessage(err));
                if (err?.response?.data?.code === "SLOT_TAKEN") {
                    setForm((current) => ({ ...current, time: "" }));
                    setRefresh((count) => count + 1);
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <form onSubmit={submit} className="max-w-3xl">
            <PageHeader title={`تعديل الكشف #${id}`} subtitle={`${visit.clinicName} · دور ${visit.queue_number}`} back />

            <Card>
                <CardHeader title="الكشف" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="المريض" required error={errors.patient_id} className="sm:col-span-2">
                        <PatientPicker
                            patients={patients.data}
                            value={form.patient_id}
                            onChange={set("patient_id")}
                            onCreated={(patient) => patients.setData((list) => [...(list ?? []), patient])}
                        />
                    </Field>
                    <Field label="الدكتور" required error={errors.doctor_id}>
                        <Select value={form.doctor_id} onChange={(e) => setForm((current) => ({ ...current, doctor_id: e.target.value, time: "" }))}>
                            {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="الخدمة" required error={errors.service_id}>
                        <Select value={form.service_id} onChange={set("service_id")}>
                            {services.data?.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}
                        </Select>
                    </Field>
                    <div className="sm:col-span-2">
                        <p className="mb-1.5 text-sm font-medium text-slate-700">الحالة</p>
                        <Segmented options={STATUSES} value={form.status} onChange={set("status")} />
                    </div>
                </CardBody>
            </Card>

            <Card className="mt-6">
                <CardHeader title="الموعد" description={movable ? "اختر ميعاد فاضي من مواعيد الدكتور عشان تنقل الكشف" : undefined} />
                <CardBody className="space-y-4">
                    {!movable ? (
                        <p className="text-sm text-slate-700">
                            {dayTitle(form.date)}{form.time && ` · ${formatTime(form.time)}`}
                        </p>
                    ) : override ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="اليوم" required error={errors.date}>
                                <Input type="date" value={form.date} onChange={set("date")} />
                            </Field>
                            <Field label="الساعة" error={errors.time}>
                                <Input type="time" value={form.time} onChange={set("time")} />
                            </Field>
                        </div>
                    ) : (
                        <SlotPicker
                            doctorId={+form.doctor_id}
                            clinicId={visit.clinic_id}
                            value={{ date: form.date, time: form.time }}
                            onChange={(value) => setForm((current) => ({ ...current, ...value }))}
                            exclude={+id}
                            refresh={refresh}
                        />
                    )}
                    {movable && !override && (errors.time || errors.date) && <p className="text-xs font-medium text-red-600">{errors.time || errors.date}</p>}
                    {movable && owner && <Checkbox checked={override} onChange={setOverride} label="برة مواعيد الدكتور (للحالات الطارئة)" />}
                </CardBody>
            </Card>

            <Card className="mt-6">
                <CardHeader title="الحساب" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-slate-700">نوع الحجز</p>
                        <Segmented options={BOOKING_TYPES} value={form.booking_type} onChange={set("booking_type")} />
                    </div>
                    <Field label="خصم (جنيه)" error={errors.discount}>
                        <Input type="number" min={0} value={form.discount} onChange={set("discount")} invalid={!!errors.discount} />
                    </Field>
                    <Alert tone="info" className="sm:col-span-2">
                        رقم الدور بيمشي بالميعاد، فتغيير اليوم او الساعة او الدكتور بيغيّر رقم الدور، وسعر الإعادة بيتحسب تاني. المدفوعات بتتسجل من صفحة الكشف.
                    </Alert>
                </CardBody>
            </Card>

            <div className="mt-6 flex gap-3">
                <Button type="submit" loading={saving}>حفظ</Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>الغاء</Button>
            </div>
        </form>
    );
};

export default Edit;
