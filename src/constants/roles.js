// The kinds of account, by the role name the API returns:
//   admin        - the platform owner: sees every group, manages groups only
//   owner        - a group's owner: branches, doctors, staff, prices, settings
//   receptionist - one branch's front desk
//   doctor       - works in one or more branches
const ROLES = ["admin", "owner", "receptionist", "doctor"];

export const isKnownRole = (name) => ROLES.includes(name);

// Where each account lands after signing in.
export const homeFor = (name) => {
    if (name === "admin") return "/groups";
    if (name === "owner") return "/insights";
    return "/queue";
};
