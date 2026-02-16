/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html","./**/index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {},
    },
    plugins: [require("tailwindcss-animate"),require("tw-animate-css")],
}
