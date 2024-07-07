import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";


const Admins_Edit = () => {
    // USE FORM
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    // Get Data from local storage
    const data = JSON.parse(localStorage.getItem("admin_edit_data"));

    // id
    const { id } = useParams();

    // Loading
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Error
    const [error, setError] = useState({});

    // Handle Submit
    const onSubmit = (data) => {
        data.id = id;
        setLoading(true);
        console.log(data);
        // Admin Data
        axios
            .post(import.meta.env.VITE_API + "update-admin", data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/admins-list/" + id);
                console.log(res.data.data);
                localStorage.setItem(
                    "admin_edit_data",
                    JSON.stringify(res.data.data)
                );
            })
            .catch((err) => {
                console.log(err.response.data.message);
                setError(err.response.data.message)
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <>
            <Container>
                {/* Back */}
                <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"} >
                    <Back title={"تعديل المدير"} />
                    <Link to={"change-password/" + id} > <Typography sx={{ textDecoration : "underline" , transition : ".5s" , "&:hover" : {color : "primary.main"}}} > تغيير كلمة المرور </Typography> </Link>
                </Stack>
                {/* Client Data */}
                <Box bgcolor={"primary.white"} p={"32px 16px"} borderRadius={"12px"} my={8} >
                    <Typography variant="title" fontWeight={"500"}>البيانات الشخصية</Typography>
                    <Grid container mt={8} spacing={8}>
                        <Grid item xs={12} sm={4}>
                            <Input type={"text"} label={"الاسم"} register={register} registerName="name" error={ errors?.name?.message || (error?.name && error?.name[0]) } defaultValue={data?.name} required={true} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input type={"email"} label={"الايميل"} register={register} registerName="email" error={ errors?.email?.message || (error?.email && error?.email[0]) } defaultValue={data?.email} required={true}/>
                        </Grid>
                    </Grid>
                </Box>
                {/* Submit */}
                <Submit onSubmit={onSubmit} handleSubmit={handleSubmit} loading={loading}/>
            </Container>
        </>
    );
};

const Submit = ({ onSubmit, handleSubmit, loading }) => {
    return (
        <Stack direction={{xs : "column" , sm : "row"}} spacing={12} justifyContent={"end"} my={20}>
            <Button variant="outlined" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={() => history.back()} >الغاء</Button>
            <Button variant="contained" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={handleSubmit(onSubmit)} disabled={loading} > حفظ </Button>
        </Stack>
    );
};

export default Admins_Edit;
