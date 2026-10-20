import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSignOut } from "react-auth-kit";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { CalendarPlus, Menu, Search } from "lucide-react";
import { ButtonLink } from "../ui";
import { currentUser } from "../constants/session";
import { SidebarContent } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

// Every signed-in page: the menu on the side, the top bar, and the page itself.
const AppLayout = () => {
    const user = currentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const signOut = useSignOut();

    const [drawer, setDrawer] = useState(false);
    const [search, setSearch] = useState(false);
    const canBook = user.role === "owner" || user.role === "receptionist";

    // Ctrl+K / ⌘K opens the search from anywhere
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearch(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // A fresh page starts at the top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const logOut = () => {
        signOut();
        ["token", "user", "role", "isSuper"].forEach((key) => localStorage.removeItem(key));
        navigate("/");
    };

    return (
        <div className="min-h-screen">
            {/* Menu: fixed on large screens, a drawer on small ones */}
            <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-slate-200 bg-white lg:block">
                <SidebarContent onSignOut={logOut} />
            </aside>
            <Dialog open={drawer} onClose={setDrawer} className="relative z-40 lg:hidden">
                <DialogBackdrop transition className="fixed inset-0 bg-slate-900/40 transition duration-200 data-[closed]:opacity-0" />
                <DialogPanel transition className="fixed inset-y-0 start-0 w-72 bg-white shadow-xl transition duration-200 data-[closed]:translate-x-full">
                    <SidebarContent onNavigate={() => setDrawer(false)} onSignOut={logOut} />
                </DialogPanel>
            </Dialog>

            <div className="lg:ps-64">
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
                    <button
                        type="button"
                        onClick={() => setDrawer(true)}
                        className="-ms-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                        aria-label="القائمة"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setSearch(true)}
                        className="flex h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white"
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <span className="truncate">{user.role === "doctor" ? "انتقل لصفحة..." : "ابحث عن مريض بالاسم او التليفون"}</span>
                        <kbd className="ms-auto hidden rounded border border-slate-200 bg-white px-1.5 font-sans text-[11px] text-slate-400 sm:inline">Ctrl K</kbd>
                    </button>

                    <div className="ms-auto flex items-center gap-2">
                        {canBook && (
                            <ButtonLink to="/reservations-list/add" icon={CalendarPlus} className="hidden sm:inline-flex">
                                حجز جديد
                            </ButtonLink>
                        )}
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <Outlet />
                </main>
            </div>

            <CommandPalette open={search} onClose={() => setSearch(false)} />
        </div>
    );
};

export default AppLayout;
