import { Box, Stack } from "@mui/material";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../Sidebar/Sidebar";
import { useEffect, useState } from "react";
import Footer from "../Footer/Footer";





const Container = ({children}) => {

  const [active, setActive] = useState(true)
  const [expand, setExpand] = useState(true)
  const [activeMobile, setActiveMobile] = useState(true)

  useEffect(()=>{
    setActiveMobile(false)
  } , [])


  return (
    <Stack direction={"row"} minHeight={"100vh"} >
      <Sidebar activeMobile={activeMobile} setActive={setActive} active={active} expand={expand} />
      <Stack direction={"column"} width={"100%"} justifyContent={"start"} position={"relative"} pb={20} > 
        <Navbar 
          setActiveMobile={setActiveMobile} 
          activeMobile={activeMobile} 
          setExpand={setExpand} 
          setActive={setActive} 
        />
        <Box p={"16px 32px 16px 24px"}>{children}</Box>
        <Footer />
      </Stack>
    </Stack>
  )



}

export default Container
