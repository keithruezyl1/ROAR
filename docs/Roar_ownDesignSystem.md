# ROAR Engine Design System (2026 Enterprise Standard)

## 1. Architectural Overview
This document defines the ROAR Engine design system—the definitive visual and interaction language for the application. Optimized for massive data throughput and complex SaaS workflows, this framework prioritizes **user intent over aesthetics**.

*   **Primary brand color:** `#D4581A` (ROAR Orange).
*   **Design philosophy:** Predictable, high-contrast, and cognitively frictionless. The UI serves agents executing high-stakes, time-sensitive tasks. Information hierarchy and scannability take absolute precedence over visual decoration.
*   **Theming & Elevation:** Dark mode is natively supported via CSS custom properties. Depth is generated via luminosity (light mode) and surface contrast (dark mode). **Drop shadows are strictly prohibited in dark mode.**

## 2. Tokenized Color System
Color is a functional data channel. Components must strictly reference CSS variable tokens, ensuring UI consistency, seamless dark mode toggling, and zero cognitive dissonance. Brand colors must never override semantic channels.

### 2.1 Brand Palette (ROAR Orange)
| orange-50 | orange-100 | orange-200 | orange-400 | orange-600 | orange-800 | orange-900 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `#FEF6F2` | `#FAE8DC` | `#F5C4A3` | `#E8862E` | `#D4581A` | `#B04614` | `#8A3410` |

### 2.2 Semantic Palette Mandate
| State | Usage | Light BG | Light Text | Dark BG | Dark Text |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Success** | Successful operations, positive trends | `#EAF3DE` | `#3B6D11` | `#0F2200` | `#7DC142` |
| **Warning** | Anomalies, required interventions | `#FAEEDA` | `#BA7517` | `#2A1800` | `#EFAA40` |
| **Danger** | Destructive actions, system failures | `#FCEBEB` | `#A32D2D` | `#2A0000` | `#E86060` |
| **Info** | Standard links, active states | `#E6F1FB` | `#185FA5` | `#001629` | `#5B9ED6` |

### 2.3 Foundational CSS Tokens
```css
/* styles/tokens.css */
:root {
  /* Brand & Primary Actions */
  --color-primary: #D4581A;
  --color-primary-hover: #B04614;
  --color-primary-active: #8A3410;
  --color-primary-subtle: #FAE8DC;
  
  /* Backgrounds & Canvas */
  --color-bg-base: #F4F5F7; /* Subtle gray to allow white cards to pop */
  --color-bg-surface: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-sunken: #F0F0F0;
  
  /* Borders */
  --color-border-default: transparent; /* Rely on Gestalt background shifts */
  --color-border-strong: #E0E0E0;
  --color-border-focus: #D4581A;
  
  /* Typography */
  --color-text-primary: #111111;
  --color-text-secondary: #444444;
  --color-text-muted: #888888;
  --color-text-inverse: #FFFFFF;
}

.dark {
  /* Dark Mode: The Pure Black Ban is in effect */
  --color-primary: #E8862E;
  --color-primary-hover: #D4581A;
  --color-primary-active: #B04614;
  --color-primary-subtle: #3A1A0A;
  
  /* Backgrounds & Canvas: Elevation via Luminosity */
  --color-bg-base: #121212; 
  --color-bg-surface: #1E1E1E; /* Lighter than base for elevation */
  --color-bg-elevated: #2D2D2D; /* Highest elevation */
  --color-bg-sunken: #0A0A0A;
  
  /* Borders */
  --color-border-default: transparent;
  --color-border-strong: #444444;
  --color-border-focus: #E8862E;
  
  /* Typography */
  --color-text-primary: #F5F5F5;
  --color-text-secondary: #AAAAAA;
  --color-text-muted: #666666;
  --color-text-inverse: #121212;
}
```

## 3. Typography: The Rule of Six
To prevent visual chaos in data-dense interfaces, ROAR utilizes **Inter** and is strictly capped at **six** typographic sizes. All dashboard metric numerals must utilize tabular lining.

