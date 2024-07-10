import { Accordion, AccordionDetails, AccordionSummary, Button, Grid, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Container from "../../components/Container/Container";
import Table from "../../components/Table/Table";
import { Link } from "react-router-dom";
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Person4Icon from '@mui/icons-material/Person4';
import useSearch from "../../hooks/Search/useSearch";
import useRole from "../../hooks/Role/useRole";


const Reports_List = () => {

  const role = useRole()

  const headers = ["الدكتور" , "المريض" , "التخصص" , "التاريخ" , "الخدمة" , "حالة الكشف"]
  const body = ["doctorName" , "name" , "doctorSpecalite" , "CustomDate" , "serviceName" , "status"]

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState([])

  const date = new Date()

  function getLastDayOfMonth(year, month) {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
  }
  
  const myStartDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-01`

  const myEndDate = `${date.getFullYear()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)}-${getLastDayOfMonth(date.getFullYear() , date.getMonth())}`
  
  // Filters
  const [cityId, setcityId] = useState("")
  const [catId, setcatId] = useState("")
  const [clientId, setclientId] = useState("")
  const [startDate, setStartDate] = useState(myStartDate)
  const [endDate, setEndDate] = useState(myEndDate)


  // Get Reports
  useEffect(() => {
    setLoading(true)
    axios.get(import.meta.env.VITE_API + "list-reservations?" + 
    `${clientId && "clinic_id=" + clientId + "&"}${catId && "doctor_id=" + catId + "&"}${cityId && "patient_id=" + cityId + "&"}${"start_date=" + (startDate ? startDate : myStartDate) + "&"}${"end_date=" + (endDate ? endDate :myEndDate) + "&"}`
    , {
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
    .finally(() => {
      setLoading(false)
    })
  } , [cityId , catId , clientId , startDate , endDate])
  
  // Search Admins
  const [search, setSearch] = useState("");
  const filteredData = useSearch({data : clients , name : "name" , search : search})
  
  // Get Categories
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
      if (role == 2 || role == 1) {
        axios
          .get(import.meta.env.VITE_API + "list-clinic", {
              headers: {
                  Authorization: "Bearer " + localStorage.getItem("token"),
              },
          })
          .then((res) => {
              setClinics(res.data.data);
          })
          .catch((err) => {
              console.log(err.response.data);
          });
      }
  }, [role]);

  // Get Cities
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    (role == 3 || role == 2 || role == 1) && axios
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
  }, [role]);

  // Get Clients
  const [patients, setPatients] = useState([]);

  useEffect(() => {
      axios
          .get(import.meta.env.VITE_API + "list-patients", {
              headers: {
                  Authorization: "Bearer " + localStorage.getItem("token"),
              },
          })
          .then((res) => {
              console.log(res.data.data);
              setPatients(res.data.data);
          })
          .catch((err) => {
              console.log(err);
          })
          .finally(() => {
              setLoading(false);
          });
  }, []);

  // cumulative
  const [cum, setCum] = useState(0)
  const [cumD, setCumD] = useState(0)

  useEffect(() => {

    setCum(0)
    filteredData.map(item => item.status == "مكتمل" && setCum(prev => prev + item.price))

    setCumD(0)
    filteredData.map(item => item.status == "مكتمل" && setCumD(prev => prev + (item.price * item.doctor?.prectange / 100 )))
    
  } , [filteredData])

  const [dateText, setDateText] = useState(true)

  
  return (
    <Container>
      {/* Search */}
      <Stack direction={{xs : "column" , sm : "row"}} alignItems={"center"} justifyContent={"space-between"} mb={8} spacing={8} >

        <TextField type="search"
          sx={{ bgcolor : "primary.white" }}
          placeholder="بحث باسم المريض"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        /> 

        <Stack direction={"row"} spacing={8} alignItems={"center"}>
          { role === 3 && <Link to={"add"} > 
            <Button startIcon={<AddCircleOutlineRoundedIcon />} variant="contained" sx={{ p : "16px 40px" , borderRadius : "8px" }}> اضافة كشف </Button> 
          </Link>}
          
          <CSVLink data={filteredData} filename="Agents" > <IconButton color="primary" > <SaveAltIcon /> </IconButton> </CSVLink>
        </Stack>
      </Stack>
      {/* Filter */}
      <Accordion sx={{ mb : 8 , boxShadow : "none" }} >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header" >
          الحسابات ( يتم حساب الكشوفات المكتمله فقط )
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={12} >
            { role !== 4 && <Grid item xs={12} md={4}>
              <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
              <Stack>
                  <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> المجموع </Typography>
                  <Typography fontWeight={500} color={"text"} fontSize={32} > {cum} <span style={{fontSize : 16 , color : "#3D97EA"}} >جنية</span> </Typography>
                </Stack>
                <IconButton sx={{color : "#3D97EA"}}> <AttachMoneyIcon sx={{fontSize : 50}} /> </IconButton>
              </Stack>
            </Grid>}
            { role !== 4 && <Grid item xs={12} md={4}>
              <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
              <Stack>
                  <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> الربح الصافي </Typography>
                  <Typography fontWeight={500} color={"text"} fontSize={32} > {cum - cumD} <span style={{fontSize : 16 , color : "#32C652"}} >جنية</span> </Typography>
                </Stack>
                <IconButton sx={{color : "#32C652"}}> <AccountBalanceWalletIcon sx={{fontSize : 50}} /> </IconButton>
              </Stack>
            </Grid>}
            <Grid item xs={12} md={4}>
              <Stack border={"1px solid"} borderColor={"#D9DFEC"} p={6} direction={"row"} justifyContent={"space-between"} borderRadius={"12px"} alignItems={"start"} >
              <Stack>
                  <Typography fontWeight={500} color={"primary.icons"} fontSize={20} mb={2}> نسبة الدكتور </Typography>
                  <Typography fontWeight={500} color={"text"} fontSize={32} > {cumD} <span style={{fontSize : 16 , color : "#594BFA"}} >جنية</span> </Typography>
                </Stack>
                <IconButton sx={{color : "#594BFA"}}> <Person4Icon sx={{fontSize : 50}} /> </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      {/* Filter */}
      <Accordion sx={{ mb : 8 , boxShadow : "none" }} >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          الفلتره
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={8}>
            <Grid item xs={12} sm={6}>
              <Typography mb={2} color={"text.secondary"} > من</Typography>
              <TextField type="date" value={startDate} onChange={e => {setStartDate(e.target.value) ; dateText && setDateText(false) }} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography mb={2} color={"text.secondary"} > حتي</Typography>
              <TextField type="date" value={endDate} onChange={e => {setEndDate(e.target.value) ; dateText && setDateText(false) }} fullWidth />
            </Grid>
            {(role === 1 || role === 2) && <Grid item xs={12} sm={4}>
              <TextField select value={clientId} onChange={e => setclientId(e.target.value)} label="العيادة" fullWidth >
              <MenuItem value={""}> الكل </MenuItem>
              {clinics &&
                clinics.map((item) => {
                    return (
                        <MenuItem value={+item.id} key={item.id}>{item.branch}</MenuItem>
                    );
                })
              }
              </TextField>
            </Grid>}
            {role !== 4 && <Grid item xs={12} sm={4}>
              <TextField select value={catId} onChange={e => setcatId(e.target.value)} label="الدكتور" fullWidth >
              <MenuItem value={""}> الكل </MenuItem>
              {doctors &&
                doctors.map((item) => {
                    return (
                        <MenuItem value={item.id} key={item.id}>{item.name}</MenuItem>
                    );
                })
              }
              </TextField>
            </Grid>}
            <Grid item xs={12} sm={4}>
              <TextField select value={cityId} onChange={e => setcityId(e.target.value)} label="المريض" fullWidth >
              <MenuItem value={""}> الكل </MenuItem>
              {patients &&
                patients.map((item) => {
                    return (
                        <MenuItem value={item.id} key={item.id}>{item.name}</MenuItem>
                    );
                })
              }
              </TextField>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      {/* Table */}
      {dateText && <Typography fontWeight={500} color={"text.secondary"} mb={8}>
        يضم الجدول التالي حالات الشهر الجاري فقط
      </Typography>}
      <Table headers={headers} data={filteredData} loading={loading} body={body} edit={role === 3} profile={true} />
      {/* Number */}
      <Typography fontWeight={500} color={"text.secondary"} mt={4}> عدد الكشوفات : {filteredData?.length} </Typography>
    </Container>
  )
}

export default Reports_List
