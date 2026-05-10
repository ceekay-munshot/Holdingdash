/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50: '#f7f8fb',
          100: '#eef0f6',
          200: '#dde1ec',
          300: '#b8bfd1',
          400: '#7c869f',
          500: '#525c75',
          600: '#384055',
          700: '#222a3d',
          800: '#141a2a',
          900: '#0a0e1c',
        },
        signal: {
          positive: '#10b981',
          watch: '#f59e0b',
          risky: '#f97316',
          red: '#ef4444',
        },
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(31, 41, 55, 0.10), 0 2px 6px -2px rgba(31, 41, 55, 0.06)',
        glow: '0 12px 40px -12px rgba(16, 185, 129, 0.35)',
        card: '0 1px 2px rgba(20, 26, 42, 0.04), 0 8px 24px -12px rgba(20, 26, 42, 0.10)',
      },
      backgroundImage: {
        'mesh-aurora':
          'radial-gradient(at 12% 8%, rgba(16,185,129,0.18) 0px, transparent 55%), radial-gradient(at 88% 0%, rgba(99,102,241,0.18) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(244,114,182,0.14) 0px, transparent 55%)',
        'hero-positive':
          'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 40%, #eff6ff 100%)',
        'hero-watch':
          'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ecfeff 100%)',
        'hero-risky':
          'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef2f2 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite',
        floatY: 'floatY 3.5s ease-in-out infinite',
        slideIn: 'slideIn 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        fadeUp: 'fadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
