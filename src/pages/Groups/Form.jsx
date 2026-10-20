import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader, PageLoader, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";

// A new group and the owner account that will run it, or editing them.
// The password of an existing owner is reset from the group's page.
const Form = () => {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const toast = useToast();

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(editing);

    useEffect(() => {
        if (!editing) return;
        get(`show-group/${id}`).then((group) => {
            const owner = group.owners?.[0] ?? {};
            reset({ name: group.name, phone: group.phone, owner_name: owner.name, owner_phone: owner.phone, owner_email: owner.email });
            setLoading(false);
        });
    }, [editing, id, reset]);

    const onSubmit = (data) => {
        setSaving(true);
        setServerErrors({});
        post(editing ? "edit-group" : "add-group", editing ? { ...data, id: +id } : data)
            .then((group) => {
                toast.success(editing ? "تم حفظ التعديلات" : "تم إنشاء المجموعة");
                navigate(`/groups/${group.id}`);
            })
            .catch((err) => {
                const errs = fieldErrors(err);
                if (err?.response?.status === 409) errs.owner_email = "هذا الايميل مسجل بالفعل";
                setServerErrors(errs);
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    const error = (name) => errors[name]?.message || serverErrors[name];

    if (loading) return <PageLoader />;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
            <PageHeader title={editing ? "تعديل المجموعة" : "مجموعة جديدة"} subtitle={editing ? undefined : "المالك بيضيف الفروع والدكاترة والاستقبال بعد كده"} back />

            <Card>
                <CardHeader title="بيانات المجموعة" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="اسم المجموعة" required error={error("name")}>
                        <Input invalid={!!error("name")} {...register("name", { required: "ادخل اسم المجموعة" })} />
                    </Field>
                    <Field label="رقم التليفون" error={error("phone")}>
                        <Input type="tel" dir="ltr" className="text-end" {...register("phone")} />
                    </Field>
                </CardBody>
            </Card>

            <Card className="mt-6">
                <CardHeader title="صاحب المجموعة" description="حسابه اللي بيدير المجموعة" />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="الاسم" required error={error("owner_name")}>
                        <Input invalid={!!error("owner_name")} {...register("owner_name", { required: "ادخل الاسم" })} />
                    </Field>
                    <Field label="رقم الهاتف" error={error("owner_phone")}>
                        <Input type="tel" dir="ltr" className="text-end" {...register("owner_phone")} />
                    </Field>
                    <Field label="الايميل" required error={error("owner_email")}>
                        <Input type="email" dir="ltr" invalid={!!error("owner_email")} {...register("owner_email", { required: "ادخل الايميل" })} />
                    </Field>
                    {!editing && (
                        <Field label="كلمة المرور" required error={error("owner_password")} hint="6 خانات على الاقل">
                            <Input type="password" dir="ltr" invalid={!!error("owner_password")} {...register("owner_password", { required: "ادخل كلمة المرور", minLength: { value: 6, message: "6 خانات على الاقل" } })} />
                        </Field>
                    )}
                </CardBody>
            </Card>

            <div className="mt-6 flex gap-3">
                <Button type="submit" loading={saving}>{editing ? "حفظ" : "إنشاء المجموعة"}</Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>الغاء</Button>
            </div>
        </form>
    );
};

export default Form;
