/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // ── Core brand ──────────────────────────────────────────
        primary: {
          DEFAULT: '#68558d',
          dim:     '#5c4980',
          light:   '#a07cc5',
          cont:    '#ccb7f5',
          50:      '#f9f1ff',
          100:     '#f4eaff',
          200:     '#efe3ff',
          300:     '#ebddff',
          400:     '#bbaadb',
          700:     '#8373a0',
          800:     '#665883',
          900:     '#392b53',
        },
        secondary: {
          DEFAULT: '#366859',
          dim:     '#2a5c4d',
          light:   '#52a08e',
          cont:    '#c7fce9',
          on:      '#316354',
        },
        tertiary: {
          DEFAULT: '#78565f',
          cont:    '#ffd1dc',
          on:      '#66454e',
        },
        surface: {
          DEFAULT: '#fef7ff',
          low:     '#f9f1ff',
          mid:     '#f4eaff',
          high:    '#efe3ff',
          high2:   '#ebddff',
          white:   '#ffffff',
          home:    '#ede9f6',
        },
        on: {
          surface:     '#392b53',
          'surface-var': '#665883',
          primary:     '#fef7ff',
        },
        outline: {
          DEFAULT: '#8373a0',
          var:     '#bbaadb',
        },
        error: {
          DEFAULT: '#ac3149',
          bg:      '#fef2f2',
          border:  '#fecaca',
        },
        success: {
          DEFAULT: '#22c55e',
        },
        warning: {
          DEFAULT: '#ef4444',
        },

        // ── Text scales (home page) ──────────────────────────────
        text: {
          primary: '#1f2937',
          muted:   '#6b7280',
          faint:   '#9ca3af',
        },

        // ── Reading module (brown/cream theme) ───────────────────
        reading: {
          surface:        '#fbfbe2',
          'surface-low':  '#f5f5dc',
          'surface-mid':  '#efefd7',
          'surface-high': '#eaead1',
          'surface-high2':'#e4e4cc',
          primary:        '#77553d',
          'primary-dim':  '#5f402a',
          'primary-cont': '#926d54',
          'primary-fixed':'#ffdcc6',
          'primary-fixed-dim': '#eabda0',
          secondary:      '#735a3a',
          'secondary-light': '#9a7a52',
          'secondary-cont':'#fddab2',
          'on-sec-cont':  '#785e3e',
          on: {
            surface:     '#1b1d0e',
            'surface-var':'#504441',
          },
          outline:        '#d4c3be',
          error:          '#ba1a1a',
        },

        // ── White/black utilities ───────────────────────────────
        white:  '#ffffff',
        black:  '#000000',

        // ── Glassmorphism ─────────────────────────────────────────
        glass: {
          bg: 'rgba(255,255,255,0.04)',
          'bg-strong': 'rgba(255,255,255,0.08)',
          'bg-hover': 'rgba(255,255,255,0.12)',
          border: 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.15)',
          glow: 'rgba(160,120,255,0.4)',
        },
      },

      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['Manrope', 'sans-serif'],
        icon:    ['"Material Symbols Outlined"'],
      },

      fontSize: {
        '4xl': ['2.75rem', { lineHeight: '1',    letterSpacing: '-0.02em', fontWeight: '800' }],
        '3xl': ['2.25rem', { lineHeight: '1.1',  letterSpacing: '-0.03em', fontWeight: '800' }],
        '2xl': ['1.875rem', { lineHeight: '1.15', fontWeight: '700' }],
        xl:    ['1.5rem',  { lineHeight: '1.2',  fontWeight: '800' }],
        lg:    ['1.25rem', { lineHeight: '1.3',  fontWeight: '700' }],
        md:    ['1rem',    { lineHeight: '1.4',  fontWeight: '600' }],
        sm:    ['0.875rem', { lineHeight: '1.45', fontWeight: '500' }],
        xs:    ['0.75rem', { lineHeight: '1.5',  fontWeight: '500' }],
        '2xs': ['0.65rem', { lineHeight: '1.5',  fontWeight: '700', letterSpacing: '0.07em' }],
      },

      boxShadow: {
        'card':       '0 1px 6px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 20px rgba(0, 0, 0, 0.1)',
        'button':     '0 4px 16px rgba(104, 85, 141, 0.2)',
        'button-hover': '0 6px 20px rgba(104, 85, 141, 0.3)',
        'button-lg':  '0 8px 24px rgba(104, 85, 141, 0.22)',
        'modal':      '0 40px 80px -20px rgba(57, 43, 83, 0.4)',
        'toast':      '0 8px 32px rgba(57, 43, 83, 0.15)',
        'people':     '0 4px 16px rgba(57, 43, 83, 0.07)',
        'hero':       '0 24px 56px rgba(104, 85, 141, 0.28)',
        'goal':       '0 8px 32px rgba(57, 43, 83, 0.07)',
        'card-visual':'0 24px 56px rgba(104, 85, 141, 0.25)',
        'split-card': '0 20px 40px rgba(57, 43, 83, 0.06)',
        'focus-ring': '0 0 0 2px rgba(104, 85, 141, 0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg':    '0 16px 48px rgba(0,0,0,0.45)',
        'none':       '0 0 #000',
      },

      borderRadius: {
        'pill':    '9999px',
        '2xl':     '1.25rem',
        '3xl':     '1.5rem',
        '4xl':     '2rem',
        '5xl':     '2.5rem',
        '6xl':     '3rem',
      },

      animation: {
        'shimmer':  'shimmer 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':  'fadeIn 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-bounce':   'springBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'count-up':        'countUp 0.6s ease-out',
        'pulse-soft':      'pulseSoft 2s ease-in-out infinite',
        'modal-fade':      'modalFade 0.15s ease',
        'modal-slide':     'modalSlide 0.2s ease',
      },

      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        springBounce: {
          '0%':   { transform: 'scale(0.95)' },
          '50%':  { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.8' },
        },
        modalFade: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalSlide: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },

      transitionTimingFunction: {
        'spring':       'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-spring':  'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionDuration: {
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
