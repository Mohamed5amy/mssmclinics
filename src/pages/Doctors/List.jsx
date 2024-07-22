import {
    Button,
    IconButton,
    InputAdornment,
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
    const headers = ["الاسم", "رقم الجوال", "الايميل" , "التخصص" , "النسبة %"];
    const body = ["name", "phone", "email" , "specializeName" , "prectange"];
    const [loading, setLoading] = useState(false);
    const [admins, setAdmins] = useState([]);

    // Get Admins
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "list-doctors", {
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

    // Search Admins
    const [search, setSearch] = useState("");
    const filteredData = useSearch({data : admins , name : "name" , search : search})

    const role = useRole()
    console.log(role)
    return (
        <Container>
            {/* Filter */}
            <Stack direction={{xs : "column" , sm : "row"}} alignItems={"center"} justifyContent={"space-between"} mb={8} spacing={8}>
                <TextField type="search" sx={{ bgcolor: "primary.white" }} placeholder="البحث بالاسم" InputProps={{startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>)}} value={search} onChange={(e) => setSearch(e.target.value)}/>
                <Stack direction={"row"} spacing={8} alignItems={"center"}>

                    {role === 3 && <Link to={"add"}>
                        <Button startIcon={<AddCircleOutlineRoundedIcon />} variant="contained" sx={{ p: "16px 40px", borderRadius: "8px" }}>اضافة دكتور</Button>
                    </Link>}

                    <CSVLink data={filteredData}><IconButton color="primary"><SaveAltIcon /></IconButton></CSVLink>

                </Stack>
            </Stack>
            {/* Table */}
            <Table headers={headers} data={filteredData.reverse()} loading={loading} edit={role == 3 && true} profile={true} body={body} />
            {/* Number */}
            <Typography fontWeight={500} color={"text.secondary"} mt={4}> عدد الدكاترة : {filteredData?.length} </Typography>
        </Container>
    );
};

export default List;
