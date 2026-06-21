import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ww: {
          'bg-app':        '#06080c',
          'bg-surface':    '#0a0f16',
          'bg-bar':        '#080b10',
          'bg-header-row': '#0c1219',
          'bg-input':      '#0c1118',
          'border':        '#1a2230',
          'border-subtle': '#141b26',
          'border-faint':  '#121925',
          'text-primary':  '#e6edf3',
          'text-secondary':'#c7d2de',
          'text-muted':    '#9aa7b6',
          'text-dim':      '#6b7888',
          'text-faint':    '#4a5666',
          'text-ghost':    '#3a4452',
          'accent-green':  '#00e5a0',
          'tier-shark':    '#f5b942',
          'tier-whale':    '#ff8f3f',
          'tier-mega':     '#ff4d4d',
          'side-yes':      '#00e5a0',
          'side-no':       '#ff5c7a',
          'cluster-red':   '#ff4d4d',
        }
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      keyframes: {
        wwIn:    { '0%': { background: 'rgba(0,229,160,.16)', transform: 'translateY(-6px)', opacity: '0' }, '60%': { opacity: '1', transform: 'translateY(0)' }, '100%': { background: 'transparent' } },
        wwBlink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } },
        wwTick:  { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        wwPulse: { '0%': { boxShadow: '0 0 0 0 rgba(255,77,77,.45)' }, '70%': { boxShadow: '0 0 0 7px rgba(255,77,77,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(255,77,77,0)' } },
      },
      animation: {
        'ww-in':    'wwIn 1.1s ease-out',
        'ww-blink': 'wwBlink 1.6s infinite',
        'ww-tick':  'wwTick 38s linear infinite',
        'ww-pulse': 'wwPulse 1.8s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
