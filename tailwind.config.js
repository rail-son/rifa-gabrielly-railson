/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f5f0e8',
        'cream-dark': '#e8e0d0',
        moss: {
          DEFAULT: '#5c6b4a',
          light: '#7a8c65',
          dark: '#3d4a30',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e0c578',
          dark: '#9c7b2e',
        },
        charcoal: '#1c1c1c',
        amber: '#d4a017',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        body: ['Lato', 'sans-serif'],
      },
      animation: {
        'heart-beat': 'heartBeat 0.3s ease-in-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
