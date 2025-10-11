const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson Hyperlegible', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'brand-blue': {
          DEFAULT: '#2563eb', // A friendly, accessible blue for primary actions
          dark: '#1e3a8a',    // A deep, trustworthy blue for text and headings
        },
        'brand-background': '#f8fafc', // A very light, calming slate for the page background
        'brand-green': {
          light: '#f0fdf4',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        'brand-amber': {
          light: '#fffbeb',
          DEFAULT: '#f59e0b',
        },
        'brand-red': {
          light: '#fef2f2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
}