### 3.1 Type Scale & The "Pro Text Hack"
| Token | REM Size | Px Eqv. | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `--text-xs` | `0.75rem` | 12px | 400 | 1.5 | 0 | Metadata, Timestamps |
| `--text-sm` | `0.875rem` | 14px | 400 | 1.5 | 0 | Base Body, Dense Tables |
| `--text-md` | `1rem` | 16px | 500 | 1.5 | 0 | Input labels, Nav items |
| `--text-lg` | `1.125rem` | 18px | 600 | 1.2 | `-0.02em` | Card Titles (Pro Hack) |
| `--text-xl` | `1.25rem` | 20px | 600 | 1.15 | `-0.02em` | Section Headings |
| `--text-2xl` | `1.5rem` | 24px | 700 | 1.1 | `-0.03em` | Page Titles (Max Cap) |

### 3.2 Typography Implementation
```css
/* Typography constraints and tabular figures */
body {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums; /* Critical for vertical data alignment */
  -webkit-font-smoothing: antialiased;
}

.pro-text-hack {
  letter-spacing: -0.02em;
  line-height: 1.15;
}
```

## 4. Architecture: 4-Point Spacing System
All structural dimensions, paddings, and margins are mathematically bound to the 4-point grid and executed strictly using `rem` units (assuming a `16px` root) to ensure flawless accessibility scaling.

| Token | REM Value | Px Target | Usage |
| :--- | :--- | :--- | :--- |
| `--space-1` | `0.25rem` | 4px | Micro-spacing, icon to text label |
| `--space-2` | `0.5rem` | 8px | Internal padding for dense cells |
| `--space-3` | `0.75rem` | 12px | Vertical grouping gap |
| `--space-4` | `1rem` | 16px | Standard button padding, paragraph gap |
| `--space-6` | `1.5rem` | 24px | Major component separation |
| `--space-8` | `2rem` | 32px | Layout margins (sidebar to canvas) |

## 5. Interaction: Deterministic Component States
Every interactive element must explicitly code the six mandatory states via Unidirectional Data Flow.

### 5.1 Button Architecture
All buttons share: `0.5rem` border radius (`--radius-btn`), `--text-md` typography.

| State | Visual Feedback Standard |
| :--- | :--- |
| **Default** | Baseline background and text colors applied. |
| **Hover** | 10% shift in background brightness. Cursor transitions to pointer. |
| **Focused** | 2px solid `--color-border-focus` outline with a 2px offset (WCAG AA). |
| **Active** | Kinetic click feedback (`scale: 0.98` for `80ms`). |
| **Disabled** | Aggressive desaturation, 40% opacity, `pointer-events: none`. |
| **Loading** | Label cross-fades out; async spinner cross-fades in. Disables additional clicks. |

### 5.2 Input Architecture
Inputs feature opinionated error handling. **Red borders alone fail WCAG colorblind constraints.** 
*   **Error State:** 1px `--color-danger` border + Semantic Danger Icon + Explicit helper text directly below the field detailing correction requirements.

### 5.3 Gestalt Cards (No Borders)
Enterprise interfaces suffer from bounding-box fatigue.
*   **Light Mode:** Cards utilize `--color-bg-surface` (`#FFFFFF`) against a slightly tinted `--color-bg-base` (`#F4F5F7`). The contrast defines the region natively. Zero borders. 
*   **Dark Mode:** Elevation is handled by swapping to a lighter surface gray (`#1E1E1E`) against the base canvas (`#121212`). Zero shadows.

## 6. X-Disclosure: Progressive Data Loading
Massive operational databases must not overwhelm the initial DOM rendering.

*   **Opinionated Defaults:** Dashboards load with a maximum of 5 to 7 high-level KPI aggregations.
*   **Contextual Expansion:** When an agent needs granular detail, secondary data is queried server-side and rendered via a side-panel slide-out or localized popover.
*   **Anti-Infinite Scroll:** Infinite scrolling is banned to prevent memory bloat and preserve footer access. Pagination or explicit "Load More" triggers are required.

## 7. Tailwind Implementation
Tailwind config extended for enterprise rem constraints and the "Rule of Six".

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          subtle: 'var(--color-primary-subtle)',
        },
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          sunken: 'var(--color-bg-sunken)',
        },
        border: {
          default: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0' }],
        sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],
        md: ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],
        lg: ['1.125rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        xl: ['1.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        card: '0.75rem',
        btn: '0.5rem',
        input: '0.5rem',
        modal: '1rem',
        pill: '9999px',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '150ms',
        normal: '220ms',
      },
    },
  },
  plugins: [],
};

export default config;
```