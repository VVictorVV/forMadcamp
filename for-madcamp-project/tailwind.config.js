/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['AstaSans', 'var(--font-geist-sans)', 'sans-serif'],
        'asta': ['AstaSans', 'sans-serif'],
        'asta-light': ['AstaSans-Light', 'sans-serif'],
        'asta-medium': ['AstaSans-Medium', 'sans-serif'],
        'asta-semibold': ['AstaSans-SemiBold', 'sans-serif'],
        'asta-bold': ['AstaSans-Bold', 'sans-serif'],
        'asta-extrabold': ['AstaSans-ExtraBold', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
} 