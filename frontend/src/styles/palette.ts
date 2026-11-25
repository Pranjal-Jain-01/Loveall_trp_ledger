/**
 * LoveAll Foundation - Unified Color Palette & Design Tokens
 * Centralized design system using teal as the brand base color
 * Supports both Tailwind v4 CSS variables and utility-first usage
 */

// ═══════════════════════════════════════════════════════════════
// SEMANTIC COLOR TOKENS (CSS Variable References)
// ═══════════════════════════════════════════════════════════════

export const ColorTokens = {
  // ── Brand Teal Scale ──
  // Deep Petrol Teal - Primary Authority / Dark Accent
  brand: {
    50: 'var(--color-brand-50)',   // #E6F2F2
    100: 'var(--color-brand-100)', // #CCE5E5
    200: 'var(--color-brand-200)', // #99CBCB
    300: 'var(--color-brand-300)', // #66B0B0
    400: 'var(--color-brand-400)', // #339696
    500: 'var(--color-brand-500)', // #007B7B (Seafoam Teal - Primary Interactive)
    600: 'var(--color-brand-600)', // #006A71 (Deep Petrol Teal - Primary Authority)
    700: 'var(--color-brand-700)', // #005559
    800: 'var(--color-brand-800)', // #004044
    900: 'var(--color-brand-900)', // #002B2E
    950: 'var(--color-brand-950)', // #001617
  },

  // ── Neutral Scale (Warm Alabaster based) ──
  neutral: {
    50: 'var(--color-neutral-50)',   // #FAFAF7
    100: 'var(--color-neutral-100)', // #F2EFE7 (Canvas - Page Background)
    200: 'var(--color-neutral-200)', // #E4E9E4
    300: 'var(--color-neutral-300)', // #D8DFDC (Hairline / Border)
    400: 'var(--color-neutral-400)', // #B8C2BF
    500: 'var(--color-neutral-500)', // #98A5A1
    600: 'var(--color-neutral-600)', // #788B89 (Muted Text)
    700: 'var(--color-neutral-700)', // #5A6B68
    800: 'var(--color-neutral-800)', // #3C4846
    900: 'var(--color-neutral-900)', // #1D2624
    950: 'var(--color-neutral-950)', // #0E1312
  },

  // ── Semantic Colors ──
  semantic: {
    success: {
      50: 'var(--color-success-50)',   // #ECFDF5
      100: 'var(--color-success-100)', // #D1FAE5
      500: 'var(--color-success-500)', // #10B981
      600: 'var(--color-success-600)', // #059669
      700: 'var(--color-success-700)', // #047857
    },
    warning: {
      50: 'var(--color-warning-50)',   // #FFFAEB
      100: 'var(--color-warning-100)', // #FEF3C7
      500: 'var(--color-warning-500)', // #F59E0B
      600: 'var(--color-warning-600)', // #D97706
      700: 'var(--color-warning-700)', // #B45309
    },
    error: {
      50: 'var(--color-error-50)',     // #FEF2F2
      100: 'var(--color-error-100)',   // #FEE2E2
      500: 'var(--color-error-500)',   // #EF4444
      600: 'var(--color-error-600)',   // #DC2626
      700: 'var(--color-error-700)',   // #B91C1C
    },
    info: {
      50: 'var(--color-info-50)',      // #EFF6FF
      100: 'var(--color-info-100)',    // #DBEAFE
      500: 'var(--color-info-500)',    // #3B82F6
      600: 'var(--color-info-600)',    // #2563EB
      700: 'var(--color-info-700)',    // #1D4ED8
    },
  },

  // ── Surface & Background ──
  surface: {
    canvas: 'var(--color-bg-canvas)',        // #F2EFE7 - Page Background
    surface: 'var(--color-surface)',         // #FFFFFF - Elevated Cards
    surfaceElevated: 'var(--color-surface-elevated)', // #FFFFFF with shadow
    overlay: 'var(--color-overlay)',         // rgba(0, 0, 0, 0.5)
  },

  // ── Borders ──
  border: {
    DEFAULT: 'var(--color-border)',          // #D8DFDC
    subtle: 'var(--color-border-subtle)',    // #E4E9E4
    strong: 'var(--color-border-strong)',    // #B8C2BF
    focus: 'var(--color-brand-500)',         // #007B7B
  },

  // ── Text ──
  text: {
    primary: 'var(--color-text-primary)',    // #102A2E (Ink)
    secondary: 'var(--color-text-secondary)', // #3C4846
    muted: 'var(--color-text-muted)',        // #788B89
    inverse: 'var(--color-text-inverse)',    // #FFFFFF
    link: 'var(--color-brand-600)',          // #006A71
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED COLOR SYSTEM
// ═══════════════════════════════════════════════════════════════

export type RoleColorKey =
  | 'org-admin'
  | 'finance-officer'
  | 'field-worker'
  | 'supervisor'
  | 'independent-verifier'
  | 'auditor';

export type SemanticColorKey = 'success' | 'warning' | 'error' | 'info';

export interface ColorToken {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  iconText: string;
  hoverBg: string;
  hoverBorder: string;
}

/**
 * Role-specific color tokens using CSS variables for theme consistency
 * Each role gets a distinct visual identity while maintaining the brand palette
 */
export const ROLE_COLORS: Record<RoleColorKey, ColorToken> = {
  'org-admin': {
    bg: 'bg-[var(--color-brand-600)/5]',
    border: 'border-[var(--color-brand-600)/20]',
    text: 'text-[var(--color-brand-600)]',
    iconBg: 'bg-[var(--color-brand-600)/10]',
    iconText: 'text-[var(--color-brand-600)]',
    hoverBg: 'hover:bg-[var(--color-brand-600)/10]',
    hoverBorder: 'hover:border-[var(--color-brand-600)/30]',
  },
  'finance-officer': {
    bg: 'bg-[var(--color-brand-500)/5]',
    border: 'border-[var(--color-brand-500)/20]',
    text: 'text-[var(--color-brand-500)]',
    iconBg: 'bg-[var(--color-brand-500)/10]',
    iconText: 'text-[var(--color-brand-500)]',
    hoverBg: 'hover:bg-[var(--color-brand-500)/10]',
    hoverBorder: 'hover:border-[var(--color-brand-500)/30]',
  },
  'field-worker': {
    bg: 'bg-[var(--color-success-50)]',
    border: 'border-[var(--color-success-100)]',
    text: 'text-[var(--color-success-700)]',
    iconBg: 'bg-[var(--color-success-100)]',
    iconText: 'text-[var(--color-success-600)]',
    hoverBg: 'hover:bg-[var(--color-success-100)]',
    hoverBorder: 'hover:border-[var(--color-success-200)]',
  },
  'supervisor': {
    bg: 'bg-[var(--color-warning-50)]',
    border: 'border-[var(--color-warning-100)]',
    text: 'text-[var(--color-warning-700)]',
    iconBg: 'bg-[var(--color-warning-100)]',
    iconText: 'text-[var(--color-warning-600)]',
    hoverBg: 'hover:bg-[var(--color-warning-100)]',
    hoverBorder: 'hover:border-[var(--color-warning-200)]',
  },
  'independent-verifier': {
    bg: 'bg-[var(--color-info-50)]',
    border: 'border-[var(--color-info-100)]',
    text: 'text-[var(--color-info-700)]',
    iconBg: 'bg-[var(--color-info-100)]',
    iconText: 'text-[var(--color-info-600)]',
    hoverBg: 'hover:bg-[var(--color-info-100)]',
    hoverBorder: 'hover:border-[var(--color-info-200)]',
  },
  'auditor': {
    bg: 'bg-[var(--color-brand-600)/5]',
    border: 'border-[var(--color-brand-600)/20]',
    text: 'text-[var(--color-brand-600)]',
    iconBg: 'bg-[var(--color-brand-600)/10]',
    iconText: 'text-[var(--color-brand-600)]',
    hoverBg: 'hover:bg-[var(--color-brand-600)/10]',
    hoverBorder: 'hover:border-[var(--color-brand-600)/30]',
  },
};

/**
 * Semantic color tokens for status indicators, badges, etc.
 */
export const SEMANTIC_COLORS: Record<SemanticColorKey, ColorToken> = {
  success: {
    bg: 'bg-[var(--color-success-50)]',
    border: 'border-[var(--color-success-100)]',
    text: 'text-[var(--color-success-700)]',
    iconBg: 'bg-[var(--color-success-100)]',
    iconText: 'text-[var(--color-success-600)]',
    hoverBg: 'hover:bg-[var(--color-success-100)]',
    hoverBorder: 'hover:border-[var(--color-success-200)]',
  },
  warning: {
    bg: 'bg-[var(--color-warning-50)]',
    border: 'border-[var(--color-warning-100)]',
    text: 'text-[var(--color-warning-700)]',
    iconBg: 'bg-[var(--color-warning-100)]',
    iconText: 'text-[var(--color-warning-600)]',
    hoverBg: 'hover:bg-[var(--color-warning-100)]',
    hoverBorder: 'hover:border-[var(--color-warning-200)]',
  },
  error: {
    bg: 'bg-[var(--color-error-50)]',
    border: 'border-[var(--color-error-100)]',
    text: 'text-[var(--color-error-700)]',
    iconBg: 'bg-[var(--color-error-100)]',
    iconText: 'text-[var(--color-error-600)]',
    hoverBg: 'hover:bg-[var(--color-error-100)]',
    hoverBorder: 'hover:border-[var(--color-error-200)]',
  },
  info: {
    bg: 'bg-[var(--color-info-50)]',
    border: 'border-[var(--color-info-100)]',
    text: 'text-[var(--color-info-700)]',
    iconBg: 'bg-[var(--color-info-100)]',
    iconText: 'text-[var(--color-info-600)]',
    hoverBg: 'hover:bg-[var(--color-info-100)]',
    hoverBorder: 'hover:border-[var(--color-info-200)]',
  },
};

// ═══════════════════════════════════════════════════════════════
// SPACING & LAYOUT TOKENS
// ═══════════════════════════════════════════════════════════════

export const Spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

export const BorderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
} as const;

export const Shadows = {
  sm: '0 1px 2px 0 rgb(16 42 46 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(16 42 46 / 0.1), 0 1px 2px -1px rgb(16 42 46 / 0.1)',
  md: '0 4px 6px -1px rgb(16 42 46 / 0.1), 0 2px 4px -2px rgb(16 42 46 / 0.1)',
  lg: '0 10px 15px -3px rgb(16 42 46 / 0.1), 0 4px 6px -4px rgb(16 42 46 / 0.1)',
  xl: '0 20px 25px -5px rgb(16 42 46 / 0.1), 0 8px 10px -6px rgb(16 42 46 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(16 42 46 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(16 42 46 / 0.05)',
} as const;

export const Transitions = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
} as const;

