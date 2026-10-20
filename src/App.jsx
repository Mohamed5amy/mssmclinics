import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "react-auth-kit";
import { ToastProvider } from "./ui";
import { homeFor } from "./constants/roles";
import AppLayout from "./layout/AppLayout";
import Login from "./pages/Login/Login";

import Insights from "./pages/Insights/Insights";
import Groups_List from "./pages/Groups/List";
import Groups_Profile from "./pages/Groups/Profile";
import Groups_Form from "./pages/Groups/Form";
import Clinics_List from "./pages/Clinics/List";
import Clinics_Profile from "./pages/Clinics/Profile";
import Clinics_Form from "./pages/Clinics/Form";
import Doctors_List from "./pages/Doctors/List";
import Doctors_Profile from "./pages/Doctors/Profile";
import Doctors_Form from "./pages/Doctors/Form";
import Receptionists from "./pages/Receptionists/Receptionists";
import Patients_List from "./pages/Patients/List";
import Patients_Profile from "./pages/Patients/Profile";
import Patients_Form from "./pages/Patients/Form";
import Reservations_List from "./pages/Reservations/List";
import Reservations_Profile from "./pages/Reservations/Profile";
import Reservations_Add from "./pages/Reservations/Add";
import Reservations_Edit from "./pages/Reservations/Edit";
import Queue from "./pages/Queue/Queue";
import Schedules from "./pages/Schedules/Schedules";
import Cash from "./pages/Cash/Cash";
import Reminders from "./pages/Reminders/Reminders";
import Statement from "./pages/Statement/Statement";
import Activity from "./pages/Activity/Activity";
import Settings from "./pages/Settings/Settings";

// Pages only some accounts may open (by the role name the API returns);
// anyone else lands on their own home page.
const RequireRole = ({ roles }) => {
    const role = localStorage.getItem("role");
    return roles.includes(role) ? <Outlet /> : <Navigate to={homeFor(role)} replace />;
};

const PLATFORM = ["admin"];
const OWNER = ["owner"];
const MANAGEMENT = ["admin", "owner"];
const DESK = ["owner", "receptionist"];
const STAFF = ["admin", "owner", "receptionist"];
const EVERYONE = ["admin", "owner", "receptionist", "doctor"];
const EARNERS = ["owner", "doctor"];

function App() {
    return (
        <AuthProvider authType={"cookie"} authName={"_auth"} cookieDomain={window.location.hostname}>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        {/* One sign-in page for every account */}
                        <Route path="/" element={<Login />} />
                        <Route path="/login-admin" element={<Navigate to="/" replace />} />

                        <Route
                            element={
                                <RequireAuth loginPath="/">
                                    <AppLayout />
                                </RequireAuth>
                            }
                        >
                            <Route element={<RequireRole roles={MANAGEMENT} />}>
                                <Route path="/insights" element={<Insights />} />
                                <Route path="/activity" element={<Activity />} />
                                <Route path="/clinics-list" element={<Clinics_List />} />
                                <Route path="/clinics-list/:id" element={<Clinics_Profile />} />
                                <Route path="/doctors-list" element={<Doctors_List />} />
                                <Route path="/doctors-list/:id" element={<Doctors_Profile />} />
                                <Route path="/receptionists" element={<Receptionists />} />
                            </Route>

                            <Route element={<RequireRole roles={PLATFORM} />}>
                                <Route path="/groups" element={<Groups_List />} />
                                <Route path="/groups/add" element={<Groups_Form />} />
                                <Route path="/groups/edit/:id" element={<Groups_Form />} />
                                <Route path="/groups/:id" element={<Groups_Profile />} />
                            </Route>

                            <Route element={<RequireRole roles={OWNER} />}>
                                <Route path="/clinics-list/add" element={<Clinics_Form />} />
                                <Route path="/clinics-list/edit/:id" element={<Clinics_Form />} />
                                <Route path="/doctors-list/add" element={<Doctors_Form />} />
                                <Route path="/doctors-list/edit/:id" element={<Doctors_Form />} />
                                <Route path="/settings" element={<Settings />} />
                            </Route>

                            <Route element={<RequireRole roles={STAFF} />}>
                                <Route path="/patients-list" element={<Patients_List />} />
                                <Route path="/patients-list/:id" element={<Patients_Profile />} />
                            </Route>

                            <Route element={<RequireRole roles={DESK} />}>
                                <Route path="/patients-list/add" element={<Patients_Form />} />
                                <Route path="/patients-list/edit/:id" element={<Patients_Form />} />
                                <Route path="/reservations-list/add" element={<Reservations_Add />} />
                                <Route path="/cash" element={<Cash />} />
                                <Route path="/reminders" element={<Reminders />} />
                                <Route path="/reservations-list/edit/:id" element={<Reservations_Edit />} />
                            </Route>

                            <Route element={<RequireRole roles={EARNERS} />}>
                                <Route path="/statement" element={<Statement />} />
                            </Route>

                            <Route element={<RequireRole roles={EVERYONE} />}>
                                <Route path="/queue" element={<Queue />} />
                                <Route path="/schedules" element={<Schedules />} />
                                <Route path="/reservations-list" element={<Reservations_List />} />
                                <Route path="/reservations-list/:id" element={<Reservations_Profile />} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
