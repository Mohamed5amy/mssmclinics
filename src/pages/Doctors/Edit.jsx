import { Box, Button,Grid,Stack,  Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Select from "../../components/Select/Select";


const Edit = () => {
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

    // Get Specialities
    const [spec, setSpec] = useState([]);
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "specialties", {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setSpec(res.data.data);
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);   

    // Handle Submit
    const onSubmit = (data) => {
        data.id = id;
        setLoading(true);
        axios
            .post(import.meta.env.VITE_API + "clinic/edit-doctors", data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/doctors-list/" + id);
                console.log(res.data.data);
                localStorage.setItem("admin_edit_data",JSON.stringify(res.data.data));
            })
            .catch((err) => {
                console.log(err.response.data.message);
                setError(err.response.data.errors);
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
                    <Back title={"تعديل المعالج"} />
                    <Link to={"change-password/" + id} > <Typography sx={{ textDecoration : "underline" , transition : ".5s" , "&:hover" : {
                        color : "primary.main"
                    } }} > تغيير كلمة المرور </Typography> </Link>
                </Stack>
                {/* Client Data */}
                <Box bgcolor={"primary.white"} p={"32px 16px"} borderRadius={"12px"} my={8} >
                    <Typography variant="title" fontWeight={"500"}>البيانات الشخصية</Typography>
                    <Grid container mt={8} spacing={8}>
                        <Grid item xs={12} sm={4}>
                            <Input required={true} type={"text"} label={"الاسم"} register={register} registerName="name" defaultValue={data?.name} error={errors?.name?.message || (error?.name && error?.name[0])}/>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input required={true} type={"number"} label={"رقم الهاتف"} register={register} registerName="phone" defaultValue={data?.phone} error={errors?.phone?.message || (error?.phone && error?.phone[0])}/>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input required={true} type={"number"} label={"نسبة الطبيب %"} register={register} registerName="prectange" defaultValue={data?.prectange} error={errors?.prectange?.message || (error?.prectange && error?.prectange[0])}/>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Select required={true} data={spec} name={"title"} label={"التخصص"} register={register} registerName="specialtie_id" defaultValue={data?.specialtie_id} error={errors?.specialtie_id?.message || (error?.specialtie_id && error?.specialtie_id[0])}/>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input required={true} type={"email"} label={"الايميل"} register={register} registerName="email" defaultValue={data?.email} error={errors?.email?.message || (error?.email && error?.email[0])}/>
                        </Grid>
                    </Grid>
                </Box>
                {/* Submit */}
                <Submit onSubmit={onSubmit} handleSubmit={handleSubmit} loading={loading} />
            </Container>
        </>
    );
};

const Submit = ({ onSubmit, handleSubmit, loading }) => {
    return (
        <Stack direction={{xs : "column" , sm : "row"}} spacing={12} justifyContent={"end"} my={20}>
            <Button variant="outlined" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={() => history.back()} >الغاء</Button>
            <Button variant="contained" sx={{ p: "16px 80px", borderRadius: "8px" }} onClick={handleSubmit(onSubmit)} disabled={loading} >حفظ</Button>
        </Stack>
    );
};

export default Edit;
