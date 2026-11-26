/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fffafb',
        ink: {
          DEFAULT: '#3d2c2e',
          soft: '#6e5a5c',
          faint: '#a8979a',
        },
        blush: {
          50: '#fff5f7',
          100: '#ffe4e9',
          200: '#fdd0d8',
          300: '#f8afbc',
          500: '#e07388',
        },
        lilac: {
          50: '#f8f4fd',
          100: '#efe6fa',
          200: '#ddcbf2',
          300: '#c4a8e0',
          400: '#a98ad0',
          500: '#8f6cbd',
          600: '#7553a3',
        },
        sunny: {
          100: '#fff6d1',
          300: '#fde68a',
          500: '#f4c443',
        },
        cloud: '#d8ecfb',
      },
      fontFamily: {
        sans: ['"Patrick Hand"', '"Comic Sans MS"', '"Chalkboard SE"', 'cursive'],
        mono: ['"Courier Prime"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'sketch-sm': '2px 2px 0 0 #3d2c2e',
        sketch: '3px 3px 0 0 #3d2c2e',
        'sketch-lg': '5px 5px 0 0 #3d2c2e',
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
          '0%, 100%': { stroke: '#fbbf24', strokeOpacity: '1' },
          '50%': { stroke: '#fb7185', strokeOpacity: '0.55' },
        },
        'bot-glow': {
          '0%, 100%': { boxShadow: '0 0 5px 1px rgba(232, 121, 249, 0.55)' },
          '50%': { boxShadow: '0 0 14px 4px rgba(232, 121, 249, 0.95)' },
        },
        'alert-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.65)' },
          '100%': { boxShadow: '0 0 0 14px rgba(251, 191, 36, 0)' },
        },
      },
      animation: {
        shake: 'shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'hit-flash': 'hit-flash 0.6s ease-out both',
        'cage-alert': 'cage-alert 1s ease-in-out infinite',
        'bot-glow': 'bot-glow 1.4s ease-in-out infinite',
        'alert-ring': 'alert-ring 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
