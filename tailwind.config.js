/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
