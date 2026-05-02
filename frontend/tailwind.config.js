/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        main: 'var(--bg-main)',
        card: {
          DEFAULT: 'var(--bg-card)',
          hover: 'var(--bg-card-hover)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          1: 'var(--accent-1)',
          2: 'var(--accent-2)',
          3: 'var(--accent-3)',
        },
      },
      backgroundImage: {
        'grad-text': 'var(--grad-text)',
        'grad-surface-1': 'var(--grad-surface-1)',
        'grad-surface-2': 'var(--grad-surface-2)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
        ease: 'var(--ease)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        med: 'var(--dur-med)',
      },
    },
  },
  plugins: [],
}
