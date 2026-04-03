
export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: 'selector',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'chart-1': 'var(--chart-1)',
        'chart-2': 'var(--chart-2)',
        'chart-3': 'var(--chart-3)',
        'chart-4': 'var(--chart-4)',
        'chart-5': 'var(--chart-5)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'sidebar-primary': 'var(--sidebar-primary)',
        'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
        'sidebar-accent': 'var(--sidebar-accent)',
        'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-ring': 'var(--sidebar-ring)',
        'destructive-foreground': 'var(--destructive-foreground)',
        // CogniFlow tokens
        'cf-base': 'var(--bg-base)',
        'cf-surface': 'var(--bg-surface)',
        'cf-elevated': 'var(--bg-elevated)',
        'cf-border': 'var(--border-subtle)',
        'cf-cyan': 'var(--accent-cyan)',
        'cf-gold': 'var(--accent-gold)',
        'cf-purple': 'var(--accent-purple)',
        'cf-good': 'var(--status-good)',
        'cf-warn': 'var(--status-warn)',
        'cf-bad': 'var(--status-bad)',
        'cf-neutral': 'var(--status-neutral)',
        'cf-text': 'var(--text-primary)',
        'cf-text-sec': 'var(--text-secondary)',
        'cf-text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        heading: ['Geist'],
        mono: ['"Geist Mono"'],
        sora: ['Sora', 'sans-serif'],
        'dm-mono': ['"DM Mono"', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 300ms ease forwards',
        'fade-in': 'fadeIn 200ms ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'dot-pulse': 'dotPulse 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in-right': 'slideInRight 300ms ease forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'delta-fade': 'deltaFadeIn 300ms ease forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,255,0.6)' },
        },
        dotPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.8)', opacity: '0' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { borderColor: 'var(--accent-cyan)', boxShadow: '0 0 8px rgba(0,212,255,0.2)' },
          '50%': { borderColor: 'var(--accent-cyan)', boxShadow: '0 0 24px rgba(0,212,255,0.5)' },
        },
        deltaFadeIn: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    }
  }
}
