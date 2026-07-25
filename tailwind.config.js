/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        theme: {
          bgPrimary: 'var(--tw-bg-primary)',
          bgSurface: 'var(--tw-bg-surface)',
          textPrimary: 'var(--tw-text-primary)',
          textMuted: 'var(--tw-text-muted)',
          borderColor: 'var(--tw-border-color)',
          accent: 'var(--tw-accent)',
          accentHover: 'var(--tw-accent-hover)',
          boxBg: 'var(--tw-box-bg)',
          boxText: 'var(--tw-box-text)',
          smallBoxBg: 'var(--tw-small-box-bg)',
          smallBoxText: 'var(--tw-small-box-text)',
          boxBorder: 'var(--tw-box-border)',
          buttonBg: 'var(--tw-button-bg)',
          buttonText: 'var(--tw-button-text)',
        },
        brand: {
          primary: '#8B5CF6',
          secondary: '#22D3EE',
          highlight: '#A78BFA',
          success: '#22C55E',
          danger: '#EF4444',
        },
        ui: {
          surface: '#020617',
          border: '#334155',
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
        },
      },
      boxShadow: {
        glow: '0 0 32px rgba(139,92,246,0.35)',
        cyan: '0 0 22px rgba(34,211,238,0.28)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeInUp: 'fadeInUp 0.65s ease forwards',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
