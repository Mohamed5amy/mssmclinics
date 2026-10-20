import ReactDOM from "react-dom/client";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./index.css";
import App from "./App.jsx";
import { isKnownRole } from "./constants/roles";
import { forceSignOut } from "./constants/session";

// A session from an account kind that no longer exists (the old clinic login).
if (localStorage.getItem("token") && !isKnownRole(localStorage.getItem("role"))) {
    forceSignOut("expired");
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
