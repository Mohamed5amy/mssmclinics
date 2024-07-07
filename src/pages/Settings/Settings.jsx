import { Typography } from "@mui/material";
import Container from "../../components/Container/Container";
import Activities from "./Activities";
import Services from "./Services";
import Providers from "./Providers";


const Settings = () => {
  return (
    <Container>
      <Typography variant="h3" mb={8}> الاعدادات </Typography>
      <Providers />
      <Activities />
      <Services/>
    </Container>
  )
}




export default Settings
