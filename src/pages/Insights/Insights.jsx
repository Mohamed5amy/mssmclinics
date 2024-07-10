import { CircularProgress, Grid, IconButton, Stack, TextField, Typography } from "@mui/material";
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
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import CategoryIcon from '@mui/icons-material/Category';




const Insights = () => {

  const [loading, setLoading] = useState(false)

  const [nums, setNums] = useState(null)
  const date = new Date()

  const myStartDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-01`
  const myEndDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-${getLastDayOfMonth(date.getFullYear() , date.getMonth())}`
  
  const [startDate, setStartDate] = useState(myStartDate)
  const [endDate, setEndDate] = useState(myEndDate)

  const [dateText, setDateText] = useState(true)

  function getLastDayOfMonth(year, month) {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
  }


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

    setLoading(true)
    
    axios.get(import.meta.env.VITE_API + "list-reservations?" + 
    `${"start_date=" + (startDate ? startDate : myStartDate) + "&"}${"end_date=" + (endDate ? endDate :myEndDate) + "&"}`,
    {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res.data.data)
      setClients(res?.data?.data.reverse())
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => setLoading(false))
  } , [myStartDate , myEndDate , startDate , endDate])


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
      <Typography fontSize={18} fontWeight={600} color={"text.secondary"} mb={8}> اعداد العيادة </Typography>
      <Grid container spacing={12} mb={24}>
        <Grid item xs={12} sm={6} md={3}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الاطباء </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.doctors_count}  </Typography>
            </Stack>
            <Link to={"/doctors-list"}><IconButton sx={{color : "#11CAF2"}}> <SupervisorAccountIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> المرضي </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.patients_count}  </Typography>
            </Stack>
            <Link to={"/patients-list"} ><IconButton sx={{color : "#594BFA"}}> <MedicalServicesIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> التخصصات </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.doctors_count}  </Typography>
            </Stack>
            <Link to={"/settings"}><IconButton sx={{color : "purple"}}> <CategoryIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الخدمات </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {nums?.services_count}  </Typography>
            </Stack>
            <Link to={"/settings"} ><IconButton sx={{color : "#C2C2C2"}}> <MedicalInformationIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
      </Grid>
      <Typography fontSize={18} fontWeight={600} color={"text.secondary"} mb={8} mt={16}> يمكنك فلترة جميع الإحصائيات التالية بالفترة الزمنية <br /> <span style={{fontSize : 14}}>(يتم عرض احصائيات الشهر الحالي افتراضيا فى حالة عدم تحديد مدة)</span> </Typography>
      <Grid container spacing={12} mb={24}>
        <Grid item xs={12} sm={6}>
          <Typography mb={2} color={"text.secondary"} > من</Typography>
          <TextField type="date" value={startDate} onChange={e => {setStartDate(e.target.value) ; dateText && setDateText(false) }} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography mb={2} color={"text.secondary"} > حتي</Typography>
          <TextField type="date" value={endDate} onChange={e => {setEndDate(e.target.value) ; dateText && setDateText(false) }} fullWidth />
        </Grid>
      </Grid>
      <Typography fontSize={18} fontWeight={600} color={"text.secondary"} mb={8} mt={16}> الكشوفات <br /> <span style={{fontSize : 14}}> من ({startDate}) حتي ({endDate}) </span> </Typography>
      <Grid container spacing={12} mb={24}>
        <Grid item xs={12} sm={6}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> عدد الكشوفات الكلي </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> : clients?.length} </Typography>
            </Stack>
            <Link to={"/reservations-list"} ><IconButton sx={{color : "gray"}} > <SummarizeIcon sx={{fontSize : 50}} /> </IconButton></Link>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> عدد الكشوفات المكتملة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> : clients?.filter(item => item.status == "مكتمل").length}  </Typography>
            </Stack>
            <IconButton sx={{color : "#32C652"}}> <CheckIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> عدد الكشوفات الملغاة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> : clients?.filter(item => item.status == "ملغي").length}  </Typography>
            </Stack>
            <IconButton sx={{color : "red"}}> <CloseIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> عدد الكشوفات المنتظرة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> : clients?.filter(item => item.status == "فى الانتظار").length} </Typography>
            </Stack>
            <IconButton sx={{color : "orange"}} > <HourglassBottomIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
      </Grid>
      <Typography fontSize={18} fontWeight={600} color={"text.secondary"} mb={8} mt={16}> دخل العيادة <br /> <span style={{fontSize : 14}}>(جميع الحسابات تتم للكشوفات المكتملة فقط)</span> <br /> <span style={{fontSize : 14}}> من ({startDate}) حتي ({endDate}) </span> </Typography>
      <Grid container spacing={12} mb={24}>
        <Grid item xs={12} sm={6} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الدخل الكلي </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> :cum}  </Typography>
            </Stack>
            <IconButton sx={{color : "#FAEF13"}}> <AccountBalanceWalletIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> دخل الدكاترة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> :cumD}  </Typography>
            </Stack>
            <IconButton sx={{color : "#515DAA"}}> <AttachMoneyIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
            <Stack>
              <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> دخل العيادة </Typography>
              <Typography fontWeight={500} color={"text"} fontSize={32} > {loading ? <CircularProgress size={30} /> :cum - cumD} </Typography>
            </Stack>
            <IconButton sx={{color : "#32C652"}} > <PaidIcon sx={{fontSize : 50}} /> </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Insights
