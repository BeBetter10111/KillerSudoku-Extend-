/** @type {import('tailwindcss').Config} */

// Pastel "doodle" design palette.
const palette = {
  primary: '#BFA9DC',
  secondary: '#FDE2E6',
  surface: '#FFFFFF',
  error: '#B81D24',
  blush: '#FDE2E6',
  cage: '#8E6BC4',
  'cage-purple': '#8E6BC4',
  'doodle-sky': '#D6EEFF',
  'doodle-yellow': '#FCE68A',
  'dusty-rose': '#F3C4CB',
  ink: '#432E2A',
  lavender: '#BFA9DC',
  muted: '#625772',
  plum: '#625772',
  'pale-blush': '#FFF0F2',
  paper: '#FFFFFF',
  crimson: '#B81D24',
};

// The components were originally written against Tailwind's default dark
// slate/sky theme. Instead of a dark blue look, these scales re-map those
// utility names onto the pastel palette above: `slate` is inverted
// (900 = page background, 100 = espresso ink), `sky`/`fuchsia`/`emerald`
// become lavender / cage purple, `amber` becomes doodle yellow and
// `rose`/`red` become warm crimson + dusty rose.
const slate = {
  50: '#2E1F1C',
  100: '#432E2A',
  200: '#4D3B45',
  300: '#574A60',
  400: '#625772',
  500: '#8A7F99',
  600: '#D8C9E3',
  700: '#F3E3E9',
  800: '#FFFFFF',
  900: '#FFF7F8',
  950: '#FFF0F2',
};

const lavender = {
  50: '#F8F4FC',
  100: '#EFE7F8',
  200: '#6A4C9C',
  300: '#7656AE',
  400: '#8E6BC4',
  500: '#BFA9DC',
  600: '#B39BD6',
  700: '#A68BCF',
  800: '#8E6BC4',
  900: '#5E4389',
  950: '#3F2D5C',
};

const purple = {
  50: '#F8F4FC',
  100: '#5E4389',
  200: '#6A4C9C',
  300: '#7656AE',
  400: '#8E6BC4',
  500: '#8E6BC4',
  600: '#8E6BC4',
  700: '#7656AE',
  800: '#5E4389',
  900: '#3F2D5C',
  950: '#2C1F40',
};

const yellow = {
  50: '#FFFBEA',
  100: '#6E5200',
  200: '#7A5B00',
  300: '#866500',
  400: '#F0CF4F',
  500: '#FCE68A',
  600: '#E8C547',
  700: '#C9A42A',
  800: '#9C7C14',
  900: '#6E5200',
  950: '#4A3700',
};

const crimson = {
  50: '#FFF0F2',
  100: '#8F141A',
  200: '#9E161D',
  300: '#B81D24',
  400: '#C9343B',
  500: '#B81D24',
  600: '#B81D24',
  700: '#F3C4CB',
  800: '#8F141A',
  900: '#6B0F13',
  950: '#4A0A0D',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...palette,
        slate,
        sky: lavender,
        fuchsia: purple,
        emerald: purple,
        amber: yellow,
        rose: crimson,
        red: crimson,
      },
      fontFamily: {
        sans: ['"Patrick Hand"', '"Comic Sans MS"', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['"Gaegu"', '"Patrick Hand"', '"Comic Sans MS"', 'system-ui', 'sans-serif'],
        mono: ['"Courier Prime"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sketch: '3px 3px 0 0 #432E2A',
        'sketch-sm': '2px 2px 0 0 #432E2A',
        'sketch-lg': '5px 5px 0 0 #432E2A',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'hit-flash': {
          '0%': { opacity: '0.85' },
          '100%': { opacity: '0' },
        },
        'cage-alert': {
          '0%, 100%': { stroke: '#E8C547', strokeOpacity: '1' },
          '50%': { stroke: '#B81D24', strokeOpacity: '0.6' },
        },
        'bot-glow': {
          '0%, 100%': { boxShadow: '0 0 5px 1px rgba(142, 107, 196, 0.5)' },
          '50%': { boxShadow: '0 0 14px 4px rgba(142, 107, 196, 0.9)' },
        },
        'alert-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(232, 197, 71, 0.7)' },
          '100%': { boxShadow: '0 0 0 14px rgba(232, 197, 71, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shake: 'shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'hit-flash': 'hit-flash 0.6s ease-out both',
        'cage-alert': 'cage-alert 1s ease-in-out infinite',
        'bot-glow': 'bot-glow 1.4s ease-in-out infinite',
        'alert-ring': 'alert-ring 1.2s ease-out infinite',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
