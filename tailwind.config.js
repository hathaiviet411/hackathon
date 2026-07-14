/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          border: 'var(--color-border)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'trace-in': 'traceIn 0.35s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'neon-pulse': 'neonPulse 1.5s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        traceIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        neonPulse: {
          '0%, 100%': { boxShadow: '0 0 8px currentColor, 0 0 16px currentColor' },
          '50%': { boxShadow: '0 0 16px currentColor, 0 0 32px currentColor, 0 0 48px currentColor' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
