// =============================
// FILE: tailwind.config.ts
// =============================
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './public/**/*.html'
  ],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config

