const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This is already correctly configured for the redesign.
        sans: ['"Atkinson Hyperlegible"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // --- NEW: Professional Color Palette ---
        'brand-blue': {
          DEFAULT: '#0077B6', // A strong, trustworthy blue for primary actions.
          dark: '#004E89',    // A deep, corporate blue for headings and important text.
        },
        'brand-background': '#F1F5F9', // A calm, soft gray for the page background (Tailwind Slate 100).
        'brand-green': {
          light: '#EBF9F0',   // A lighter tint for backgrounds.
          DEFAULT: '#28A745', // A vibrant, clear green for success states.
          dark: '#1E7E34',    // A darker shade for text on light green backgrounds.
          darker: '#155724',
        },
        'brand-amber': {
          light: '#FFF9E6',   // A light cream for warning backgrounds.
          DEFAULT: '#FFC107', // A standard, clear amber for warnings.
          dark: '#B38600',
        },
        'brand-red': {
          light: '#FDEEEE',   // A light pink for error backgrounds.
          DEFAULT: '#DC3545', // A strong, standard red for errors and warnings.
          dark: '#A42631',    // A deep red for critical text.
        },
      },
    },
  },
  plugins: [],
}
