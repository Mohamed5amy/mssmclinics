import { useState } from "react";
import { Alert, Button, Field, Input, Modal, useToast } from "../../ui";
import { errorMessage, fieldErrors, post } from "../../lib/api";
import { PASSWORD_HINT, passwordProblem } from "../../lib/password";
import { updateToken } from "../../constants/session";

/**
 * Changing your own password: the current one proves it's you. Every other
 * device signed in to the account is signed out; this one carries on.
 */
const ChangePassword = ({ onClose }) => {
    const toast = useToast();
    const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (key) => (e) => {
        setForm((current) => ({ ...current, [key]: e.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const save = () => {
        const problems = {};
        if (!form.current_password) problems.current_password = "ادخل كلمة المرور الحالية";
        const weak = passwordProblem(form.password);
        if (weak) problems.password = weak;
        else if (form.password !== form.password_confirmation) problems.password_confirmation = "كلمتا المرور غير متطابقتين";
        setErrors(problems);
        if (Object.keys(problems).length) return;

        setSaving(true);
        post("change-password", form)
            .then(({ api_token }) => {
                updateToken(api_token);
                toast.success("تم تغيير كلمة المرور");
                onClose();
            })
            .catch((err) => {
                setErrors(fieldErrors(err));
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="sm"
            title="تغيير كلمة المرور"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>حفظ</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="كلمة المرور الحالية" error={errors.current_password}>
                    <Input type="password" dir="ltr" autoComplete="current-password" value={form.current_password} onChange={set("current_password")} invalid={!!errors.current_password} autoFocus />
                </Field>
                <Field label="كلمة المرور الجديدة" error={errors.password} hint={PASSWORD_HINT}>
                    <Input type="password" dir="ltr" autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!errors.password} />
                </Field>
                <Field label="تأكيد كلمة المرور الجديدة" error={errors.password_confirmation}>
                    <Input type="password" dir="ltr" autoComplete="new-password" value={form.password_confirmation} onChange={set("password_confirmation")} invalid={!!errors.password_confirmation} />
                </Field>
                <Alert tone="info">أي جهاز تاني داخل بحسابك هيخرج، والجهاز ده هيفضل داخل.</Alert>
            </div>
        </Modal>
    );
};

export default ChangePassword;
