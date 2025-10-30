export default {
  plugins: {
    '@tailwindcss/postcss': {
      content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}']
    },
    autoprefixer: {},
  }
}