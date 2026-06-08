/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#F5F0E8', // Warm paper cream background
          light: '#F5F0E8',
          dark: '#1E1B15', // Deep charcoal-gold dark mode
          cardLight: '#FFFFFF',
          cardDark: '#2A251D',
          borderLight: '#E6DFD3',
          borderDark: '#3A342B'
        },
        primary: {
          DEFAULT: '#D4A843', // Rich academic gold
          hover: '#B58B2F',
          light: '#FBF8F3' // Soft cream-gold
        },
        secondary: {
          DEFAULT: '#EAE5DB', // Darker cream for contrast
          dark: '#352F26'
        },
        text: {
          light: '#2C2518', // Warm charcoal brown
          lightMuted: '#8C8270', // Muted academic grey-brown
          dark: '#EFECE6',
          darkMuted: '#A09685'
        },
        danger: '#FF6B6B',
        success: '#00B894'
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'serif'],
        body: ['"Lora"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        label: ['"DM Sans"', 'sans-serif'],
        cursive: ['"Dancing Script"', 'cursive']
      },
      boxShadow: {
        premium: '0 4px 20px rgba(212, 168, 67, 0.06)',
        premiumHover: '0 8px 30px rgba(212, 168, 67, 0.12)'
      }
    },
  },
  plugins: [],
}
