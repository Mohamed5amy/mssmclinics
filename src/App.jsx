import { ThemeProvider } from "@emotion/react";
import { createTheme } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import LoginAdmin from "./pages/Login_Admins/Login";
import { AuthProvider, RequireAuth } from "react-auth-kit";

import Admins_List from "./pages/Admins/List";
import Admins_Profile from "./pages/Admins/Profile";
import Admins_Add from "./pages/Admins/Add";
import Admins_Edit from "./pages/Admins/Edit";
import ChangePassA from "./pages/Admins/ChangePassA";


import Doctors_List from "./pages/Doctors/List";
import Doctors_Profile from "./pages/Doctors/Profile";
import Doctors_Edit from "./pages/Doctors/Edit";
import Doctors_Add from "./pages/Doctors/Add";

import Clinics_List from "./pages/Clinics/List";
import Clinics_Profile from "./pages/Clinics/Profile";
import Clinics_Edit from "./pages/Clinics/Edit";
import Clinics_Add from "./pages/Clinics/Add";
import ChangePass from "./pages/Clinics/ChangePass";

import Patient_List from "./pages/Patients/List";
import Patient_Profile from "./pages/Patients/Profile";
import Patient_Add from "./pages/Patients/add";
import Patients_Edit from "./pages/Patients/Edit";

import Reservations_List from "./pages/Reservations/List";
import Reservations_Profile from "./pages/Reservations/Profile";
import Reservations_Edit from "./pages/Reservations/Edit";
import Reservations_Add from "./pages/Reservations/Add";


import { Provider } from "react-redux";
import store from "./store"; 
import Settings from "./pages/Settings/Settings";

// import Login_Client from "./pages/Login_Client/Login_Client";

// RTL
import rtlPlugin from 'stylis-plugin-rtl';
import {prefixer} from 'stylis';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import Insights from "./pages/Insights/Insights";


function App() {

    const cacheRtl = createCache({
        key: 'muirtl',
        stylisPlugins: [prefixer, rtlPlugin],
    });

    const theme = createTheme({
        direction: "rtl",
        palette: {
            primary: {
                main: "#69a8a8",
                secondary: "#fc93a3",
                border: "#D9DFEC",
                background: "#ECEFF9",
                white: "#FBFCFE",
                inputs: "#B1BAD2",
                icons: "#545F7D",
            },
            text: {
                primary: "#081330",
                secondary: "#414C6A",
                title: "#050C1E",
            },
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            h1: {
                fontSize: "32px",
                fontWeight: "600",
                lineHeight: "120%",
            },
            h2: {
                fontSize: "24px",
                fontWeight: "500",
                lineHeight: "120%",
            },
            h3: {
                fontSize: "22px",
                fontWeight: "500",
                lineHeight: "160%",
            },
            h4: {
                fontSize: "20px",
                fontWeight: "700",
                lineHeight: "120%",
            },
            title: {
                fontSize: "18px",
                fontWeight: "500",
                lineHeight: "140%",
            },
            subtitle: {
                fontSize: "16px",
                fontWeight: "500",
                lineHeight: "140%",
            },
            body: {
                fontSize: "14px",
                fontWeight: "400",
                lineHeight: "140%",
            },
            inputs: {
                fontSize: "14px",
                fontWeight: "400",
                lineHeight: "140%",
            },
            button: {
                fontSize: "16px",
                fontWeight: "500",
                textTransform: "capitalize",
            },
            label: {
                fontSize: "16px",
                fontWeight: "400",
                lineHeight: "140%",
            },
            breadcrumbs: {
                fontSize: "15px",
                fontWeight: "500",
            },
        },
        spacing: 2,
    });

    return (
        <AuthProvider
            authType={"cookie"}
            authName={"_auth"}
            cookieDomain={window.location.hostname}
            // cookieSecure={window.location.protocol === "https:"}
        >
            <CacheProvider value={cacheRtl} >
                <ThemeProvider theme={theme}>
                    <Provider store={store}>
                        <MyApp />
                    </Provider>
                </ThemeProvider>
            </CacheProvider>
        </AuthProvider>
    );
}

const MyApp = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Login />} path="/" />
                <Route element={<LoginAdmin />} path="/login-admin" />
                {/* Admins */}
                <Route
                    path="/admins-list"
                    element={
                        <RequireAuth loginPath="/">
                            <Admins_List />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/admins-list/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Admins_Profile />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/admins-list/edit/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Admins_Edit />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/admins-list/add"
                    element={
                        <RequireAuth loginPath="/">
                            <Admins_Add />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/admins-list/edit/:id/change-password/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <ChangePassA />
                        </RequireAuth>
                    }
                />
                {/* Doctors */}
                <Route
                    path="/doctors-list"
                    element={
                        <RequireAuth loginPath="/">
                            <Doctors_List />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/doctors-list/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Doctors_Profile />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/doctors-list/edit/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Doctors_Edit />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/doctors-list/add"
                    element={
                        <RequireAuth loginPath="/">
                            <Doctors_Add />
                        </RequireAuth>
                    }
                />
                {/* Patients */}
                <Route
                    path="/patients-list"
                    element={
                        <RequireAuth loginPath="/">
                            <Patient_List />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/patients-list/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Patient_Profile />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/patients-list/add"
                    element={
                        <RequireAuth loginPath="/">
                            <Patient_Add />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/patients-list/edit/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Patients_Edit />
                        </RequireAuth>
                    }
                />
                {/* Clinics */}
                <Route
                    path="/clinics-list"
                    element={
                        <RequireAuth loginPath="/">
                            <Clinics_List />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/clinics-list/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Clinics_Profile />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/clinics-list/edit/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Clinics_Edit />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/clinics-list/add"
                    element={
                        <RequireAuth loginPath="/">
                            <Clinics_Add />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/clinics-list/edit/:id/change-password/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <ChangePass />
                        </RequireAuth>
                    }
                />
                {/* reservations */}
                <Route
                    path="/reservations-list"
                    element={
                        <RequireAuth loginPath="/">
                            <Reservations_List />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/reservations-list/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Reservations_Profile />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/reservations-list/edit/:id"
                    element={
                        <RequireAuth loginPath="/">
                            <Reservations_Edit />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/reservations-list/add"
                    element={
                        <RequireAuth loginPath="/">
                            <Reservations_Add />
                        </RequireAuth>
                    }
                />
                {/* Settings */}
                <Route
                    path="/settings"
                    element={
                        <RequireAuth loginPath="/">
                            <Settings />
                        </RequireAuth>
                    }
                />
                {/* Insights */}
                <Route
                    path="/insights"
                    element={
                        <RequireAuth loginPath="/">
                            <Insights />
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
