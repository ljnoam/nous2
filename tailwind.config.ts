import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // <-- ici dedans ✅
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pinklove: '#ff3b81',
      },
    },
  },
  plugins: [],
}

export default config
