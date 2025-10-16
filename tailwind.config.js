const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'brand-blue': {
          DEFAULT: '#0077B6',
          dark: '#004E89',
        },
        'brand-background': '#F1F5F9',
        'brand-green': {
          light: '#EBF9F0',
          DEFAULT: '#28A745',
          dark: '#1E7E34',
          darker: '#155724',
        },
        'brand-amber': {
          light: '#FFF9E6',
          DEFAULT: '#FFC107',
          dark: '#B38600',
        },
        'brand-red': {
          light: '#FDEEEE',
          DEFAULT: '#DC3545',
          dark: '#A42631',
        },
      },
    },
  },
  plugins: [],
}