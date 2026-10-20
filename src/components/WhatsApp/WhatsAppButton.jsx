import { MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass } from "../../ui";
import { waLink } from "../../lib/whatsapp";

/**
 * Opens a WhatsApp chat with the patient, the message already written. Without
 * a phone number there is no one to send to, so it shows disabled.
 *   onSent: runs as the chat opens (e.g. to mark a reminder as sent)
 */
const WhatsAppButton = ({ phone, text, onSent, size = "md", className, children }) => {
    const classes = clsx(buttonClass("secondary", size), "border-emerald-200 text-emerald-700 hover:bg-emerald-50", className);
    if (!phone) {
        return (
            <span className={clsx(classes, "cursor-not-allowed opacity-50")} title="مفيش رقم تليفون للمريض">
                <MessageCircle className="h-4 w-4" />
                {children}
            </span>
        );
    }
    return (
        <a href={waLink(phone, text)} target="_blank" rel="noopener noreferrer" onClick={() => onSent?.()} className={classes}>
            <MessageCircle className="h-4 w-4" />
            {children}
        </a>
    );
};

export default WhatsAppButton;
