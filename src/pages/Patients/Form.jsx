import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, PageHeader, PageLoader, useToast } from "../../ui";
import { errorMessage, fieldErrors, get, post } from "../../lib/api";
import PatientFields from "../../components/Patients/PatientFields";

// Registering a patient, or correcting their file. The file belongs to the
// whole group, so any branch can book them afterwards.
const Form = () => {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const toast = useToast();

    const form = useForm();
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(editing);

    useEffect(() => {
        if (!editing) return;
        get(`show-patients/${id}`).then((patient) => {
            form.reset({ name: patient.name, phone: patient.phone, sex: patient.sex, age: patient.age, address: patient.address, provider_id: patient.provider_id });
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, id]);

    const onSubmit = form.handleSubmit((data) => {
        setSaving(true);
        const body = { ...data, age: +data.age, provider_id: +data.provider_id };
        post(editing ? "clinic/edit-patients" : "clinic/add-patients", editing ? { ...body, id: +id } : body)
            .then((patient) => {
                toast.success(editing ? "تم حفظ التعديلات" : `تم تسجيل ${patient.name}`);
                navigate(`/patients-list/${patient.id}`);
            })
            .catch((err) => {
                setServerErrors(fieldErrors(err));
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    });

    if (loading) return <PageLoader />;

    return (
        <form onSubmit={onSubmit} className="max-w-4xl">
            <PageHeader title={editing ? "تعديل ملف المريض" : "مريض جديد"} back />
            <Card>
                <CardBody>
                    <PatientFields form={form} serverErrors={serverErrors} />
                </CardBody>
            </Card>
            <div className="mt-6 flex gap-3">
                <Button type="submit" loading={saving}>{editing ? "حفظ" : "تسجيل المريض"}</Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>الغاء</Button>
            </div>
        </form>
    );
};

export default Form;
