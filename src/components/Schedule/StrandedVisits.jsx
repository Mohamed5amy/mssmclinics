import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Alert } from "../../ui";
import { dayTitle, formatTime } from "../../lib/hours";

/**
 * Why a change of hours was refused: patients already booked in the hours
 * being removed. Each opens its visit, to move or cancel it first.
 */
const StrandedVisits = ({ visits, className }) => (
    <Alert tone="warning" icon={AlertTriangle} title="فيه مرضى محجوزين برة المواعيد الجديدة" className={className}>
        <p>انقل حجوزاتهم لميعاد تاني او الغيها، وبعدين احفظ تاني.</p>
        <ul className="mt-2 space-y-1">
            {visits.map((visit) => (
                <li key={visit.id}>
                    <Link to={`/reservations-list/${visit.id}`} className="font-medium underline underline-offset-2 hover:text-amber-900">
                        {visit.name}
                    </Link>
                    <span className="text-amber-700"> · {dayTitle(visit.date)}{visit.time && ` · ${formatTime(visit.time)}`}</span>
                </li>
            ))}
        </ul>
    </Alert>
);

export default StrandedVisits;
