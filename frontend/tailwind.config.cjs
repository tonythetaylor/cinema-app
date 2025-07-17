const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      backdropBlur: { md:'8px', lg:'10px' },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.glass-bg': {
          'background-color':'rgba(255,255,255,0.1)',
          'backdrop-filter':'blur(10px)',
        },
        '.glass-btn': {
          'background-color':'rgba(255,255,255,0.2)',
          'backdrop-filter':'blur(8px)',
        },
      })
    }),
  ],
}