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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Popup from "../../components/Popup/Popup";
import useRole from "../../hooks/Role/useRole";




const Profile = () => {
    
    const { id } = useParams();
    const [admin, setAdmin] = useState({});

    useEffect(() => {
        axios
            .get(import.meta.env.VITE_API + "show-patients/" + id, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setAdmin(res.data.data);
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
            .post(
                import.meta.env.VITE_API + "delete-patient",
                { id },
                {
                    headers: {
                        Authorization:
                            "Bearer " + localStorage.getItem("token"),
                    },
                }
            )
            .then((res) => {
                navigate("/patients-list");
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const role = useRole()

    return (
        <Container>
            {/* Header */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 4, sm: 0 }} justifyContent={"space-between"} alignItems={"center"} >
                <Back title={"بيانات المريض"} />
                {role === 3 && <Link onClick={() => localStorage.setItem("admin_edit_data",JSON.stringify(admin))} to={"/patients-list/edit/" + admin?.id} >
                    <Button sx={{ p: "16px 40px", borderRadius: "8px" }} variant="contained" > تعديل الملف الشخصي </Button>
                </Link>}
            </Stack>
            {/* Box Content */}
            <AdminData admin={admin} setOpen={setOpen} />
            {/* Popup */}
            <Popup
                open={open}
                setOpen={setOpen}
                message={"هل انت متأكد انك تريد حذف هذا المريض ؟"}
                type="delete"
                fn={handleDelete}
            />
        </Container>
    );
};

const AdminData = ({ admin, setOpen }) => {

    const role = useRole()

    const data = [
        {
            key: "الاسم :",
            value: admin?.name,
        },
        {
            key: "رقم الهاتف :",
            value: admin?.phone,
        },
        {
            key: "الجنس :",
            value: admin?.sex,
        },
        {
            key: "العمر :",
            value: admin?.age,
        },
        {
            key: "العنوان :",
            value: admin?.address,
        },
        
    ];

    const data2 = [
        {
            key: role === 3 ? "اسم العيادة" : "العيادة :",
            value: role === 3 ? admin?.clinicName : admin?.clinicBranch,
        },
        {
            key: "عدد الزيارات :",
            value: admin?.reservations?.length,
        },
        {
            key: "عميل منذ :",
            value: admin?.created_at?.slice(0 , 10),
        },
        {
            key: "عن طريق :",
            value: admin?.providerName,
        },
    ];

    return (
        <Box
            bgcolor={"primary.white"}
            p={"32px 16px"}
            borderRadius={"12px"}
            mt={8}
        >
            {/* Name && Icons */}
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
                <Stack spacing={4}>
                    <Typography variant="h3"> {admin?.name} </Typography>
                    <Typography variant="body"> {admin?.phone} </Typography>
                </Stack>
                {/* Icons */}
                {role == 3 && <Stack spacing={4} direction={"row"} alignItems={"center"}>
                    <IconButton color="error" onClick={() => setOpen(true)}>
                        <DeleteOutlineRoundedIcon />
                    </IconButton>
                </Stack>}
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
    );
};

export default Profile;
