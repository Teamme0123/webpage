/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS, TS, JSX, TSX files in src
  ],
  theme: {
    extend: {
      colors: {
        // Example: Add custom colors for the church theme
        'church-primary': '#0047AB', // Example: A nice blue
        'church-secondary': '#FFD700', // Example: Gold accent
        'church-light-bg': '#F0F4F8',
        'church-dark-text': '#333333',
      },
      fontFamily: {
        // Example: Add custom fonts if you have them
        // sans: ['Inter', 'sans-serif'],
        // serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [
    // require('@tailwindcss/forms'), // Uncomment if you need form styling plugin
    // require('@tailwindcss/typography'), // Uncomment for prose styling
  ],
}
