import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Raw Aurora scale — use directly when a token needs to stay fixed across themes
        aurora: {
          primary: {
            100: '#f7f1ff',
            200: '#ede0ff',
            300: '#cba6ff',
            400: '#b078ff',
            500: '#9c59fc',
            600: '#8c42f4',
            700: '#702ad7',
            800: '#4c2099',
            900: '#311a6d',
            1000: '#1a0e39',
          },
          secondary: {
            100: '#ebfdf5',
            200: '#a6f7d3',
            300: '#05f59c',
            400: '#00c17a',
            500: '#006640',
          },
          gray: {
            50: '#f9f9f9',
            100: '#f3f3f3',
            200: '#eaeaea',
            300: '#dcdcdc',
            400: '#d6d6d6',
            500: '#aaaaaa',
            600: '#888888',
            700: '#585858',
            800: '#3e3e3e',
            900: '#1c1c1c',
            1000: '#111111',
          },
        },
        status: {
          green: '#6dd804',
          blue: '#1ea5fc',
          lightRed: '#ffa89c',
          red: '#e43c25',
          gray: '#aaaaaa',
          orange: '#fca846',
        },
        // Semantic tokens — resolve differently per theme via CSS variables.
        // NOTE: these are opaque `var()` references, so Tailwind's opacity
        // modifier (bg-canvas/80) cannot parse an alpha out of them at build
        // time — use the pre-baked `-translucent` / `-soft` variants instead.
        canvas: {
          DEFAULT: 'var(--color-bg)',
          translucent: 'var(--color-bg-translucent)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          muted: 'var(--color-surface-muted)',
          translucent: 'var(--color-surface-translucent)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
        },
        fg: {
          DEFAULT: 'var(--color-fg)',
          muted: 'var(--color-fg-muted)',
          subtle: 'var(--color-fg-subtle)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          foreground: 'var(--color-primary-foreground)',
          soft: 'var(--color-primary-soft)',
          'soft-foreground': 'var(--color-primary-soft-fg)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          foreground: 'var(--color-secondary-foreground)',
          soft: 'var(--color-secondary-soft)',
          'soft-foreground': 'var(--color-secondary-soft-fg)',
        },
      },
      backgroundImage: {
        aurora: 'linear-gradient(136deg, #7d2ded 0%, #05f59c 100%)',
        'aurora-dark': 'linear-gradient(136deg, #000 0%, #7d2ded 73.72%, #05f59c 100%)',
        'aurora-conic': 'conic-gradient(from 120deg at 50% 50%, #05f59c 0deg, #7d2ded 180deg, #05f59c 360deg)',
        'aurora-soft': 'linear-gradient(136deg, rgba(156,89,252,0.16) 0%, rgba(5,245,156,0.16) 100%)',
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
        'aurora-flow': 'auroraFlow 8s ease infinite',
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
        auroraFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [typography],
}
