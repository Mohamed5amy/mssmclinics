import { Button, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Popup from "../../components/Popup/Popup"
import { useDispatch, useSelector } from 'react-redux';
import { ADD_PROVIDER, DEL_PROVIDER, GET_PROVIDERS } from '../../store/providerSlice';

const Providers = () => {

  const dispatch = useDispatch()
  const features = useSelector(state => state.providers.providers)
  
  // Get Documents  

  useEffect(() => {
    axios.get(import.meta.env.VITE_API + "providers" , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res.data.data)
      dispatch(GET_PROVIDERS(res.data.data))
    })
    .catch((err) => {
      console.log(err.response.data)
    })
  } , [dispatch])

  // Delete Document
  const [delId, setdelId] = useState(null)
  const [open, setOpen] = useState(false)

  const deleteFeature = () => {
    axios.post(import.meta.env.VITE_API + "delete-providers" , {id : delId} , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res)
      dispatch(DEL_PROVIDER(delId))
      setOpen(false)
    })
    .catch((err) => {
      console.log(err)
    })
  }

  // Add Document
  const [feature, setFeature] = useState("")
  const [loading, setLoading] = useState(false)

  const addFeature = () => {
    setLoading(true)
    axios.post(import.meta.env.VITE_API + "clinic/providers" , { title : feature } , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res)
      dispatch(ADD_PROVIDER(res.data.data))
      setFeature("")
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => setLoading(false))
  }
  
  
  return (
    <Stack p={8} pb={12} bgcolor={"white"} borderRadius={"8px"} mb={12} >

      <Typography variant='title' mb={8} pb={8} borderBottom={"1px solid"} borderColor={"primary.border"}> المصادر </Typography>

      <Stack direction={"row"} spacing={8} alignItems={"center"} justifyContent={"space-between"} mb={16} >
        <TextField
          label="المصدر"
          fullWidth
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          sx={{ flex : 2 }}
        />
        <Button 
          variant="contained"
          sx={{
            p : "13px 100px"
          }} 
          onClick={() => addFeature()}
          disabled={(loading || !feature) && true}
        >اضافة</Button>
      </Stack>

      {features && 
      <Grid container spacing={8} >
        {features.map(doc => {
          return (
            <Grid item key={doc.id} xs={12} sm={6} md={4} >
              <Stack className="item" key={doc?.id} direction={"row"} p={"12px 8px"} justifyContent={"space-between"} alignItems={"center"} border={"1px solid #CBCFD2"} borderRadius={"8px"} spacing={12} >
                <Typography sx={{fontWeight : "500"}}>{doc?.title}</Typography>
                <IconButton color='error' onClick={() => {
                  setdelId(doc.id);
                  setOpen(true)
                }} >
                  <CloseRoundedIcon fontSize='small' sx={{
                    cursor : "pointer"
                  }} />
                </IconButton>
              </Stack>
            </Grid>
          )
        })}
      </Grid>
      }

      <Popup open={open} setOpen={setOpen} message={"هل انت متأكد انك تريد حذف هذا المصدر ؟"} type={"delete"} fn={deleteFeature} />

    </Stack>
  )
}

export default Providers
