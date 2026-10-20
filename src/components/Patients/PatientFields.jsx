import { useEffect } from "react";
import { Field, Input, Select } from "../../ui";
import { SEXES } from "../../constants/visits";
import { useApi } from "../../lib/useApi";

// The patient form's fields, shared by the patient page and the booking
// screen's quick add. `form` is a react-hook-form instance; `serverErrors` the
// API's field errors.
const PatientFields = ({ form, serverErrors = {}, compact = false }) => {
    const { register, formState: { errors } } = form;
    const providers = useApi("providers");
    const error = (name) => errors[name]?.message || serverErrors[name];

    // A saved choice arrives before its options do; show it once they load.
    useEffect(() => {
        if (providers.data) form.setValue("provider_id", form.getValues("provider_id") ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providers.data]);

    return (
        <div className={compact ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
            <Field label="الاسم" required error={error("name")}>
                <Input invalid={!!error("name")} {...register("name", { required: "ادخل اسم المريض" })} />
            </Field>
            <Field label="رقم التليفون" required error={error("phone")}>
                <Input type="tel" dir="ltr" inputMode="tel" className="text-end" invalid={!!error("phone")} {...register("phone", { required: "ادخل رقم التليفون" })} />
            </Field>
            <Field label="النوع" required error={error("sex")}>
                <Select invalid={!!error("sex")} {...register("sex", { required: "اختر النوع" })}>
                    <option value="">اختر</option>
                    {SEXES.map((sex) => <option key={sex.id} value={sex.id}>{sex.name}</option>)}
                </Select>
            </Field>
            <Field label="السن" required error={error("age")}>
                <Input type="number" inputMode="numeric" invalid={!!error("age")} {...register("age", { required: "ادخل السن" })} />
            </Field>
            <Field label="عرفنا عن طريق" required error={error("provider_id")}>
                <Select invalid={!!error("provider_id")} {...register("provider_id", { required: "اختر" })}>
                    <option value="">اختر</option>
                    {providers.data?.map((provider) => <option key={provider.id} value={provider.id}>{provider.title}</option>)}
                </Select>
            </Field>
            <Field label="العنوان" required error={error("address")} className={compact ? "" : ""}>
                <Input invalid={!!error("address")} {...register("address", { required: "ادخل العنوان" })} />
            </Field>
        </div>
    );
};

export default PatientFields;
