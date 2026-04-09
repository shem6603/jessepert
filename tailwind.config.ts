import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a192f', // primary dark text/backgrounds
        },
        'soft-teal': {
          DEFAULT: '#e6f4f1', // secondary/subtle backgrounds
        },
        'sky-blue': {
          DEFAULT: '#0ea5e9', // primary buttons/accents
        },
        'dark-teal': {
          DEFAULT: '#0f766e', // secondary buttons/borders
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
