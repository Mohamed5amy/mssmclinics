import { useState } from "react";
import { Button, Field, Input, Modal, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";

// Sets a new password for someone else's account: a group owner (platform),
// a doctor or a receptionist (group owner). `endpoint` is the API route.
const ResetPassword = ({ name, id, endpoint, onClose }) => {
    const toast = useToast();
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (password.length < 6) return setError("كلمة المرور 6 خانات على الاقل");
        if (password !== confirmation) return setError("كلمتا المرور غير متطابقتين");

        setSaving(true);
        post(endpoint, { id, password, password_confirmation: confirmation })
            .then(() => {
                toast.success("تم تغيير كلمة المرور");
                onClose();
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="sm"
            title="تغيير كلمة المرور"
            description={name}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>حفظ</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="كلمة المرور الجديدة">
                    <Input type="password" dir="ltr" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoFocus />
                </Field>
                <Field label="تأكيد كلمة المرور" error={error}>
                    <Input type="password" dir="ltr" value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(""); }} invalid={!!error} />
                </Field>
            </div>
        </Modal>
    );
};

export default ResetPassword;
