import { ArrowBackIos } from "@mui/icons-material";
import { IconButton, Stack, Typography } from "@mui/material";

const Back = ({ title }) => {
    return (
        <Stack direction={"row"} alignItems={"center"}>
            <IconButton color="text.primary" onClick={() => history.back()}>
                <ArrowBackIos sx={{ rotate: "180deg" }} />
            </IconButton>
            <Typography variant="breadcrumbs"> {title} </Typography>
        </Stack>
    );
};

export default Back;
