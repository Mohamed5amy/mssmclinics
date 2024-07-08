import { Grid, IconButton, Stack, Typography } from "@mui/material";
import Container from "../../components/Container/Container";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SummarizeIcon from "@mui/icons-material/Summarize";
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useEffect, useState } from "react";
import axios from "axios";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaidIcon from '@mui/icons-material/Paid';
import { Link } from "react-router-dom";


const Insights = () => {

  const [nums, setNums] = useState(null)

  const date = new Date()

  function getLastDayOfMonth(year, month) {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
  }
  
  const myStartDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-01`
  const myEndDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-${getLastDayOfMonth(date.getFullYear() , date.getMonth())}`

  useEffect(() => {
      axios
          .get(import.meta.env.VITE_API + "home", {
              headers: {
                  Authorization: "Bearer " + localStorage.getItem("token"),
              },
          })
          .then((res) => {
              console.log(res.data.data);
              setNums(res.data.data);
          })
          .catch((err) => {
              console.log(err);
          })
  }, []);

  
  const [clients, setClients] = useState([])
  
  useEffect(() => {
    axios.get(import.meta.env.VITE_API + "list-reservations?" + 
    `${"start_date=" +  myStartDate + "&"}${"end_date=" + myEndDate + "&"}`,
    {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res.data.data)
      setClients(res?.data?.data.reverse().slice(0 , 10))
    })
    .catch((err) => {
      console.log(err)
    })
  } , [myStartDate , myEndDate])


    // cumulative
    const [cum, setCum] = useState(0)
    const [cumD, setCumD] = useState(0)
  
    useEffect(() => {
  
      setCum(0)
      clients.map(item => setCum(prev => prev + item.price))
  
      setCumD(0)
      clients.map(item => setCumD(prev => prev + (item.price * item.doctor?.prectange / 100 )))
      
    } , [clients])
  
  return (
    <Container>
      <Grid container spacing={12} mb={24}>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الاطباء </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.doctors_count}  </Typography>
            </Stack>
            <Link to={"/doctors-list"}><IconButton sx={{color : "#11CAF2"}}> <SupervisorAccountIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> المرضي </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.patients_count}  </Typography>
            </Stack>
            <Link to={"/patients-list"} ><IconButton sx={{color : "#594BFA"}}> <MedicalServicesIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الكشوفات </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.reservations_count} </Typography>
            </Stack>
            <Link to={"/reservations-list"} ><IconButton sx={{color : "#FABD13"}} > <SummarizeIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الدخل الكلي </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {cum}  </Typography>
            </Stack>
            <IconButton sx={{color : "#FAEF13"}}> <AccountBalanceWalletIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> دخل الدكاترة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {cumD}  </Typography>
            </Stack>
            <IconButton sx={{color : "#515DAA"}}> <AttachMoneyIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> دخل العيادة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {cum - cumD} </Typography>
            </Stack>
            <IconButton sx={{color : "#32C652"}} > <PaidIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Insights
