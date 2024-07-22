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
import { Link } from "react-router-dom";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import { useEffect, useState } from "react";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import { CSVLink } from "react-csv";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import useRole from "../../hooks/Role/useRole";

const List = () => {
    const headers = ["اسم العيادة","رقم الجوال","الايميل","العنوان",];
    const body = ["name", "phone", "email", "branch"];

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);

    const [adminId, setadminId] = useState("")

    // Get clinics
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "list-clinic?" + `${adminId && "admin_id=" + adminId + "&"}` , {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setClients(res.data.data);
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [adminId]);

    // Search Admins
    const [search, setSearch] = useState("");
    const [filteredData, setFilteredData] = useState([]);

    useEffect(() => {
        if (search?.length > 0 && search?.charCodeAt(0) !== 32) {
            const newData =
                clients &&
                clients.filter((admin) =>
                    admin.name.toLowerCase().includes(search.toLowerCase())
                );
            setFilteredData(newData);
        } else {
            setFilteredData(clients);
        }
    }, [search, clients]);

    const role = useRole()

    // Get Admins
    const [admins, setAdmins] = useState([])
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "admin", {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            })
            .then((res) => {
                console.log(res.data.data);
                setAdmins(res.data.data);
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
                <Stack direction={{xs : "column" , sm : "row"}} spacing={4} >
                    <TextField type="search"
                        sx={{ bgcolor: "primary.white" }}
                        placeholder="البحث باسم العيادة"
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
                    { role === 1 && <TextField label={"الادمن"} select sx={{minWidth : "200px"}} value={adminId} onChange={e => setadminId(e.target.value)} >
                        <MenuItem value="" > الكل </MenuItem>
                        {admins && admins.map(admin => {
                            return (
                                <MenuItem key={admin.id} value={admin.id} > {admin.name} </MenuItem>
                            )
                        })}
                    </TextField>}
                </Stack>

                <Stack direction={"row"} spacing={8} alignItems={"center"}>
                    {role === 2 && (
                        <Link to={"add"}>
                            <Button startIcon={<AddCircleOutlineRoundedIcon />} variant="contained" sx={{ p: "16px 40px", borderRadius: "8px" }} > اضافة عيادة </Button>
                        </Link>
                    )}
                    <CSVLink data={filteredData}> <IconButton color="primary"> <SaveAltIcon /> </IconButton> </CSVLink>
                </Stack>
            </Stack>
            {/* Table */}
            <Table headers={headers} data={filteredData} loading={loading} body={body} edit={role === 2 && true} profile={true} />
            {/* Number */}
            <Typography fontWeight={500} color={"text.secondary"} mt={4}> عدد العيادات : {filteredData?.length} </Typography>
        </Container>
    );
};

export default List;
