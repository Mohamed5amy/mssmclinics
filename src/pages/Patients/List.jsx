import {
    Button,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Container from "../../components/Container/Container";
import Table from "../../components/Table/Table";
import SearchIcon from "@mui/icons-material/Search";
import { Link } from "react-router-dom";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import useSearch from "../../hooks/Search/useSearch";
import useRole from "../../hooks/Role/useRole";

const List = () => {

    const headers = ["اسم المريض" , "رقم الهاتف" , "العمر" , "عن طريق" ]
    const body = ["name" , "phone" , "age" , "providerName"]

    const [loading, setLoading] = useState(false);
    const [admins, setAdmins] = useState([]);

    const [clinicId, setClinicId] = useState("")

    // Get Admins
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "list-patients?" + `${clinicId && "clinic_id=" + clinicId + "&"}`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setAdmins(res.data.data.reverse());
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [clinicId]);

    // Search Admins
    const [search, setSearch] = useState("");
    const filteredData = useSearch({data : admins , name : "name" , search : search})

    
    const role = useRole();

    // Filter with clinics
    const [clinics, setClinics] = useState([])

    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "list-clinic" , {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setClinics(res.data.data);
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return (
        <Container>
            {/* Filter */}
            <Stack direction={{xs : "column" , sm : "row"}} alignItems={"center"} justifyContent={"space-between"} mb={8} spacing={8} >
                <Stack direction={{xs : "column" , sm : "row"}} spacing={4}>

                    <TextField type="search" sx={{ bgcolor: "primary.white" }} placeholder="البحث بالاسم" InputProps={{startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>)}} value={search} onChange={(e) => setSearch(e.target.value)}/>

                    { (role === 1 || role === 2) && <TextField label={"العيادة"} select sx={{minWidth : "200px"}} value={clinicId} onChange={e => setClinicId(e.target.value)} >
                        <MenuItem value="" > الكل </MenuItem>
                        {clinics && clinics.map(admin => {
                            return (
                                <MenuItem key={admin.id} value={admin.id}> {admin.name} </MenuItem>
                            )
                        })}
                    </TextField>}
                </Stack>
                <Stack direction={"row"} spacing={8} alignItems={"center"}>
                    {role === 3 && <Link to={"add"}>
                        <Button startIcon={<AddCircleOutlineRoundedIcon />} variant="contained" sx={{ p: "16px 40px", borderRadius: "8px" }} > اضافة مريض </Button>
                    </Link>}

                    <CSVLink data={filteredData}><IconButton color="primary"><SaveAltIcon /></IconButton></CSVLink>
                </Stack>
            </Stack>
            {/* Table */}
            <Table headers={headers} data={filteredData} loading={loading} edit={role == 3 && true}  profile={true} body={body} />
            {/* Number */}
            <Typography fontWeight={500} color={"text.secondary"} mt={4}> عدد المرضي : {filteredData?.length} </Typography>
        </Container>
    );
};

export default List;
