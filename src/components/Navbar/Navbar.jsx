import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { IconButton, Stack, Typography } from '@mui/material';
import "./Navbar.scss"
import { useEffect, useState } from 'react';


const Navbar = ({setActiveMobile , activeMobile , setExpand , setActive}) => {

  const [search, setSearch] = useState("")

  let sidebar = localStorage.getItem("sidebar");

  const enableDarkMode = () => {
    localStorage.setItem("sidebar", "enabled");
    setActiveMobile(true)
    setExpand(true)
    setActive(true)
  };
  
  const disableDarkMode = () => {
    localStorage.setItem("sidebar", "disabled");
    setActiveMobile(false)
    setExpand(false)
    setActive(false)
  };

  useEffect(() => {
    if (sidebar === "enabled") {
      enableDarkMode();
    }
  } , [])

  const handleToggle = () => {
    sidebar = localStorage.getItem("sidebar"); // update sidebar when clicked
    if (sidebar === "disabled") {
      enableDarkMode();
    } else {
      disableDarkMode();
    }
  }
  
  const name = JSON.parse(localStorage.getItem("user")).name;
  const role = localStorage.getItem("role");
  
  return (
    <div className='Navbar'>
      <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"} height={"100%"} px={{xs : 4 , sm : 16}} py={9} spacing={{xs : 4 , md : 12}} >

        {/* Toggle Sidebar */}
        <IconButton color='primary' 
        sx={{borderRadius : "8px"}}
        onClick={() => handleToggle()} 
        >
          <MenuOpenIcon sx={{
            transition : ".5s",
            rotate : !activeMobile ? "180deg" : "0deg",
          }} />
        </IconButton>

        {/* Profile */}
        <Stack direction={"row"} spacing={4} alignItems={"center"}>
          <Stack width={{xs : "40px" , sm : "60px"}} height={{xs : "40px" , sm : "60px"}} borderRadius={"50%"} bgcolor={"primary.background"} alignItems={"center"} justifyContent={"center"} color={"primary.main"} fontSize={{xs : "20px" , sm :"30px"}}>
            {name[0].toUpperCase()}
          </Stack>
          <Stack display={{xs : "none" , sm : "flex"}} >
            <Typography variant='subtitle'>{name}</Typography>
          </Stack>
        </Stack>

      </Stack>  
    </div>
  )
}

export default Navbar
