import { Stack, Typography } from "@mui/material";
import "./Sidebar.scss";
import { NavLink, useNavigate } from "react-router-dom";
// icons
import LogoutIcon from "@mui/icons-material/Logout";

// images
import textImg from "../../images/text.png";
import iconImg from "../../images/logo.png";
import { useSignOut } from "react-auth-kit";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SettingsIcon from "@mui/icons-material/Settings";
import SummarizeIcon from "@mui/icons-material/Summarize";
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import useRole from "../../hooks/Role/useRole";
import DashboardIcon from '@mui/icons-material/Dashboard';

const Sidebar = ({ activeMobile, active, setActive, expand }) => {
    // Admin Elements

    const elements = [
        {
            name: "الاحصائيات",
            icon: <DashboardIcon />,
            to: "/insights",
            role: [3],
        },
        {
            name: "المديرون",
            icon: <SupervisorAccountIcon />,
            to: "/admins-list",
            role: [1],
        },
        {
            name: "الدكاترة",
            icon: <SupervisorAccountIcon />,
            to: "/doctors-list",
            role: [1 ,2 , 3],
        },
        {
            name: "المرضي",
            icon: <MedicalServicesIcon />,
            to: "/patients-list",
            role: [1, 2 , 3],
        },
        {
            name: "العيادات",
            icon: <LocalHospitalIcon />,
            to: "/clinics-list",
            role: [1 , 2],
        },
        {
            name: "الكشوفات",
            icon: <SummarizeIcon />,
            to: "/reservations-list",
            role: [1, 2 , 3 , 4],
        },
        {
            name: "الاعدادات",
            icon: <SettingsIcon />,
            to: "/settings",
            role: [3],
        },
    ];

    const signOut = useSignOut();
    const navigate = useNavigate();

    // handle logOut
    const logOut = () => {
        signOut();
        navigate("/");
    };

    const role = useRole()
    
    return (
        <div
            className={`Sidebar ${activeMobile ? "active" : ""}`}
            onMouseEnter={() => setActive(true)}
            onMouseLeave={() => !expand && setActive(false)}
        >
            <Stack pr={active ? 24 : 0} pt={15} bgcolor={"primary.white"} height={"100%"}>
                {/* Image */}
                <Stack mb={28} pl={active ? 20 : 15}>
                    {!active && <img src={iconImg} alt="logo" width={50} />}
                    {active && <img src={textImg} alt="logo" width={"100%"} />}
                </Stack>
                {/* Items */}
                <Stack spacing={8}>
                    {elements.map((el, i) => {
                        if (
                            el.role.filter((item) => item === role)[0]) {
                            return (
                                <NavLink className={"item"} key={i} to={el.to}>
                                    <Stack direction={"row"} alignItems={"center"} spacing={8} px={20} py={5} >
                                        {el.icon}
                                        {active && (<Typography variant="subtitle">{el.name}</Typography>)}
                                    </Stack>
                                </NavLink>
                            );
                        }
                    })}
                </Stack>
                {/* Logout for mobile */}
                <Stack
                    direction={"row"}
                    spacing={8}
                    onClick={logOut}
                    sx={{
                        position: "absolute",
                        bottom: "40px",
                        left: "40px",
                        color: "primary.icons",
                        cursor: "pointer",
                        transition: ".5s",
                        "&:hover": {
                            color: "red",
                        },
                    }}
                >
                    <LogoutIcon />
                    {active && (
                        <Typography variant="subtitle">
                            تسجيل الخروج
                        </Typography>
                    )}
                </Stack>
            </Stack>
        </div>
    );
};

export default Sidebar;
