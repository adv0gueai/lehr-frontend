/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './pages/**/*.{js,jsx,mdx}',
      './components/**/*.{js,jsx,mdx}',
      './app/**/*.{js,jsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          // CSS custom properties for theme support
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))',
          },
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))',
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))',
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))',
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))',
          },
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          // Modern color palette inspired by the design
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          secondary: {
            50: '#fdf4ff',
            100: '#fae8ff',
            200: '#f3d4fe',
            300: '#e879f9',
            400: '#d946ef',
            500: '#c026d3',
            600: '#a21caf',
            700: '#86198f',
            800: '#701a75',
            900: '#581c87',
          },
          accent: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e',
            600: '#e11d48',
            700: '#be123c',
            800: '#9f1239',
            900: '#881337',
          },
          success: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          // Custom dashboard colors
          dashboard: {
            purple: '#6366f1',
            blue: '#3b82f6',
            green: '#10b981',
            orange: '#f59e0b',
            red: '#ef4444',
            pink: '#ec4899',
          }
        },
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
          'large': '0 10px 50px -12px rgba(0, 0, 0, 0.25)',
        },
        backgroundImage: {
          'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          'gradient-blue': 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
          'gradient-green': 'linear-gradient(135deg, #55efc4 0%, #00b894 100%)',
          'gradient-orange': 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
          'gradient-pink': 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
        }
      },
    },
    plugins: [],
  }