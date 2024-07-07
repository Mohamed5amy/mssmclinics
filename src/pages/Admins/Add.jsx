import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import {  useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import 'react-toastify/dist/ReactToastify.css';

const Add = () => {
    // USE FORM
    const { register, handleSubmit, formState: { errors }, } = useForm();

    // Loading
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Error
    const [error, setError] = useState({});

    // Handle Submit
    const onSubmit = (data) => {
        
        setLoading(true);

        axios
        .post(import.meta.env.VITE_API + "admin", data, {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token"),
            },
        })
        .then((res) => {
            navigate("/admins-list/" + res.data.data.id);
            localStorage.setItem("admin_edit_data", JSON.stringify(res.data.data));
        })
        .catch((err) => {
            console.log(err.response.data);
            setError(err.response.data.errors);
        })
        .finally(() => {
            setLoading(false);
        });
        
    };
    
    return (
        <Container>
            {/* Back */}
            <Back title={"اضافة مدير"} />
            {/* Client Data */}
            <Box bgcolor={"primary.white"} p={"32px 16px"} borderRadius={"12px"} my={8} >
                <Typography variant="title" fontWeight={"500"}>البيانات الشخصية</Typography>
                <Grid container mt={8} spacing={8}>
                    <Grid item xs={12} sm={4}>
                        <Input required={true} type={"text"} label={"الاسم"} register={register} registerName="name" error={errors?.name?.message || (error?.name && error?.name[0])}/>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Input required={true} type={"email"} label={"الايميل"} register={register} registerName="email" error={errors?.email?.message || (error?.email && error?.email[0])}/>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Input required={true} type={"password"} label={"كلمة المرور"} register={register} registerName="password" error={errors?.password?.message || (error?.password && error?.password[0])}/>
                    </Grid>
                </Grid>
            </Box>
            {/* Submit */}
            <Submit onSubmit={onSubmit} handleSubmit={handleSubmit} loading={loading} />
        </Container>
    );
};

const Submit = ({ onSubmit, handleSubmit, loading }) => {
    return (
        <Stack direction={{xs : "column" , sm : "row"}} spacing={12} justifyContent={"end"} my={20}>
            <Button variant="outlined" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={() => history.back()}>الغاء</Button>
            <Button variant="contained" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={handleSubmit(onSubmit)} disabled={loading}> اضافة </Button>
        </Stack>
    );
};

export default Add;