export const ZIndex = {
  dropdown: '100',
  sticky: '200',
  modal: '300',
  popover: '400',
  tooltip: '500',
  toast: '600',
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY TOKENS
// ═══════════════════════════════════════════════════════════════

export const FontFamily = {
  sans: 'var(--font-sans)',
  serif: 'var(--font-serif)',
  mono: 'var(--font-mono)',
} as const;

export const FontSize = {
  xs: ['0.75rem', { lineHeight: '1.5' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.5' }],     // 14px
  base: ['1rem', { lineHeight: '1.5' }],       // 16px
  lg: ['1.125rem', { lineHeight: '1.5' }],     // 18px
  xl: ['1.25rem', { lineHeight: '1.4' }],      // 20px
  '2xl': ['1.5rem', { lineHeight: '1.3' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '1.2' }],  // 30px
  '4xl': ['2.25rem', { lineHeight: '1.1' }],   // 36px
  '5xl': ['3rem', { lineHeight: '1.1' }],      // 48px
  '6xl': ['3.75rem', { lineHeight: '1' }],     // 60px
} as const;

export const FontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get role color key from UserRole enum
 */
export function getRoleColorKey(role: string): RoleColorKey {
  const normalized = role.toLowerCase().replace(/_/g, '-');
  return normalized as RoleColorKey;
}

/**
 * Get color token for a role
 */
export function getRoleColors(role: string): ColorToken {
  return ROLE_COLORS[getRoleColorKey(role)];
}

/**
 * Get semantic color token
 */
export function getSemanticColors(key: SemanticColorKey): ColorToken {
  return SEMANTIC_COLORS[key];
}

/**
 * Generate CSS variable definitions for the palette
 * Useful for server-side rendering or dynamic theming
 */
export function generateCSSVariables(): string {
  return `
:root {
  /* Brand Teal Scale */
  --color-brand-50: #E6F2F2;
  --color-brand-100: #CCE5E5;
  --color-brand-200: #99CBCB;
  --color-brand-300: #66B0B0;
  --color-brand-400: #339696;
  --color-brand-500: #007B7B;
  --color-brand-600: #006A71;
  --color-brand-700: #005559;
  --color-brand-800: #004044;
  --color-brand-900: #002B2E;
  --color-brand-950: #001617;

  /* Neutral Scale (Warm Alabaster) */
  --color-neutral-50: #FAFAF7;
  --color-neutral-100: #F2EFE7;
  --color-neutral-200: #E4E9E4;
  --color-neutral-300: #D8DFDC;
  --color-neutral-400: #B8C2BF;
  --color-neutral-500: #98A5A1;
  --color-neutral-600: #788B89;
  --color-neutral-700: #5A6B68;
  --color-neutral-800: #3C4846;
  --color-neutral-900: #1D2624;
  --color-neutral-950: #0E1312;

  /* Semantic Colors */
  --color-success-50: #ECFDF5;
  --color-success-100: #D1FAE5;
  --color-success-500: #10B981;
  --color-success-600: #059669;
  --color-success-700: #047857;

  --color-warning-50: #FFFAEB;
  --color-warning-100: #FEF3C7;
  --color-warning-500: #F59E0B;
  --color-warning-600: #D97706;
  --color-warning-700: #B45309;

  --color-error-50: #FEF2F2;
  --color-error-100: #FEE2E2;
  --color-error-500: #EF4444;
  --color-error-600: #DC2626;
  --color-error-700: #B91C1C;

  --color-info-50: #EFF6FF;
  --color-info-100: #DBEAFE;
  --color-info-500: #3B82F6;
  --color-info-600: #2563EB;
  --color-info-700: #1D4ED8;

  /* Surface & Background */
  --color-bg-canvas: #F2EFE7;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFFFFF;
  --color-overlay: rgba(16, 42, 46, 0.5);

  /* Borders */
  --color-border: #D8DFDC;
  --color-border-subtle: #E4E9E4;
  --color-border-strong: #B8C2BF;

  /* Text */
  --color-text-primary: #102A2E;
  --color-text-secondary: #3C4846;
  --color-text-muted: #788B89;
  --color-text-inverse: #FFFFFF;

  /* Fonts */
  --font-sans: system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

  /* Base */
  color-scheme: light;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-primary);
  background: var(--color-bg-canvas);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
  `.trim();
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT VARIANTS (Tailwind-like class compositions)
// ═══════════════════════════════════════════════════════════════

export const ComponentVariants = {
  // Buttons
  button: {
    primary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-brand-600)] rounded-lg hover:bg-[var(--color-brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200',
    secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] bg-white border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-neutral-50)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-2 transition-colors duration-200',
    ghost: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded-lg transition-colors duration-200',
    danger: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-error-500)] rounded-lg hover:bg-[var(--color-error-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-error-500)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200',
  },

  // Inputs
  input: {
    default: 'w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent bg-white transition-colors duration-200',
    error: 'border-[var(--color-error-500)] focus:ring-[var(--color-error-500)]',
    success: 'border-[var(--color-success-500)] focus:ring-[var(--color-success-500)]',
  },

  // Cards
  card: {
    default: 'bg-white border border-[var(--color-border)] rounded-xl shadow-sm',
    elevated: 'bg-white border border-[var(--color-border)] rounded-xl shadow-lg',
    interactive: 'bg-white border border-[var(--color-border)] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200',
  },

  // Badges
  badge: {
    primary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-brand-100)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]',
    secondary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-neutral-100)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success-50)] text-[var(--color-success-700)] border border-[var(--color-success-100)]',
    warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-50)] text-[var(--color-warning-700)] border border-[var(--color-warning-100)]',
    error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-error-50)] text-[var(--color-error-700)] border border-[var(--color-error-100)]',
    info: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-info-50)] text-[var(--color-info-700)] border border-[var(--color-info-100)]',
  },

  // Tables
  table: {
    container: 'overflow-x-auto',
    root: 'w-full',
    header: 'bg-[var(--color-brand-600)] text-white',
    headerCell: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide',
    bodyCell: 'px-4 py-4 border-t border-[var(--color-border-subtle)]',
    row: 'hover:bg-[var(--color-brand-50)] transition-colors duration-150',
  },

  // Modals/Drawers
  modal: {
    backdrop: 'fixed inset-0 bg-[var(--color-overlay)] z-40',
    drawer: 'fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl transform transition-transform sm:my-8 sm:mx-4 max-h-[90vh] flex flex-col',
  },

  // Skeletons
  skeleton: 'animate-pulse bg-[var(--color-neutral-200)] rounded',
} as const;

// Export everything for easy importing
export default {
  ColorTokens,
  ROLE_COLORS,
  SEMANTIC_COLORS,
  Spacing,
  BorderRadius,
  Shadows,
  Transitions,
  ZIndex,
  FontFamily,
  FontSize,
  FontWeight,
  ComponentVariants,
  getRoleColorKey,
  getRoleColors,
  getSemanticColors,
  generateCSSVariables,
};