// craco.config.js - FINAL VERSION
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('@tailwindcss/postcss'), // This is the correct plugin to use
        require('autoprefixer'),
      ],
    },
  },
};
