import { Button, Grid, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Popup from "../../components/Popup/Popup"
import { GET_FEATURES , DEL_FEATURE, ADD_FEATURE, EDIT_FEATURE } from '../../store/featuresSlice';
import { useDispatch, useSelector } from 'react-redux';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';



const Services = () => {

  const dispatch = useDispatch()
  const features = useSelector(state => state.features.features)
  
  // Get Documents  
  useEffect(() => {
    axios.get(import.meta.env.VITE_API + "services" , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res.data.data)
      dispatch(GET_FEATURES(res.data.data))
    })
    .catch((err) => {
      console.log(err.response.data)
    })
  } , [dispatch])

  // Delete Document
  const [delId, setdelId] = useState(null)
  const [open, setOpen] = useState(false)

  const deleteFeature = () => {
    axios.post(import.meta.env.VITE_API + "delete-services" , {id : delId} , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res)
      dispatch(DEL_FEATURE(delId))
      setOpen(false)
    })
    .catch((err) => {
      console.log(err)
    })
  }

  // Add Document
  const [feature, setFeature] = useState("")
  const [parent, setParent] = useState("")
  const [loading, setLoading] = useState(false)

  const addFeature = () => {
    setLoading(true)
    axios.post(import.meta.env.VITE_API + "clinic/services" , { name : feature , price : parent } , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res)
      dispatch(ADD_FEATURE(res.data.data))
      setFeature("")
      setParent("")
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => setLoading(false))
  }

  // Edit
  const [editId, setEditId] = useState()
  const [featureEdit, setFeatureEdit] = useState("")
  const [parentEdit, setParentEdit] = useState("")

  const editFeature = () => {
    setLoading(true)
    axios.post(import.meta.env.VITE_API + "clinic/update-services" , { name : featureEdit , id : editId , price : parentEdit } , {
      headers : {
        Authorization : "Bearer " + localStorage.getItem("token")
      }
    })
    .then((res) => {
      console.log(res)
      dispatch(EDIT_FEATURE(res.data.data))
      setFeatureEdit("")
      setEditId("")
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => setLoading(false))
  }
  
  return (
    <Stack p={8} pb={12} bgcolor={"white"} borderRadius={"8px"} mb={12} >

      <Typography variant='title' mb={8} pb={8} borderBottom={"1px solid"} borderColor={"primary.border"}> الخدمات </Typography>

      <Stack direction={{xs : "column" , sm : "row"}} spacing={8} alignItems={"center"} justifyContent={"space-between"} mb={16} >
        <TextField
          label="اسم الخدمة"
          fullWidth
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          sx={{ flex : 2 }}
        />
        <TextField
          label="سعر الخدمة"
          fullWidth
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          sx={{ flex : 2 }}
          type='number'
        />
        <Button 
          variant="contained"
          fullWidth
          sx={{
            p : "13px 0",
            flex: .5
          }} 
          onClick={() => addFeature()}
          disabled={(loading || !feature || !parent) && true}
        >اضافة</Button>
      </Stack>

      {features && 
      <Grid container spacing={8} >
        {features.map(doc => {
          return (
            <Grid item key={doc.id} xs={12} sm={6} md={4} >
              <Tooltip title={ "السعر : " + doc.price}>
                <Stack className="item" key={doc?.id} direction={"row"} p={"12px 8px"} justifyContent={"space-between"} alignItems={"center"} border={"1px solid #CBCFD2"} borderRadius={"8px"} spacing={12} >
                  <Typography sx={{fontWeight : "500"}}>{doc?.name}</Typography>
                  <Stack direction={"row"} >
                    {editId === doc.id ?
                    <IconButton color='error' onClick={() => {
                      setEditId("");
                      setFeatureEdit("")
                      setParentEdit("")
                    }}>
                      <CloseIcon fontSize='small' sx={{
                        cursor : "pointer"
                      }} />
                    </IconButton>
                    :
                    <IconButton color='primary' onClick={() => {
                      setEditId(doc.id);
                      setFeatureEdit(doc.name)
                      setParentEdit(doc?.price)
                    }}>
                      <EditIcon fontSize='small' sx={{
                        cursor : "pointer"
                      }} />
                    </IconButton>
                    }
                    <IconButton color='error' onClick={() => {
                      setdelId(doc.id);
                      setOpen(true)
                    }} >
                      <DeleteOutlineIcon fontSize='small' sx={{
                        cursor : "pointer"
                      }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Tooltip>
            </Grid>
          )
        })}
      </Grid>
      }

      {editId && <Stack direction={{xs : "column" , sm : "row"}} spacing={8} alignItems={"center"} justifyContent={"space-between"} mt={16} >
        <TextField
          label="اسم الخدمة"
          fullWidth
          value={featureEdit}
          onChange={(e) => setFeatureEdit(e.target.value)}
          sx={{ flex : 2 }}
        />
        <TextField
          label="سعر الخدمة"
          type='number'
          fullWidth
          value={parentEdit}
          onChange={(e) => setParentEdit(e.target.value)}
          sx={{ flex : 1 }}
        />
        <Button 
          variant="contained"
          fullWidth
          sx={{
            p : "13px 0",
            flex: .5
          }} 
          onClick={() => editFeature()}
          disabled={(loading || !featureEdit || !parentEdit) && true}
        >تعديل</Button>
      </Stack>}

      <Popup open={open} setOpen={setOpen} message={"هل انت متأكد انك تريد حذف هذه الخدمة ؟"} type={"delete"} fn={deleteFeature} />

    </Stack>
  )
}

export default Services
