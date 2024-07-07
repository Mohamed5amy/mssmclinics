import { Alert, Box, Button, Grid, Stack, Typography } from "@mui/material";
import Back from "../../components/Back/Back";
import Container from "../../components/Container/Container";
import Input from "../../components/Input/Input";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const ChangePassA = () => {
    // USE FORM
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    // id
    const { id } = useParams();

    // Loading
    const [loading, setLoading] = useState(false);

    // Error
    const [error, setError] = useState("");

    // Alert
    const [done, setDone] = useState(false);

    // Handle Submit
    const onSubmit = (data) => {
        data.id = id;
        setLoading(true);
        console.log(data);
        // Change password
        if (data.password && data.password_confirmation) {
            axios
                .post(
                    import.meta.env.VITE_API + "update-doctor-password",
                    data,
                    {
                        headers: {
                            Authorization:
                                "Bearer " + localStorage.getItem("token"),
                        },
                    }
                )
                .then((res) => {
                    console.log(res.data.data);
                    setDone(true);
                })
                .catch((err) => {
                    console.log(err.response.data.message);
                    setError(err?.response?.data?.message);
                    setLoading(false);
                });
        }
    };

    return (
        <Container>
            <Back title={"تغيير كلمة المرور"} />
            {/* Change Password */}
            <Box
                bgcolor={"primary.white"}
                p={"16px"}
                borderRadius={"12px"}
                my={8}
            >
                <Grid container spacing={8} maxWidth={"700px"} onClick={() => setError(false)} >
                    <Grid item xs={12} sm={12}>
                        {" "}
                        <Input
                            type={"password"}
                            label={"كلمة المرور الجديدة"}
                            register={register}
                            registerName="password"
                            error={
                                errors?.password?.message ||
                                (error?.password && error?.password[0])
                            }
                        />{" "}
                    </Grid>
                    <Grid item xs={12} sm={12}>
                        {" "}
                        <Input
                            type={"password"}
                            label={"تأكيد كلمة المرور"}
                            register={register}
                            registerName="password_confirmation"
                            error={
                                errors?.password_confirmation?.message ||
                                (error?.password_confirmation &&
                                    error?.password_confirmation[0])
                            }
                        />{" "}
                    </Grid>
                </Grid>
                {/* Error */}
                { error && <Typography color={"error"} fontSize={14} fontWeight={500} mt={8}> من فضلك تأكدمن تساوي الحقلين </Typography>}
            </Box>
            {/* Submit */}
            <Submit
                onSubmit={onSubmit}
                handleSubmit={handleSubmit}
                loading={loading}
            />
            {/* Alert */}
            {done && (
                <Alert severity="success">
                    تم تغيير كلمة المرور بنجاح
                </Alert>
            )}
        </Container>
    );
};

const Submit = ({ onSubmit, handleSubmit, loading }) => {
    return (
        <Stack direction={"row"} spacing={12} justifyContent={"end"} my={20}>
            <Button
                variant="outlined"
                sx={{ p: "16px 80px", borderRadius: "8px" }}
                onClick={() => history.back()}
            >
                {" "}
                رجوع{" "}
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

export default ChangePassA;
