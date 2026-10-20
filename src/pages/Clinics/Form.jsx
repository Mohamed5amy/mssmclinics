import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, CardBody, Field, Input, PageHeader, PageLoader, Segmented, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";

// A branch of the owner's group: data only. Its receptionists and doctors are
// added from their own pages.
const Form = () => {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const toast = useToast();

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [status, setStatus] = useState("active");
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(editing);

    useEffect(() => {
        if (!editing) return;
        get(`show-clinic/${id}`).then((branch) => {
            reset({ name: branch.name, phone: branch.phone, branch: branch.branch });
            setStatus(branch.status);
            setLoading(false);
        });
    }, [editing, id, reset]);

    const onSubmit = (data) => {
        setSaving(true);
        post(editing ? "edit-clinic" : "add-clinic", editing ? { ...data, status, id: +id } : data)
            .then((branch) => {
                toast.success(editing ? "تم حفظ التعديلات" : "تم إضافة الفرع");
                navigate(`/clinics-list/${branch.id}`);
            })
            .catch((err) => {
                setServerErrors(fieldErrors(err));
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    const error = (name) => errors[name]?.message || serverErrors[name];

    if (loading) return <PageLoader />;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
            <PageHeader title={editing ? "تعديل الفرع" : "فرع جديد"} back />
            <Card>
                <CardBody className="space-y-5">
                    <Field label="اسم الفرع" required error={error("name")}>
                        <Input placeholder="مثلاً: فرع مدينة نصر" invalid={!!error("name")} {...register("name", { required: "ادخل اسم الفرع" })} />
                    </Field>
                    <Field label="العنوان" required error={error("branch")}>
                        <Input invalid={!!error("branch")} {...register("branch", { required: "ادخل العنوان" })} />
                    </Field>
                    <Field label="رقم التليفون" required error={error("phone")}>
                        <Input type="tel" dir="ltr" className="text-end" invalid={!!error("phone")} {...register("phone", { required: "ادخل رقم التليفون" })} />
                    </Field>
                    {editing && (
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-slate-700">حالة الفرع</p>
                            <Segmented options={[{ id: "active", name: "مفتوح" }, { id: "closed", name: "مغلق" }]} value={status} onChange={setStatus} />
                            {status === "closed" && (
                                <Alert tone="warning" className="mt-3">
                                    الفرع المغلق بيحتفظ بكل بياناته، لكن مش بيقبل حجوزات جديدة والاستقبال بتوعه مش هيقدروا يدخلوا.
                                </Alert>
                            )}
                        </div>
                    )}
                </CardBody>
            </Card>
            <div className="mt-6 flex gap-3">
                <Button type="submit" loading={saving}>{editing ? "حفظ" : "إضافة الفرع"}</Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>الغاء</Button>
            </div>
        </form>
    );
};

export default Form;
