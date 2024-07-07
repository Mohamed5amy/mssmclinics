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

const Profile = () => {
    
    const { id } = useParams();
    const [admin, setAdmin] = useState({});

    useEffect(() => {
        axios
            .get(import.meta.env.VITE_API + "admin/" + id, {
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
            .get(
                import.meta.env.VITE_API + "delete-admin/" + id,
                {
                    headers: {
                        Authorization:
                            "Bearer " + localStorage.getItem("token"),
                    },
                }
            )
            .then((res) => {
                navigate("/admins-list");
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    return (
        <Container>
            {/* Header */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 4, sm: 0 }} justifyContent={"space-between"} alignItems={"center"}>
                <Back title={"بيانات المدير"} />
                <Link onClick={() =>localStorage.setItem("admin_edit_data", JSON.stringify(admin))} to={"/admins-list/edit/" + admin?.id}>
                    <Button sx={{ p: "16px 40px", borderRadius: "8px" }} variant="contained">تعديل الملف الشخصي</Button>
                </Link>
            </Stack>
            {/* Box Content */}
            <AdminData admin={admin} setOpen={setOpen} />
            {/* Popup */}
            <Popup open={open} setOpen={setOpen} message={"هل انت متأكد انك تريد حذف هذا المدير ؟"} type="delete" fn={handleDelete} />
        </Container>
    );
};

const AdminData = ({ admin, setOpen }) => {

    const data = [
        {
            key: "الاسم :",
            value: admin?.name,
        },
        {
            key: "الايميل :",
            value: admin?.email,
        },
    ];

    return (
        <Box bgcolor={"primary.white"} p={"32px 16px"} borderRadius={"12px"} mt={8}>
            {/* Name && Icons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 4, sm: 0 }} justifyContent={"space-between"} pb={8} mb={12} borderBottom={"1px solid"} borderColor={"primary.border"}>
                {/* Name */}
                <Stack spacing={4}>
                    <Typography variant="h3"> {admin?.name} </Typography>
                    <Typography variant="body"> {admin?.email} </Typography>
                </Stack>
                {/* Icons */}
                <Stack spacing={4} direction={"row"} alignItems={"center"}>
                    <IconButton color="error" onClick={() => setOpen(true)}><DeleteOutlineRoundedIcon /></IconButton>
                </Stack>
            </Stack>
            {/* Profile Data */}
            <Grid container>
                <Grid item xs={12} md={6}>
                    <Stack spacing={8}>
                        {data?.map((item, i) => {
                            return (
                                <Stack direction={{xs : "column" , sm : "row"}} spacing={{xs : 2 , sm : 12}} key={i}> 
                                    <Typography width={"100px"} variant="subtitle" color={"text.secondary"}>{item.key}</Typography>
                                    <Typography width={"250px"} variant="subtitle">{item.value}</Typography>
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
