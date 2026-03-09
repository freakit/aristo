export const theme = {
  colors: {
    // Landing (dark)
    black: '#080808',
    white: '#F5F3EE',
    // App background
    bg: '#0F1117',
    bgCard: '#161B27',
    bgHover: '#1C2333',
    // Borders
    border: '#232B3E',
    borderLight: '#2E3A52',
    // Accent
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentLight: '#3B82F6',
    // Text
    textPrimary: '#EEF0F5',
    textSecondary: '#8892A4',
    textMuted: '#4E5A6E',
    // Status
    success: '#16A34A',
    successLight: '#22C55E',
    warning: '#D97706',
    error: '#DC2626',
  },
  fonts: {
    sans: "'IBM Plex Sans KR', sans-serif",
    mono: "'IBM Plex Mono', monospace",
    display: "'Fraunces', serif",
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
    modal: '0 20px 60px rgba(0,0,0,0.6)',
  },
}

export type Theme = typeof theme
