import { Stack } from "@mui/material";

const Footer = () => {
    const date = new Date();

    return (
        <Stack
            direction={"row"}
            alignItems={"center"}
            position={"absolute"}
            bottom={10}
            left={0}
            justifyContent={"center"}
            fontSize={{ xs: 12, sm: 16 }}
            width={"100%"}
        >
            © {date.getFullYear()}&nbsp;جميع الحقوق محفوظة&nbsp;
        </Stack>
    );
};

export default Footer;
