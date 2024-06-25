/** @type {import('tailwindcss').Config} */

const withMT = require("@material-tailwind/react/utils/withMT");
const colours = require("tailwindcss/colors")

module.exports = withMT({
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/react-tailwindcss-datetimepicker/dist/react-tailwindcss-datetimepicker.js"
    ],
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            fontFamily: {
                poppins: ["var(--font-poppins)"],
            },
            colors: {
                sky: colours.sky,
                emerald: colours.emerald,
            }
        },
    },
    plugins: [],
});
