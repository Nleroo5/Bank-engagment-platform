import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          navy: '#003da5', // Primary brand color
          red: '#ce0037', // Secondary brand color
        },
        // Primary color palette (Navy Blue)
        primary: {
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#003da5', // Brand navy
          600: '#003184',
          700: '#002563',
          800: '#001942',
          900: '#000c21',
          950: '#000610',
        },
        // Accent color palette (Red)
        accent: {
          50: '#ffe6ec',
          100: '#ffccd9',
          200: '#ff99b3',
          300: '#ff668c',
          400: '#ff3366',
          500: '#ce0037', // Brand red
          600: '#a5002c',
          700: '#7c0021',
          800: '#520016',
          900: '#29000b',
          950: '#140005',
        },
      },
    },
  },
  plugins: [],
};

export default config;
