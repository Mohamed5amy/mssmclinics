import { configureStore } from "@reduxjs/toolkit";
import providerReducer from "./providerSlice";
import featuresReducer from "./featuresSlice";
import activitiesReducer from "./activitiesSlice";

const store = configureStore({ reducer : { providers : providerReducer , features : featuresReducer , activities : activitiesReducer } })

export default store;