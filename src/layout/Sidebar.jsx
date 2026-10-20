import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { clsx } from "clsx";
import logo from "../images/text.svg";
import { currentUser } from "../constants/session";
import { ROLE_LABELS, navFor } from "./nav";

// The menu column: logo, the role's pages, and who is signed in.
export const SidebarContent = ({ onNavigate, onSignOut }) => {
    const user = currentUser();
    const place = [user.groupName, user.clinicName].filter(Boolean).join(" · ");

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-5">
                <img src={logo} alt="MSSM" className="h-8" />
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                {navFor(user.role).map((group, i) => (
                    <div key={i}>
                        {group.section && <p className="mb-2 px-3 text-xs font-semibold text-slate-400">{group.section}</p>}
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                        clsx(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                                            isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                        )
                                    }
                                >
                                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {(user.name || "?").replace(/^د\.\s*/, "").charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{place || ROLE_LABELS[user.role]}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onSignOut}
                        title="تسجيل الخروج"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut className="h-[18px] w-[18px]" />
                    </button>
                </div>
            </div>
        </div>
    );
};
