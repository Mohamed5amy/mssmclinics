import { createSlice } from "@reduxjs/toolkit";

const activitiesSlice = createSlice({
  name : "activities",
  initialState : { activities : [] },
  reducers : {
    GET_ACTIVITIES : (state , action) => {
      state.activities = action.payload
    },
    DEL_ACTIVITY : (state , action) => {
      state.activities = state.activities.filter(activity => activity.id !== action.payload )
    },
    ADD_ACTIVITY : (state , action) => {
      state.activities = [...state.activities, action.payload]
    },
  }
})


export const { GET_ACTIVITIES , ADD_ACTIVITY , DEL_ACTIVITY } = activitiesSlice.actions;
export default activitiesSlice.reducer;