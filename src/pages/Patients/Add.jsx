import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";


const Add = () => {
    // USE FORM
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    // Loading
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Get Providers
    const [providers, setProviders] = useState([])
    useEffect(() => {
        axios.get(import.meta.env.VITE_API + "providers" , {
            headers : {
            Authorization : "Bearer " + localStorage.getItem("token")
            }
        })
        .then((res) => {
            console.log(res.data.data)
            setProviders(res.data.data)
        })
        .catch((err) => {
            console.log(err.response.data)
        })
    } , [])

    // Error
    const [error, setError] = useState({});

    // Handle Submit
    const onSubmit = (data) => {
        setLoading(true);

        axios
            .post(import.meta.env.VITE_API + "clinic/add-patients", data, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                navigate("/patients-list/" + res.data.data.id);
                localStorage.setItem(
                    "admin_edit_data",
                    JSON.stringify(res.data.data)
                );
            })
            .catch((err) => {
                console.log(err.response.data.errors);
                setError(err.response.data.errors);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const [ayHaga, setAyHaga] = useState(false);
    const [ayHaga2, setAyHaga2] = useState(false);

    return (
        <>
            <Container>
                {/* Back */}
                <Back title={"اضافة مريض"} />
                {/* Client Data */}
                <Box
                    bgcolor={"primary.white"}
                    p={"32px 16px"}
                    borderRadius={"12px"}
                    my={8}
                >
                    <Typography variant="title" fontWeight={"500"}>
                        البيانات الشخصية
                    </Typography>
                    <Grid container mt={8} spacing={8}>
                        <Grid item xs={12} sm={4}>
                            
                            <Input
                                required={true}
                                type={"text"}
                                label={"الاسم"}
                                register={register}
                                registerName="name"
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
                                label={"رقم الهاتف"}
                                register={register}
                                registerName="phone"
                                error={
                                    errors?.phone?.message ||
                                    (error?.phone && error?.phone[0])
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack alignItems={"start"} spacing={4}>
                                <Typography
                                    variant="label"
                                    color={"text.secondary"}
                                >
                                    عن طريق
                                    <span style={{ color: "red" }}>*</span>
                                </Typography>

                                <TextField
                                    {...register("provider_id", {
                                        required: "هذا الحقل مطلوب",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.provider_id && !ayHaga2
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
                                    defaultValue={""}
                                    onChange={() => setAyHaga2(true)}
                                >
                                    {providers?.map(pro => {
                                        return <MenuItem key={pro.id} value={pro.id} > {pro.title} </MenuItem>
                                    })}
                                </TextField>

                                {errors?.provider_id?.message && !ayHaga2 && (
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
                                            
                                            {errors.provider_id.message}
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
                                    الجنس
                                    <span style={{ color: "red" }}>*</span>
                                </Typography>

                                <TextField
                                    {...register("sex", {
                                        required: "هذا الحقل مطلوب",
                                    })}
                                    fullWidth
                                    select
                                    error={
                                        errors.sex && !ayHaga
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
                                    defaultValue={""}
                                    onChange={() => setAyHaga(true)}
                                >
                                    <MenuItem value={"ذكر"} > ذكر </MenuItem>
                                    <MenuItem value={"انثي"} > انثي </MenuItem>
                                </TextField>

                                {errors?.sex?.message && !ayHaga && (
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
                                            
                                            {errors.sex.message}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"number"}
                                label={"العمر"}
                                register={register}
                                registerName="age"
                                error={
                                    errors?.age?.message ||
                                    (error?.age && error?.age[0])
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Input
                                required={true}
                                type={"text"}
                                label={"العنوان"}
                                register={register}
                                registerName="address"
                                error={
                                    errors?.address?.message ||
                                    (error?.address && error?.address[0])
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

export default Add;
