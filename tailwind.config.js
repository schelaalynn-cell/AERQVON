/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        aerqvon: {
          bg: '#0a0b14', surface: '#14161f', 'surface-2': '#1b1e2b', 'surface-3': '#242838', border: '#2a2e40', text: '#f2f3f7', muted: '#8b90a3', dim: '#5b6075', accent: '#5b8cff', 'accent-2': '#7c5cff', success: '#2ecc8f', warning: '#f5b544', error: '#ff5c7c',
        },
        light: {
          bg: '#f4f5fa', surface: '#ffffff', 'surface-2': '#f0f1f7', 'surface-3': '#e7e9f2', border: '#e0e2ee', text: '#15171f', muted: '#6b7080', dim: '#9aa0b2',
        },
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: { card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)', glow: '0 0 24px -4px rgba(91,140,255,0.5)' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pop: { '0%': { transform: 'scale(0.85)' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.8)', opacity: '0.6' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: { 'fade-in': 'fade-in 0.3s ease-out both', 'slide-up': 'slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both', 'scale-in': 'scale-in 0.25s ease-out both', pop: 'pop 0.4s cubic-bezier(0.22,1,0.36,1) both', shimmer: 'shimmer 1.6s infinite', 'pulse-ring': 'pulse-ring 1.8s ease-out infinite' },
    },
  },
  plugins: [],
};
