import { createSlice } from "@reduxjs/toolkit";

const featuresSlice = createSlice({
  name : "features",
  initialState : { features : [] },
  reducers : {
    GET_FEATURES : (state , action) => {
      state.features = action.payload
    },
    DEL_FEATURE : (state , action) => {
      state.features = state.features.filter(feature => feature.id !== action.payload )
    },
    ADD_FEATURE : (state , action) => {
      state.features = [...state.features, action.payload]
    },
    EDIT_FEATURE : (state , action) => {
      const item = state.features.filter(feature => feature.id === action.payload.id)
      const index = state.features.indexOf(item[0])
      state.features[index] = action.payload
      state.features = [ ...state.features ]
    },
  }
})


export const { GET_FEATURES , ADD_FEATURE , DEL_FEATURE , EDIT_FEATURE } = featuresSlice.actions;
export default featuresSlice.reducer;