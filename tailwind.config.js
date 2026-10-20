import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
            },
            colors: {
                // MSSM blue
                brand: colors.blue,
            },
        },
    },
    plugins: [],
};
