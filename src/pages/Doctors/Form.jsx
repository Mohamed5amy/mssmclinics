import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader, PageLoader, Select, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import BranchPicker from "../../components/BranchPicker/BranchPicker";

// A doctor of the owner's group and the branches they work at.
const Form = () => {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const toast = useToast();

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [clinicIds, setClinicIds] = useState([]);
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(editing);
    const specialties = useApi("specialties");

    useEffect(() => {
        if (!editing || !specialties.data) return;
        get(`show-doctors/${id}`).then((doctor) => {
            reset({ name: doctor.name, phone: doctor.phone, email: doctor.email, prectange: doctor.prectange, specialtie_id: doctor.specialtie_id });
            setClinicIds(doctor.clinic_ids);
            setLoading(false);
        });
    }, [editing, id, reset, specialties.data]);

    const onSubmit = (data) => {
        if (!clinicIds.length) return setServerErrors({ clinic_ids: "اختر فرع واحد على الاقل" });

        setSaving(true);
        setServerErrors({});
        const body = { ...data, clinic_ids: clinicIds, prectange: +data.prectange, specialtie_id: +data.specialtie_id };
        post(editing ? "clinic/edit-doctors" : "clinic/add-doctors", editing ? { ...body, id: +id } : body)
            .then((doctor) => {
                toast.success(editing ? "تم حفظ التعديلات" : "تم إضافة الدكتور");
                navigate(`/doctors-list/${doctor.id}`);
            })
            .catch((err) => {
                const errs = fieldErrors(err);
                if (err?.response?.status === 409 && !errs.email && /upcoming/.test(err?.response?.data?.message)) {
                    errs.clinic_ids = errorMessage(err);
                }
                setServerErrors(errs);
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    const error = (name) => errors[name]?.message || serverErrors[name];

    if (loading) return <PageLoader />;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
            <PageHeader title={editing ? "تعديل الدكتور" : "دكتور جديد"} back />

            <Card>
                <CardHeader title="البيانات" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="الاسم" required error={error("name")}>
                        <Input placeholder="د. ..." invalid={!!error("name")} {...register("name", { required: "ادخل الاسم" })} />
                    </Field>
                    <Field label="رقم الهاتف" required error={error("phone")}>
                        <Input type="tel" dir="ltr" className="text-end" invalid={!!error("phone")} {...register("phone", { required: "ادخل رقم الهاتف" })} />
                    </Field>
                    <Field label="التخصص" required error={error("specialtie_id")}>
                        <Select invalid={!!error("specialtie_id")} {...register("specialtie_id", { required: "اختر التخصص" })}>
                            <option value="">اختر التخصص</option>
                            {specialties.data?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </Select>
                    </Field>
                    <Field label="نسبة الدكتور %" required error={error("prectange")} hint="من المبلغ المدفوع في كل كشف">
                        <Input type="number" min={0} max={100} invalid={!!error("prectange")} {...register("prectange", { required: "ادخل النسبة" })} />
                    </Field>
                    <div className="sm:col-span-2">
                        <BranchPicker multiple label="الفروع اللي بيشتغل فيها" value={clinicIds} onChange={setClinicIds} error={error("clinic_ids")} hint="له دور منفصل في كل فرع" />
                    </div>
                </CardBody>
            </Card>

            <Card className="mt-6">
                <CardHeader title="حساب الدخول" description="الدكتور بيدخل يشوف الدور بتاعه ويكتب التشخيص" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="الايميل" required error={error("email")}>
                        <Input type="email" dir="ltr" invalid={!!error("email")} {...register("email", { required: "ادخل الايميل" })} />
                    </Field>
                    {!editing && (
                        <Field label="كلمة المرور" required error={error("password")} hint="6 خانات على الاقل">
                            <Input type="password" dir="ltr" invalid={!!error("password")} {...register("password", { required: "ادخل كلمة المرور", minLength: { value: 6, message: "6 خانات على الاقل" } })} />
                        </Field>
                    )}
                </CardBody>
            </Card>

            <div className="mt-6 flex gap-3">
                <Button type="submit" loading={saving}>{editing ? "حفظ" : "إضافة الدكتور"}</Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>الغاء</Button>
            </div>
        </form>
    );
};

export default Form;
