import { AlertTriangle } from "lucide-react";
import { Alert } from "../../ui";

// The allergies, loud, at the top of a visit - the one thing a doctor mustn't miss.
const AllergyAlert = ({ medical, className }) =>
    medical?.allergies?.length ? (
        <Alert tone="error" icon={AlertTriangle} title={`حساسية: ${medical.allergies.join("، ")}`} className={className} />
    ) : null;

export default AllergyAlert;
