// The rule for new passwords, as the API checks it: 8+ characters, letters and numbers.
export const PASSWORD_HINT = "8 خانات على الاقل، فيها حروف وأرقام";

// What is wrong with a new password, in Arabic, or null.
export const passwordProblem = (value) => {
    if (!value || value.length < 8) return "كلمة المرور 8 خانات على الاقل";
    if (!/\p{L}/u.test(value) || !/\d/.test(value)) return "كلمة المرور لازم يكون فيها حروف وأرقام";
    return null;
};

// For react-hook-form: `validate: validPassword` (true, or the message).
export const validPassword = (value) => passwordProblem(value) ?? true;
