// craco.config.js – FINAL VERSION
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'), // <-- CORRECT!
        require('autoprefixer'),
      ],
    },
  },
};