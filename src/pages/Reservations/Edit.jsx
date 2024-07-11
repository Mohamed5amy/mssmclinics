import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Input from "../../components/Input/Input";
import useRole from "../../hooks/Role/useRole";


const Clients_Edit = () => {

    const {id} = useParams()

    const data = JSON.parse(localStorage.getItem("admin_edit_data"))

    // USE FORM
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();


    // Loading
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Error
    // const [error, setError] = useState({});

    const role = useRole();

    // Handle Submit
    const onSubmit = (data) => {
        
        data.id = id
        
        console.log(data)

        setLoading(true);

        axios
            .post(import.meta.env.VITE_API + (role == 3 ? "clinic/edit-reservation" : "doctor/update-reservations") , data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/reservations-list/" + res.data.data.id);
            })
            .catch((err) => {
                console.log(err.response.data.message);
                // setError(err?.response?.data?.message);
            })
            .finally(() => {
                setLoading(false);
            });
    };


    // Get Clients
    const [clients, setClients] = useState([]);
    const [ayHaga, setAyHaga] = useState(false);

    useEffect(() => {
        role === 3 && axios
            .get(import.meta.env.VITE_API + "list-patients", {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                setClients(res.data.data);
                console.log(res.data.data);
            })
            .catch((err) => {
                console.log(err.response.data);
            });
    }, [role]);

    // Get Clients
    const [doctors, setDoctors] = useState([]);
    const [ayHaga2, setAyHaga2] = useState(false);

    useEffect(() => {
        role === 3 && axios
            .get(import.meta.env.VITE_API + "list-doctors", {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                setDoctors(res.data.data);
                console.log(res.data.data);
            })
            .catch((err) => {
                console.log(err.response.data);
            });
    }, [role]);


    // Services
    const [services, setServices] = useState([]);
    const [ayHaga3, setAyHaga3] = useState(false);
    const [ayHaga4, setAyHaga4] = useState(false);

    useEffect(() => {
        role === 3 && axios
            .get(import.meta.env.VITE_API + "services", {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                setServices(res.data.data);
                console.log(res.data.data);
            })
            .catch((err) => {
                console.log(err.response.data);
            });
    }, [role]);

    return (
        <>
            <Container>
                {/* Back */}
                <Back title={"تعديل الحالة"} />
                {/* Client Data */}
                <Box
                    bgcolor={"primary.white"}
                    p={"32px 16px"}
                    borderRadius={"12px"}
                    my={8}
                >
                    <Typography variant="title" fontWeight={"500"}>
                        بيانات الحالة
                    </Typography>
                    {role === 3 && <Grid container mt={8} spacing={8} mb={8}>
                        <Grid item xs={12} sm={4}>
                            <Stack alignItems={"start"} spacing={4}>
                                <Typography
                                    variant="label"
                                    color={"text.secondary"}
                                >
                                    {" "}
                                    المريض{" "}
                                    <span style={{ color: "red" }}>*</span>{" "}
                                </Typography>

                                <TextField
                                    {...register("patient_id", {
                                        required: "This Field is required",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.patient_id && !ayHaga
                                            ? true
                                            : false
                                    }
                                    color="primary"
                                    sx={{
                                        borderRadius: "8px !important",
                                        border: "1px solid",
                                        borderColor: "primary.border",
                                        bgcolor: "#eceff9",
                                    }}
                                    defaultValue={data?.patient_id || ""}
                                    onChange={() => setAyHaga(true)}
                                >
                                    {clients &&
                                        clients.map((item) => {
                                            return (
                                                <MenuItem
                                                    value={item.id}
                                                    key={item.id}
                                                >
                                                    {" "}
                                                    {item.name}{" "}
                                                </MenuItem>
                                            );
                                        })}
                                </TextField>

                                {errors?.patient_id?.message && !ayHaga && (
                                    <Stack
                                        direction={"row"}
                                        alignItems={"center"}
                                        spacing={4}
                                    >
                                        <ErrorOutlineIcon
                                            sx={{ color: "red" }}
                                        />
                                        <Typography
                                            color={"red"}
                                            fontSize={"14px"}
                                            fontWeight={"500"}
                                        >
                                            {" "}
                                            {errors.patient_id.message}{" "}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack alignItems={"start"} spacing={4}>
                                <Typography
                                    variant="label"
                                    color={"text.secondary"}
                                >
                                    {" "}
                                    الطبيب{" "}
                                    <span style={{ color: "red" }}>*</span>{" "}
                                </Typography>

                                <TextField
                                    {...register("doctor_id", {
                                        required: "This Field is required",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.doctor_id && !ayHaga2
                                            ? true
                                            : false
                                    }
                                    color="primary"
                                    sx={{
                                        borderRadius: "8px !important",
                                        border: "1px solid",
                                        borderColor: "primary.border",
                                        bgcolor: "#eceff9",
                                    }}
                                    defaultValue={data?.doctor_id || ""}
                                    onChange={() => setAyHaga2(true)}
                                >
                                    {doctors &&
                                        doctors.map((item) => {
                                            return (
                                                <MenuItem
                                                    value={item.id}
                                                    key={item.id}
                                                >
                                                    {" "}
                                                    {item.name}{" "}
                                                </MenuItem>
                                            );
                                        })}
                                </TextField>

                                {errors?.doctor_id?.message && !ayHaga2 && (
                                    <Stack
                                        direction={"row"}
                                        alignItems={"center"}
                                        spacing={4}
                                    >
                                        <ErrorOutlineIcon
                                            sx={{ color: "red" }}
                                        />
                                        <Typography
                                            color={"red"}
                                            fontSize={"14px"}
                                            fontWeight={"500"}
                                        >
                                            {" "}
                                            {errors.doctor_id.message}{" "}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack alignItems={"start"} spacing={4}>
                                <Typography
                                    variant="label"
                                    color={"text.secondary"}
                                >
                                    {" "}
                                    الخدمة{" "}
                                    <span style={{ color: "red" }}>*</span>{" "}
                                </Typography>

                                <TextField
                                    {...register("service_id", {
                                        required: "This Field is required",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.service_id && !ayHaga3
                                            ? true
                                            : false
                                    }
                                    color="primary"
                                    sx={{
                                        borderRadius: "8px !important",
                                        border: "1px solid",
                                        borderColor: "primary.border",
                                        bgcolor: "#eceff9",
                                    }}
                                    defaultValue={data?.service_id || ""}
                                    onChange={() => setAyHaga3(true)}
                                >
                                    {services &&
                                        services.map((item) => {
                                            return (
                                                <MenuItem
                                                    value={item.id}
                                                    key={item.id}
                                                >
                                                    {" "}
                                                    {item.name}{" "}
                                                </MenuItem>
                                            );
                                        })}
                                </TextField>

                                {errors?.service_id?.message && !ayHaga3 && (
                                    <Stack
                                        direction={"row"}
                                        alignItems={"center"}
                                        spacing={4}
                                    >
                                        <ErrorOutlineIcon
                                            sx={{ color: "red" }}
                                        />
                                        <Typography
                                            color={"red"}
                                            fontSize={"14px"}
                                            fontWeight={"500"}
                                        >
                                            {" "}
                                            {errors.service_id.message}{" "}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack alignItems={"start"} spacing={4}>
                                <Typography
                                    variant="label"
                                    color={"text.secondary"}
                                >
                                    {" "}
                                    حالة الكشف{" "}
                                    <span style={{ color: "red" }}>*</span>{" "}
                                </Typography>

                                <TextField
                                    {...register("status", {
                                        required: "This Field is required",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.status && !ayHaga4
                                            ? true
                                            : false
                                    }
                                    color="primary"
                                    sx={{
                                        borderRadius: "8px !important",
                                        border: "1px solid",
                                        borderColor: "primary.border",
                                        bgcolor: "#eceff9",
                                    }}
                                    defaultValue={data?.status}
                                    onChange={() => setAyHaga4(true)}
                                >
                                    <MenuItem value={"ملغي"}>
                                        ملغي
                                    </MenuItem>
                                    <MenuItem value={"فى الانتظار"}>
                                        فى الانتظار
                                    </MenuItem>
                                    <MenuItem value={"مكتمل"}>
                                        مكتمل
                                    </MenuItem>
                                </TextField>

                                {errors?.status?.message && !ayHaga4 && (
                                    <Stack
                                        direction={"row"}
                                        alignItems={"center"}
                                        spacing={4}
                                    >
                                        <ErrorOutlineIcon
                                            sx={{ color: "red" }}
                                        />
                                        <Typography
                                            color={"red"}
                                            fontSize={"14px"}
                                            fontWeight={"500"}
                                        >
                                            {" "}
                                            {errors.status.message}{" "}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>}
                    {(role === 4 || role === 3) && <Stack mt={8}>
                        <Input
                            required={true}
                            type={"text"}
                            label={"التشخيص"}
                            register={register}
                            registerName="Diagnosis"
                            defaultValue={data?.Diagnosis}
                            error={errors?.Diagnosis?.message}
                            multiline={true}
                        />
                    </Stack>}
                </Box>
                {/* Submit */}
                <Submit
                    onSubmit={onSubmit}
                    handleSubmit={handleSubmit}
                    loading={loading}
                />
            </Container>
        </>
    );
};

const Submit = ({ onSubmit, handleSubmit, loading }) => {
    return (
        <Stack direction={{xs : "column" , sm : "row"}} spacing={12} justifyContent={"end"} my={20}>
            <Button
                variant="outlined"
                sx={{ p: "16px 80px", borderRadius: "8px" }}
                onClick={() => history.back()}
            >
                {" "}
                الغاء{" "}
            </Button>
            <Button
                variant="contained"
                sx={{ p: "16px 80px", borderRadius: "8px" }}
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
            >
                {" "}
                حفظ{" "}
            </Button>
        </Stack>
    );
};

export default Clients_Edit;
