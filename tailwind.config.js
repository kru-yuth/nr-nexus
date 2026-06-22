/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a5c38',
        'primary-light': '#e8f5ee',
        'primary-dark': '#134429',
        present: '#10b981',
        absent: '#f43f5e',
        late: '#f59e0b',
        leave: '#3b82f6',
      },
    },
  },
  plugins: [],
}
