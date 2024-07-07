// images
import { useForm } from "react-hook-form";
import Input from "../../components/Input/Input";
import moneyImg from "../../images/logo.png"

import { Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useIsAuthenticated, useSignIn } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {

    // is Logged in ?
    const isAuthenticated = useIsAuthenticated()
    const navigate = useNavigate()
  
    useEffect(() => {
      isAuthenticated() && navigate("/reservations-list")
    } , [isAuthenticated , navigate])
  
    const { register, handleSubmit, formState: { errors } } = useForm();

    // IM ?
    const [myRole, setMyRole] = useState("3")
  
    // Signing in
    const [invalid, setInvalid] = useState("")
    const [loading , setLoading] = useState(false)
  
    const signIn = useSignIn()

    const handleRole = () => {
      if (myRole == 3) return "clinic";
      if (myRole == 4) return "doctor";
    }
  
    const onSubmit = (data) => {
      setLoading(true)
      console.log(data)
      axios.post( import.meta.env.VITE_API + handleRole() + "-login" , data)
      .then(res => {
        console.log(res.data.data)
        signIn({
          token : res.data.data.api_token,
          expiresIn: 3600,
          tokenType : "Bearer",
          authState : {email : res.data.data.email}
        })
        setInvalid("")
        localStorage.setItem("token" , res.data.data.api_token)
        localStorage.setItem("user" , JSON.stringify(res.data.data))
        localStorage.setItem("role" , res.data.data.role)
        localStorage.setItem("isSuper" , res.data.data.is_super)
        navigate("/reservations-list")
      })
      .catch(err => {
        setInvalid(err.response.data.message)
      })
      .finally(() => setLoading(false))
    }
  
  
  return (
    // Container
    <Stack width={"100%"} height={"100vh"} alignItems={"center"} justifyContent={"center"} >
      {/* Login Box */}
      <Stack p={{xs : 12 , sm : 20}} bgcolor={"primary.white"} borderRadius={"16px"} alignItems={"center"} >
        {/* Logo */}
        <Stack mb={12} >
          <img src={moneyImg} alt="logo" width={"150px"} />
        </Stack>
        {/* Login text */}
        <Typography color={"#050C1E"} mb={12} variant="h2" >تسجيل الدخول</Typography>
        {/* Form */}
        <form>
          <Stack width={{ xs : "300px" , sm : "360px" }} spacing={12} >
            <Input label={"الايميل"} required={true} type={"email"} error={errors?.email?.message} register={register} registerName={"email"} />
            <Input label={"كلمة المرور"} required={true} error={errors?.password?.message} type={"password"} register={register} registerName={"password"} />
          </Stack>
          <Stack alignItems={"center"} mt={12}>
          <ToggleButtonGroup color="primary" value={myRole} exclusive onChange={e => setMyRole(e.target.value)} fullWidth>
            <ToggleButton value="3">عيادة</ToggleButton>
            <ToggleButton value="4">دكتور</ToggleButton>
          </ToggleButtonGroup>
          </Stack>
          <Button disabled={loading} variant="contained" sx={{p : "15px 0" , borderRadius : "8px" , width : "100%" , mt : 20 , height : "58px"}} onClick={handleSubmit(onSubmit)} >
            {loading ? <CircularProgress  /> : <Typography variant="button" color={"primary.white"} >دخول</Typography>}
          </Button>
          {invalid && <Typography color={"error"} textAlign={"center"} mt={5} fontWeight={500} > البيانات غير متطابقة </Typography>}
        </form>
      </Stack>
    </Stack>
  )
}

export default Login
