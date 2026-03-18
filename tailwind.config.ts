import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#090b0f',
        panel: '#12161d',
        line: '#252c36',
        accent: '#f97316',
        success: '#34d399',
        warning: '#f59e0b',
        danger: '#f87171',
        codex: {
          charcoal: '#0f172a',
          navy: '#1e293b',
          orange: '#f97316',
          border: '#334155',
          glass: 'rgba(30, 41, 59, 0.7)',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(249, 115, 22, 0.12)',
      },
      backgroundImage: {
        'panel-radial':
          'radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 38%)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Microsoft YaHei UI"', '"Segoe UI Variable"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
