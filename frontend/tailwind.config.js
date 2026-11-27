/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: '#BFA9DC',
        blush: '#FDE2E6',
        'cage-purple': '#8E6BC4',
        'doodle-sky': '#D6EEFF',
        'doodle-yellow': '#FCE68A',
        'dusty-rose': '#F3C4CB',
        ink: '#432E2A',
        muted: '#625772',
        'pale-blush': '#FFF0F2',
        crimson: '#B81D24',
      },
      fontFamily: {
        hand: ['"Patrick Hand"', '"Comic Sans MS"', 'cursive'],
        doodle: ['"Short Stack"', '"Comic Sans MS"', 'cursive'],
      },
      boxShadow: {
        doodle: '3px 3px 0 0 #432E2A',
        'doodle-sm': '2px 2px 0 0 #432E2A',
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
          '0%, 100%': { stroke: '#B81D24', strokeOpacity: '1' },
          '50%': { stroke: '#8E6BC4', strokeOpacity: '0.55' },
        },
        'bot-glow': {
          '0%, 100%': { boxShadow: '0 0 5px 1px rgba(142, 107, 196, 0.55)' },
          '50%': { boxShadow: '0 0 14px 4px rgba(142, 107, 196, 0.95)' },
        },
        'alert-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(184, 29, 36, 0.35)' },
          '100%': { boxShadow: '0 0 0 14px rgba(184, 29, 36, 0)' },
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
