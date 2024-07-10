import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";


const Edit = () => {

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
    const [error, setError] = useState({});



    // Handle Submit
    const onSubmit = (data) => {
        
        data.id = id

        console.log(data)

        setLoading(true);

        axios
            .post(import.meta.env.VITE_API + "edit-clinic", data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/clinics-list/" + res.data.data.id);
            })
            .catch((err) => {
                console.log(err.response.data.message);
                setError(err?.response?.data?.message);
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
                    <Back title={"تعديل العيادة"} />
                    <Link to={"change-password/" + id} > <Typography sx={{ textDecoration : "underline" , transition : ".5s" , "&:hover" : {
                        color : "primary.main"
                    } }} > تغيير كلمة المرور </Typography> </Link>
                </Stack>
                {/* Client Data */}
                <Box
                    bgcolor={"primary.white"}
                    p={"32px 16px"}
                    borderRadius={"12px"}
                    my={8}
                >
                    <Typography variant="title" fontWeight={"500"}>
                        بيانات العيادة
                    </Typography>
                    <Grid container mt={8} spacing={8} mb={8}>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"text"}
                                label={"اسم العيادة"}
                                register={register}
                                registerName="name"
                                defaultValue={data?.name}
                                error={
                                    errors?.name?.message ||
                                    (error?.name && error?.name[0])
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"number"}
                                label={"رقم الجوال"}
                                register={register}
                                registerName="phone"
                                defaultValue={data?.phone}
                                error={
                                    errors?.phone?.message ||
                                    (error?.phone && error?.phone[0])
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"text"}
                                label={"العنوان"}
                                register={register}
                                registerName="branch"
                                defaultValue={data?.branch}
                                error={
                                    errors?.branch?.message ||
                                    (error?.branch && error?.branch[0])
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"email"}
                                label={"الايميل"}
                                register={register}
                                registerName="email"
                                defaultValue={data?.email}
                                error={
                                    errors?.email?.message ||
                                    (error?.email && error?.email[0])
                                }
                            />
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

export default Edit;
