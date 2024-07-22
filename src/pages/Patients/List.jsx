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

    const headers = ["اسم المريض" , "رقم الهاتف" , "العمر" , "عن طريق" ]
    const body = ["name" , "phone" , "age" , "providerName"]

    const [loading, setLoading] = useState(false);
    const [admins, setAdmins] = useState([]);

    // Get Admins
    useEffect(() => {
        setLoading(true);
        axios
            .get(import.meta.env.VITE_API + "list-patients", {
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
    }, []);

    // Search Admins
    const [search, setSearch] = useState("");
    const filteredData = useSearch({data : admins , name : "name" , search : search})

    
    const role = useRole();

    return (
        <Container>
            {/* Filter */}
            <Stack direction={{xs : "column" , sm : "row"}} alignItems={"center"} justifyContent={"space-between"} mb={8} spacing={8} >
                <TextField type="search"
                    sx={{ bgcolor: "primary.white" }}
                    placeholder="البحث بالاسم"
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
