/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-text': 'var(--color-accent-text)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
        success: 'var(--color-success)',
        'success-soft': 'var(--color-success-soft)',
        border: 'var(--color-border)',
      },
      boxShadow: {
          'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          'card': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07)',
          'glow': '0 0 15px -3px var(--color-accent)',
      }
    }
  },
  plugins: [],
}
