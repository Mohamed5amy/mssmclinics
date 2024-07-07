import {
    Box,
    Button,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "../../components/Select/Select";


const Reports_Add = () => {
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
    const [error, setError] = useState({});

    // Handle Submit
    const onSubmit = (data) => {
        data.clinic_id = JSON.parse(localStorage.getItem("user")).id
        console.log(data)
        setLoading(true);

        axios
            .post(import.meta.env.VITE_API + "clinic/add-reservation", data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/reservations-list/" + res.data.data.id);
            })
            .catch((err) => {
                console.log(err);
                setError(err?.response?.data);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Get Clients
    const [clients, setClients] = useState([]);
    useEffect(() => {
        axios
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
    }, []);

    // Get Clients
    const [doctors, setDoctors] = useState([]);
    useEffect(() => {
        axios
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
    }, []);

    // Services
    const [services, setServices] = useState([]);
    useEffect(() => {
        axios
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
    }, []);


    return (
        <>
            <Container>
                {/* Back */}
                <Back title={"اضافة حالة"} />
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
                    <Grid container mt={8} spacing={8} mb={8}>
                        <Grid item xs={12} sm={4}>
                             <Select label={"المريض"} register={register} error={errors?.patient_id?.message || (error?.patient_id && error?.patient_id[0])} data={clients} name={"name"} registerName={"patient_id"} required={true} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                             <Select label={"المعالج"} register={register} error={errors?.doctor_id?.message || (error?.doctor_id && error?.doctor_id[0])} data={doctors} name={"name"} registerName={"doctor_id"} required={true} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                             <Select label={"الخدمة"} register={register} error={errors?.service_id?.message || (error?.service_id && error?.service_id[0])} data={services} name={"name"} registerName={"service_id"} required={true} />
                        </Grid>
                    </Grid>
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
                الغاء
            </Button>
            <Button
                variant="contained"
                sx={{ p: "16px 80px", borderRadius: "8px" }}
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
            >
                اضافة
            </Button>
        </Stack>
    );
};

export default Reports_Add;
