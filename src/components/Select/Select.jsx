import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useState } from "react";

// Register is the imported register from useForm
// Error : error={errors?.city?.message || (error?.city && error?.city[0])} |||| Errors => from useForm , Error => respond 
// data : is data need to be listed
// registerName : Name Of Register
// Label : Is The Input Label
// Required Is True or False
// Name : is the name of the value in the object

const AutocompleteComponent = ({ register, error, data, registerName, label, required, name, defaultValue }) => {

    const [changed, setChanged] = useState(false);
    
    return (
        <Stack alignItems={"start"} spacing={4}>
            <Typography variant="label" color={"text.secondary"} >{label}<span style={{ color: "red" }}>*</span></Typography>

            <TextField
                {...register(registerName, {required: required && "This Field is required"})}
                fullWidth
                select
                error={error}
                color="primary"
                sx={{
                    borderRadius: "8px !important",
                    border: "1px solid",
                    borderColor: "primary.border",
                    bgcolor: "#eceff9",
                }}
                defaultValue={defaultValue || ""}
                onChange={() => setChanged(true)}
            >
                {data &&
                    data.map((item) => {
                        return (
                            <MenuItem value={item.id} key={item.id}>{item[name]}</MenuItem>
                        );
                    })}
            </TextField>

            {error && !changed && (
                <Stack direction={"row"} alignItems={"center"} spacing={4}>
                    <ErrorOutlineIcon sx={{ color: "red" }}/>
                    <Typography color={"red"} fontSize={"14px"} fontWeight={"500"} >
                        {error}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
}

export default AutocompleteComponent;