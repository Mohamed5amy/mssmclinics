// The signed-in account, as the pages read it from localStorage.
export const saveSession = (user) => {
    localStorage.setItem("token", user.api_token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("role", user.role);
    localStorage.setItem("isSuper", user.is_super);
};

export const currentUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
        return {};
    }
};

// react-auth-kit keeps the session in these cookies (authName "_auth").
const AUTH_COOKIES = ["_auth", "_auth_storage", "_auth_state", "_auth_type", "_auth_refresh", "_auth_refresh_time"];

// Signs out without the auth kit's hooks - used when the API turns the session
// away (expired, deleted account, suspended group, closed branch). `reason` is
// shown on the login page.
export const forceSignOut = (reason) => {
    ["token", "user", "role", "isSuper", "admin_edit_data"].forEach((key) => localStorage.removeItem(key));
    const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    AUTH_COOKIES.forEach((name) => {
        document.cookie = `${name}=; ${expired}`;
        document.cookie = `${name}=; ${expired}; domain=${window.location.hostname}`;
    });
    window.location.replace("/" + (reason ? "?reason=" + reason : ""));
};
