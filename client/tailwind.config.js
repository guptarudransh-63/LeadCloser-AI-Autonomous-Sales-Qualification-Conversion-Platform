/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0F14',
          sidebar: '#111720',
          card: '#161E29',
          elevated: '#1C2633',
        },
        accent: {
          primary: '#8B9CF6',
          secondary: '#55D6BE',
        },
        text: {
          main: '#F3F5F7',
          muted: '#98A5B5',
        },
        border: {
          dark: '#2A3544',
        },
        status: {
          success: '#36C98F',
          warning: '#F2B95E',
          danger: '#F16B78',
        }
      }
    },
  },
  plugins: [],
}
