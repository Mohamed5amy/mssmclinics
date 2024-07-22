import {
    Box,
    Button,
    Grid,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import Container from "../../components/Container/Container";
import Back from "../../components/Back/Back";
import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import Popup from "../../components/Popup/Popup";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import useRole from "../../hooks/Role/useRole";



const Reports_Profile = () => {
    const { id } = useParams();
    const role = useRole();
    const [client, setClient] = useState({});

    useEffect(() => {
        axios
            .get(import.meta.env.VITE_API + "show-reservation/" + id, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res?.data?.data)
                setClient(res?.data?.data)
            })
            .catch((err) => {
                console.log(err);
            });
    }, [id]);

    // handle delete
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleDelete = () => {
        axios
            .post(import.meta.env.VITE_API + "delete-reservation" , { id }, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/reservations-list");
                console.log(res.data.data);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const data = [
        {
            key: "اسم المريض :",
            value: client?.name,
        },
        {
            key: "اسم الطبيب :",
            value: client?.doctorName,
        },
        {
            key: "التخصص :",
            value: client?.doctorSpecalite,
        },
        {
            key: "الوقت :",
            value: client?.time,
        },
        {
            key: "التاريخ :",
            value: client?.CustomDate,
        },
        // {
        //     key: "العيادة :",
        //     value: client?.clinicBranch,
        // },
        // {
        //     key: "مسؤول العيادة :",
        //     value: client?.clinicName,
        // },
    ];

    // const handleRole = (role) => {
    //     if (role == 1) return "مكتمل"
    //     if (role == 2) return "فى الانتظار"
    //     if (role == 0) return "ملغي"
    // }

    const data2 = [
        {
            key: "الخدمة :",
            value: client?.serviceName,
        },
        {
            key: "سعر الخدمة :",
            value: client?.price + " جنيه",
        },
        {
            key: "نسبة الطبيب :",
            value: client?.price  * client?.doctor?.prectange / 100 + " جنيه" ,
        },
        {
            key: "الحالة :",
            value: client?.status,
        },
    ];

    return (
        <Container>
            {/* Header */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 4, sm: 0 }}
                justifyContent={"space-between"}
                alignItems={"center"}
            >
                <Back title={"بيانات الحالة"} />

                {(role === 3 || role === 4) && <Link onClick={() => localStorage.setItem( "admin_edit_data", JSON.stringify(client) ) } to={"/reservations-list/edit/" + id}>
                    <Button sx={{ p: "16px 40px", borderRadius: "8px" }} variant="contained" > {role === 4 ? "اضافة تشخيص" : "تعديل الحالة" } </Button>
                </Link>}
            </Stack>
            {/* Box Content */}
            <Box
                bgcolor={"primary.white"}
                p={"32px 16px"}
                borderRadius={"12px"}
                mt={8}
            >
                {/* Name */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 4, sm: 0 }}
                    justifyContent={"space-between"}
                    pb={8}
                    mb={12}
                    borderBottom={"1px solid"}
                    borderColor={"primary.border"}
                >
                    {/* Name */}
                    <Stack>
                        <Typography variant="h3">
                        رقم الحالة  :<span style={{color : "#545F7D"}} > {client?.id}</span>
                        </Typography>
                    </Stack>
                    {/* Delete */}
                    {role == 3 && (
                        <Stack
                            direction={"row"}
                            alignItems={"center"}
                            spacing={4}
                        >
                            <IconButton
                                color="error"
                                onClick={() => setOpen(true)}
                            >
                                
                                <DeleteOutlineRoundedIcon />
                            </IconButton>
                        </Stack>
                    )}
                </Stack>
                {/* Profile Data */}
                <Grid container spacing={{ xs: 8, md: 0 }}>
                    {/* Left */}
                    <Grid item xs={12} md={6}>
                        <Stack spacing={8}>
                            {data?.map((item, i) => {
                                return (
                                    <Stack
                                        direction={{xs : "column" , sm : "row"}} 
                                        spacing={{xs : 2 , sm : 12}}
                                        key={i}
                                    >
                                        <Typography
                                            width={"170px"}
                                            variant="subtitle"
                                            color={"text.secondary"}
                                        >
                                            
                                            {item.key}
                                        </Typography>
                                        <Typography
                                            width={"250px"}
                                            variant="subtitle"
                                        >
                                            
                                            {item.value}
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Grid>
                    {/* Right */}
                    <Grid item xs={12} md={6}>
                        <Stack spacing={8}>
                            {data2?.map((item, i) => {
                                return (
                                    <Stack
                                        direction={{xs : "column" , sm : "row"}} 
                                        spacing={{xs : 2 , sm : 12}}
                                        key={i}
                                    >
                                        <Typography
                                            width={"170px"}
                                            variant="subtitle"
                                            color={"text.secondary"}
                                        >
                                            
                                            {item.key}
                                        </Typography>
                                        <Typography
                                            width={"250px"}
                                            variant="subtitle"
                                        >
                                            
                                            {item.value}
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
            {/* Diagnosis */}
            {role !== "clinic" && <Box bgcolor={"primary.white"} p={"32px 16px"} borderRadius={"12px"} mt={8}>
                {/* Name */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 4, sm: 0 }}
                    justifyContent={"space-between"}
                    pb={8}
                    mb={12}
                    borderBottom={"1px solid"}
                    borderColor={"primary.border"}
                >
                    {/* Name */}
                    <Stack><Typography variant="h3">التشخيص</Typography></Stack>
                </Stack>
                {/* Profile Data */}
                <Grid container spacing={{ xs: 8, md: 0 }}>
                    <Typography fontSize={16} fontWeight={500} color={"text.secondary"} >
                        {client?.Diagnosis ? client?.Diagnosis : "لا يوجد تشخيص حتي الان"}
                    </Typography>
                </Grid>
            </Box>}
            {/* Popup */}
            <Popup
                open={open}
                setOpen={setOpen}
                message={"هل انت متأكد انك تريد حذف هذا الحالة ؟"}
                type="delete"
                fn={handleDelete}
            />
        </Container>
    );
};


export default Reports_Profile;
