import { createSlice } from "@reduxjs/toolkit";

const providersSlice = createSlice({
  name : "providers",
  initialState : { providers : [] },
  reducers : {
    GET_PROVIDERS : (state , action) => {
      state.providers = action.payload
    },
    DEL_PROVIDER : (state , action) => {
      state.providers = state.providers.filter(provider => provider.id !== action.payload )
    },
    ADD_PROVIDER : (state , action) => {
      state.providers = [...state.providers, action.payload]
    },
    EDIT_PROVIDER : (state , action) => {
      const item = state.providers.filter(provider => provider.id === action.payload.id)
      const index = state.providers.indexOf(item[0])
      state.providers[index] = action.payload
      state.providers = [ ...state.providers ]
    },
  }
})


export const { GET_PROVIDERS , ADD_PROVIDER , DEL_PROVIDER , EDIT_PROVIDER } = providersSlice.actions;
export default providersSlice.reducer;