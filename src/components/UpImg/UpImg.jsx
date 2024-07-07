import { Box, Stack, Typography } from "@mui/material";
import addImg from "../../images/addImg.png";

const UpImg = ({ file, handleChange, id }) => {
    return (
        <Stack my={8}>
            <Typography variant="label" color={"text.secondary"} mb={8}>
                {" "}
                صورة المنشأة <span style={{ color: "red" }}>*</span>{" "}
            </Typography>

            <input
                type="file"
                id={id}
                style={{ display: "none" }}
                multiple={false}
                onChange={handleChange}
            />

            <label
                htmlFor={id}
                style={{ position: "relative", width: "fit-content" }}
            >
                <Box
                    width={"120px"}
                    height={"120px"}
                    display={"flex"}
                    alignItems={"center"}
                    justifyContent={"center"}
                    bgcolor={"#EEF1F2"}
                    borderRadius={"50%"}
                    sx={{
                        cursor: "pointer",
                        transition: ".5s",
                        "&:hover": { bgcolor: "#0097A620" },
                    }}
                    position={"relative"}
                    overflow={file && "hidden"}
                >
                    {file ? (
                        <img
                            width={"120px"}
                            height={"120px"}
                            src={file}
                            alt=""
                            style={{ objectFit: "contain" }}
                        />
                    ) : (
                        <img src={addImg} alt="" />
                    )}
                </Box>

                {/* <Box position={"absolute"} sx={{cursor : "pointer"}} right={0} bottom={0} > <IconButton color='primary' > <EditIcon /> </IconButton> </Box> */}
            </label>
        </Stack>
    );
};

export default UpImg;
