/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',
          navy: '#090f1d',
          blue: '#3b82f6',
          electric: '#00d2ff',
          red: '#ef4444',
          neonred: '#ff2e2e',
          green: '#10b981',
          neongreen: '#00ff66',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(59, 130, 246, 0.4)',
        glowred: '0 0 15px rgba(239, 68, 68, 0.5)',
        glowgreen: '0 0 15px rgba(16, 185, 129, 0.5)',
      }
    },
  },
  plugins: [],
}
