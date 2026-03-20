/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'war-room': {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        'severity': {
          red: '#ef4444',
          yellow: '#eab308',
          green: '#22c55e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-red': 'pulse-red 2s infinite',
        'pulse-yellow': 'pulse-yellow 2s infinite',
        'radar-sweep': 'spin 2s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239,68,68,0.7)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(239,68,68,0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
        'pulse-yellow': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(234,179,8,0.7)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 15px rgba(234,179,8,0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(234,179,8,0)' },
        },
      },
    },
  },
  plugins: [],
}
