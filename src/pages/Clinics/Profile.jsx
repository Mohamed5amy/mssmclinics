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

const Profile = () => {
    const { id } = useParams();
    const role = useRole();
    const [client, setClient] = useState({});


    useEffect(() => {
        axios
            .get(import.meta.env.VITE_API + "show-clinic/" + id, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setClient(res.data.data);
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
                import.meta.env.VITE_API + "delete-clinic",
                { id },
                {
                    headers: {
                        Authorization:
                            "Bearer " + localStorage.getItem("token"),
                    },
                }
            )
            .then((res) => {
                navigate("/clinics-list");
                console.log(res.data.data);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const data = [
        {
            key: "اسم العيادة :",
            value: client?.name,
        },
        {
            key: "رقم الجوال :",
            value: client?.phone,
        },
        {
            key: "الايميل :",
            value: client?.email,
        },
        {
            key: "العنوان :",
            value: client?.branch,
        },
        {
            key: "تاريخ الاضافة :",
            value: client?.created_at?.slice(0, 10),
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
                <Back title={"بيانات العيادة"} />
                {role === 2 && "superAdmin" && (
                    <Link
                        onClick={() =>
                            localStorage.setItem(
                                "admin_edit_data",
                                JSON.stringify(client)
                            )
                        }
                        to={"/clinics-list/edit/" + id}
                    >
                        {" "}
                        <Button
                            sx={{ p: "16px 40px", borderRadius: "8px" }}
                            variant="contained"
                        >
                            {" "}
                            تعديل بيانات العيادة{" "}
                        </Button>{" "}
                    </Link>
                )}
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
                        <Typography variant="h3">{client?.name}</Typography>
                    </Stack>
                    {/* Plan */}
                    <Stack direction={"row"} alignItems={"center"} spacing={4}>
                        <IconButton color="error" onClick={() => setOpen(true)}>
                            {" "}
                            <DeleteOutlineRoundedIcon />{" "}
                        </IconButton>
                    </Stack>
                </Stack>
                {/* Profile Data */}
                <Grid container>
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
                                            {" "}
                                            {item.key}{" "}
                                        </Typography>
                                        <Typography
                                            width={"250px"}
                                            variant="subtitle"
                                        >
                                            {" "}
                                            {item.value}{" "}
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            {/* Popup */}
            <Popup
                open={open}
                setOpen={setOpen}
                message={"هل انت متأكد من انك تريد حذف هذه العيادة ؟"}
                type="delete"
                fn={handleDelete}
            />
        </Container>
    );
};

export default Profile;
