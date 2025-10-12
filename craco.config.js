// craco.config.js – FINAL VERSION
module.exports = {
  style: {
    postcssOptions: {
      plugins: [
        require('tailwindcss'), // <-- CORRECT!
        require('autoprefixer'),
      ],
    },
  },
};