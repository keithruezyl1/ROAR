## 1. Design System Overview
This document defines the ROAR Engine design system --- the complete visual and interaction language for the application. It covers color tokens, typography, spacing, component specifications, dark mode rules, and motion guidelines. All UI must be implemented using these standards to ensure consistency across screens and contributors.

| Primary brand color: #D4581A --- extracted from the ROAR Engine logo.                                                                                            |
|                                                                                                                                                                  |
| Design philosophy: functional, high-contrast, professional. The UI serves agents under operational pressure --- clarity and speed take priority over decoration. |
|                                                                                                                                                                  |
| Dark mode: fully supported across all screens using CSS custom properties. Both modes share the same token names.                                                |

## 2. Color System
The ROAR color system is built on semantic tokens. Components always reference token names --- never raw hex values. This ensures dark mode works automatically and the design can be updated from one place.

### 2.1 Brand Palette --- ROAR Orange
The primary brand ramp is derived from the ROAR logo orange (#D4581A). Seven stops from lightest to darkest.

|               |                |                |                |                |                |                |
| **orange-50** | **orange-100** | **orange-200** | **orange-400** | **orange-600** | **orange-800** | **orange-900** |
|               |                |                |                |                |                |                |
| #FEF6F2       | #FAE8DC        | #F5C4A3        | #E8862E        | #D4581A        | #B04614        | #8A3410        |

### 2.2 Neutral Palette
|             |              |              |              |              |              |              |
| **gray-50** | **gray-100** | **gray-200** | **gray-400** | **gray-600** | **gray-800** | **gray-900** |
|             |              |              |              |              |              |              |
| #F9F9F9     | #F0F0F0      | #E0E0E0      | #AAAAAA      | #666666      | #2D2D2D      | #1A1A1A      |

### 2.3 Semantic Palette
Semantic colors carry meaning. Never use these for decoration --- only for the state they represent.

|             |                   |             |                   |            |                  |          |                |
| **success** | **success-light** | **warning** | **warning-light** | **danger** | **danger-light** | **info** | **info-light** |
|             |                   |             |                   |            |                  |          |                |
| #3B6D11     | #EAF3DE           | #BA7517     | #FAEEDA           | #A32D2D    | #FCEBEB          | #185FA5  | #E6F1FB        |

### 2.4 Semantic Token Definitions
These are the CSS custom property tokens referenced by all components. Light mode values shown first, dark mode in parentheses.

  **Token Name**                **Light Mode Value**   **Dark Mode Value**   **Usage**
  \--color-primary              #D4581A                #E8862E               Primary buttons, active states, brand accents

  \--color-primary-hover        #B04614                #D4581A               Primary button hover state

  \--color-primary-active       #8A3410                #B04614               Primary button pressed state

  \--color-primary-subtle       #FAE8DC                #3A1A0A               Primary tinted backgrounds, selected rows

  \--color-primary-border       #F5C4A3                #6B2F10               Borders on primary-tinted surfaces

  \--color-bg-base              #FFFFFF                #111111               Page background

  \--color-bg-surface           #F9F9F9                #1A1A1A               Card, panel, sidebar background

  \--color-bg-elevated          #FFFFFF                #2D2D2D               Modal, dropdown, tooltip background

  \--color-bg-sunken            #F0F0F0                #0A0A0A               Input background, code blocks

  \--color-border-default       #E0E0E0                #333333               Default border on cards and inputs

  \--color-border-strong        #CCCCCC                #444444               Emphasized borders, dividers

  \--color-border-focus         #D4581A                #E8862E               Input focus ring

  \--color-text-primary         #111111                #F5F5F5               Primary body text, headings

  \--color-text-secondary       #444444                #AAAAAA               Labels, subtitles, metadata

  \--color-text-muted           #888888                #666666               Placeholders, disabled text

  \--color-text-inverse         #FFFFFF                #111111               Text on colored/dark backgrounds

  \--color-text-primary-brand   #D4581A                #E8862E               Orange text on surfaces

  \--color-success              #3B6D11                #7DC142               Success status

  \--color-success-bg           #EAF3DE                #0F2200               Success background

  \--color-warning              #BA7517                #EFAA40               Warning status

  \--color-warning-bg           #FAEEDA                #2A1800               Warning background

  \--color-danger               #A32D2D                #E86060               Danger/error status

  \--color-danger-bg            #FCEBEB                #2A0000               Danger background

  \--color-info                 #185FA5                #5B9ED6               Info status

  \--color-info-bg              #E6F1FB                #001629               Info background

### 2.5 CSS Token Implementation
| /\* styles/tokens.css \*/                                             |
|                                                                       |
| :root {                                                               |
|                                                                       |
| \--color-primary: #D4581A;                                            |
|                                                                       |
| \--color-primary-hover: #B04614;                                      |
|                                                                       |
| \--color-primary-active: #8A3410;                                     |
|                                                                       |
| \--color-primary-subtle: #FAE8DC;                                     |
|                                                                       |
| \--color-primary-border: #F5C4A3;                                     |
|                                                                       |
| \--color-bg-base: #FFFFFF;                                            |
|                                                                       |
| \--color-bg-surface: #F9F9F9;                                         |
|                                                                       |
| \--color-bg-elevated: #FFFFFF;                                        |
|                                                                       |
| \--color-bg-sunken: #F0F0F0;                                          |
|                                                                       |
| \--color-border-default: #E0E0E0;                                     |
|                                                                       |
| \--color-border-strong: #CCCCCC;                                      |
|                                                                       |
| \--color-border-focus: #D4581A;                                       |
|                                                                       |
| \--color-text-primary: #111111;                                       |
|                                                                       |
| \--color-text-secondary: #444444;                                     |
|                                                                       |
| \--color-text-muted: #888888;                                         |
|                                                                       |
| \--color-text-inverse: #FFFFFF;                                       |
|                                                                       |
| \--color-text-primary-brand: #D4581A;                                 |
|                                                                       |
| \--color-success: #3B6D11;                                            |
|                                                                       |
| \--color-success-bg: #EAF3DE;                                         |
|                                                                       |
| \--color-warning: #BA7517;                                            |
|                                                                       |
| \--color-warning-bg: #FAEEDA;                                         |
|                                                                       |
| \--color-danger: #A32D2D;                                             |
|                                                                       |
| \--color-danger-bg: #FCEBEB;                                          |
|                                                                       |
| \--color-info: #185FA5;                                               |
|                                                                       |
| \--color-info-bg: #E6F1FB;                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| .dark {                                                               |
|                                                                       |
| \--color-primary: #E8862E;                                            |
|                                                                       |
| \--color-primary-hover: #D4581A;                                      |
|                                                                       |
| \--color-primary-active: #B04614;                                     |
|                                                                       |
| \--color-primary-subtle: #3A1A0A;                                     |
|                                                                       |
| \--color-primary-border: #6B2F10;                                     |
|                                                                       |
| \--color-bg-base: #111111;                                            |
|                                                                       |
| \--color-bg-surface: #1A1A1A;                                         |
|                                                                       |
| \--color-bg-elevated: #2D2D2D;                                        |
|                                                                       |
| \--color-bg-sunken: #0A0A0A;                                          |
|                                                                       |
| \--color-border-default: #333333;                                     |
|                                                                       |
| \--color-border-strong: #444444;                                      |
|                                                                       |
| \--color-border-focus: #E8862E;                                       |
|                                                                       |
| \--color-text-primary: #F5F5F5;                                       |
|                                                                       |
| \--color-text-secondary: #AAAAAA;                                     |
|                                                                       |
| \--color-text-muted: #666666;                                         |
|                                                                       |
| \--color-text-inverse: #111111;                                       |
|                                                                       |
| \--color-text-primary-brand: #E8862E;                                 |
|                                                                       |
| \--color-success: #7DC142;                                            |
|                                                                       |
| \--color-success-bg: #0F2200;                                         |
|                                                                       |
| \--color-warning: #EFAA40;                                            |
|                                                                       |
| \--color-warning-bg: #2A1800;                                         |
|                                                                       |
| \--color-danger: #E86060;                                             |
|                                                                       |
| \--color-danger-bg: #2A0000;                                          |
|                                                                       |
| \--color-info: #5B9ED6;                                               |
|                                                                       |
| \--color-info-bg: #001629;                                            |
|                                                                       |
| }                                                                     |

## 3. Typography
ROAR Engine uses Inter as the primary typeface --- available via Google Fonts. Monospace text (code blocks, IDs, reference numbers) uses JetBrains Mono.

### 3.1 Font Stack
| /\* In globals.css --- import via Next.js font optimization \*/                       |
|                                                                                       |
| import { Inter, JetBrains_Mono } from 'next/font/google';                           |
|                                                                                       |
| export const inter = Inter({                                                          |
|                                                                                       |
| subsets: \['latin'\],                                                               |
|                                                                                       |
| variable: '\--font-sans',                                                           |
|                                                                                       |
| display: 'swap',                                                                    |
|                                                                                       |
| });                                                                                   |
|                                                                                       |
| export const mono = JetBrains_Mono({                                                  |
|                                                                                       |
| subsets: \['latin'\],                                                               |
|                                                                                       |
| variable: '\--font-mono',                                                           |
|                                                                                       |
| display: 'swap',                                                                    |
|                                                                                       |
| });                                                                                   |
|                                                                                       |
| /\* CSS fallback stack \*/                                                            |
|                                                                                       |
| \--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; |
|                                                                                       |
| \--font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;          |

### 3.2 Type Scale
  **Token**         **Size**   **Weight**   **Line Height**   **Usage**
  \--text-xs        11px       400          1.5               Timestamps, fine print, metadata

  \--text-sm        13px       400          1.5               Secondary labels, helper text, captions

  \--text-base      15px       400          1.6               Body text, chat messages, descriptions

  \--text-md        15px       500          1.5               Emphasized body, input labels, nav items

  \--text-lg        17px       600          1.4               Card titles, section subheadings, panel headers

  \--text-xl        20px       600          1.3               Page section titles, dashboard headings

  \--text-2xl       24px       700          1.2               Page titles, modal headings

  \--text-3xl       30px       700          1.15              Top-level headings (used sparingly)

  \--text-mono-sm   12px       400 mono     1.5               Reference numbers, IDs, policy slugs

  \--text-mono-md   13px       500 mono     1.4               Code blocks, API keys, hex values

### 3.3 Typography Tokens
| :root {                                                               |
|                                                                       |
| \--text-xs: 11px; \--text-xs-weight: 400; \--text-xs-lh: 1.5;         |
|                                                                       |
| \--text-sm: 13px; \--text-sm-weight: 400; \--text-sm-lh: 1.5;         |
|                                                                       |
| \--text-base: 15px; \--text-base-weight:400; \--text-base-lh:1.6;     |
|                                                                       |
| \--text-md: 15px; \--text-md-weight: 500; \--text-md-lh: 1.5;         |
|                                                                       |
| \--text-lg: 17px; \--text-lg-weight: 600; \--text-lg-lh: 1.4;         |
|                                                                       |
| \--text-xl: 20px; \--text-xl-weight: 600; \--text-xl-lh: 1.3;         |
|                                                                       |
| \--text-2xl: 24px; \--text-2xl-weight: 700; \--text-2xl-lh: 1.2;      |
|                                                                       |
| \--text-3xl: 30px; \--text-3xl-weight: 700; \--text-3xl-lh: 1.15;     |
|                                                                       |
| }                                                                     |

### 3.4 Typography Rules
-   Never use font weights other than 400, 500, 600, and 700

-   Headings use \--color-text-primary. Never use \--color-primary for headings.

-   Secondary labels and metadata use \--color-text-secondary

-   Disabled and placeholder text use \--color-text-muted

-   All reference numbers (CASE-00042, ORD-10042) use \--font-mono in \--text-mono-sm

-   Line length should not exceed 72 characters for body text blocks

-   Text on colored backgrounds (buttons, badges, pills) must pass WCAG AA contrast (4.5:1 minimum)

## 4. Spacing System
ROAR uses a base-4 spacing scale. All spacing values are multiples of 4px. Components reference spacing tokens --- never arbitrary pixel values.

  **Token**     **Value**   **Tailwind Class**   **Common Usage**
  \--space-1    4px         p-1 / gap-1          Icon padding, tight inline spacing

  \--space-2    8px         p-2 / gap-2          Badge padding, small gaps

  \--space-3    12px        p-3 / gap-3          Input padding (horizontal), chip padding

  \--space-4    16px        p-4 / gap-4          Standard component padding, card gap

  \--space-5    20px        p-5 / gap-5          Section inner padding

  \--space-6    24px        p-6 / gap-6          Card padding, modal padding

  \--space-8    32px        p-8 / gap-8          Page section spacing

  \--space-10   40px        p-10 / gap-10        Large section gaps, page top padding

  \--space-12   48px        p-12 / gap-12        Dashboard grid gap (wide screens)

  \--space-16   64px        p-16 / gap-16        Page max-width padding

### 4.1 Layout Dimensions
  **Element**            **Value**   **Token / Class**
  Sidebar width          240px       \--sidebar-width

  Sidebar collapsed      64px        \--sidebar-collapsed

  Top bar height         56px        \--topbar-height

  Page max-width         1280px      \--page-max-width

  Content max-width      880px       \--content-max-width

  Card border radius     12px        \--radius-card / rounded-xl

  Button border radius   8px         \--radius-btn / rounded-lg

  Input border radius    8px         \--radius-input / rounded-lg

  Badge border radius    999px       \--radius-pill / rounded-full

  Modal border radius    16px        \--radius-modal / rounded-2xl

## 5. Component Specifications
Each component has a defined set of variants, states, and token references. Implementations must match these specs exactly.

### 5.1 Button
  **Variant**   **Background**        **Text**                  **Border**                   **Hover BG**             **Usage**
  primary       \--color-primary      \--color-text-inverse     none                         \--color-primary-hover   Approve, submit, primary CTA

  secondary     \--color-bg-surface   \--color-text-primary     1px \--color-border-strong   \--color-bg-sunken       Cancel, secondary actions

  danger        \--color-danger-bg    \--color-danger           1px \--color-danger          #F7C1C1                  Reject, delete, destructive actions

  ghost         transparent           \--color-text-secondary   none                         \--color-bg-sunken       Tertiary actions, icon buttons

  link          transparent           \--color-primary          none                         transparent              Inline links, policy citations

**All button variants share these properties:**

-   Height: 36px (default), 32px (sm), 44px (lg)

-   Padding: 0 16px (default), 0 12px (sm), 0 20px (lg)

-   Font: \--text-md (15px / 500)

-   Border radius: \--radius-btn (8px)

-   Disabled state: opacity 0.4, cursor not-allowed

-   Loading state: replace label with spinner, disable pointer events

-   Focus ring: 2px solid \--color-border-focus, 2px offset

### 5.2 Input
  **State**   **Border**                    **Background**         **Label Color**           **Notes**
  default     1px \--color-border-default   \--color-bg-sunken     \--color-text-secondary   Placeholder: \--color-text-muted

  focus       2px \--color-border-focus     \--color-bg-elevated   \--color-text-primary     No box shadow --- border change only

  error       1px \--color-danger           \--color-danger-bg     \--color-danger           Show error message below input

  disabled    1px \--color-border-default   \--color-bg-sunken     \--color-text-muted       opacity 0.5, cursor not-allowed

  filled      1px \--color-border-strong    \--color-bg-sunken     \--color-text-secondary   When value is present

-   Height: 40px (default), 36px (sm)

-   Padding: 0 12px

-   Font: \--text-base (15px / 400)

-   Border radius: \--radius-input (8px)

-   Label: \--text-sm (13px / 400), positioned above input with 6px gap

-   Error message: \--text-sm, \--color-danger, 4px below input

### 5.3 Card
-   Background: \--color-bg-surface

-   Border: 1px solid \--color-border-default

-   Border radius: \--radius-card (12px)

-   Padding: 20px (default), 24px (lg)

-   Hover state (clickable cards): border-color → \--color-border-strong, subtle translateY(-1px)

-   Active/selected state: border-color → \--color-primary, background → \--color-primary-subtle

-   Shadow: none by default. Elevated cards (modals, dropdowns): 0 4px 16px rgba(0,0,0,0.08)

### 5.4 CaseCard (Dashboard)
-   Width: fills grid column (3-col on wide, 2-col on medium, 1-col on narrow)

-   Contains: DisputeTypeBadge (top-left), CaseStatusPill (top-right), reference number (\--text-mono-sm), customer name (\--text-lg), order ID (\--text-sm, \--color-text-secondary), time in queue (\--text-xs, \--color-text-muted)

-   Clickable --- entire card surface is the click target

-   Hover: border → \--color-primary, background → \--color-primary-subtle

### 5.5 CaseStatusPill
  **Status**                 **Background**            **Text Color**        **Label**
  pending_triage             \--color-info-bg          \--color-info         Pending triage

  awaiting_approval          \--color-warning-bg       \--color-warning      Awaiting approval

  approved_executing         \--color-primary-subtle   \--color-primary      Executing

  rejected_human_required    \--color-danger-bg        \--color-danger       Rejected --- human required

  escalated_human_required   \--color-warning-bg       \--color-warning      Escalated

  resolved                   \--color-success-bg       \--color-success      Resolved

  closed                     \--color-bg-sunken        \--color-text-muted   Closed

-   Font: \--text-xs (11px / 500)

-   Padding: 3px 8px

-   Border radius: \--radius-pill (999px)

### 5.6 DisputeTypeBadge
  **Type**     **Background**   **Text**      **Icon**
  refund       #FAE8DC          #D4581A       ↩ Refund

  delivery     #E6F1FB          #185FA5       📦 Delivery

-   Font: \--text-xs (11px / 500)

-   Padding: 3px 8px

-   Border radius: \--radius-pill (999px)

### 5.7 ChatBubble
  **Sender Type**   **Alignment**   **Background**            **Text Color**          **Border Radius**
  customer          right           \--color-primary          \--color-text-inverse   16px 16px 4px 16px

  ai                left            \--color-bg-elevated      \--color-text-primary   16px 16px 16px 4px

  agent             left            \--color-primary-subtle   \--color-text-primary   16px 16px 16px 4px

  system            center          transparent               \--color-text-muted     0px (no bubble)

-   Max width: 72% of chat window width

-   Padding: 10px 14px

-   Font: \--text-base (15px / 400)

-   Timestamp: \--text-xs, \--color-text-muted, shown on hover

-   Agent bubble has a small avatar indicator on the left showing AI or human agent initials

### 5.8 ParticipantBanner
-   Displayed at top of ChatWindow to indicate who the customer is speaking with

-   AI active: background \--color-primary-subtle, text 'You are speaking with ROAR AI', icon: robot symbol

-   Human agent active: background \--color-info-bg, text 'Agent \[Name\] has joined the conversation', icon: person symbol

-   Font: \--text-sm (13px / 500)

-   Height: 40px, full width of chat window

### 5.9 Modal
-   Backdrop: rgba(0, 0, 0, 0.5) --- darkens behind modal

-   Panel: \--color-bg-elevated, \--radius-modal (16px), 480px max-width (default), 640px (wide)

-   Header: \--text-xl (20px / 600), \--color-text-primary, 24px padding, bottom border 1px \--color-border-default

-   Body: 24px padding, \--text-base

-   Footer: 16px padding, right-aligned actions, top border 1px \--color-border-default

-   Close button: top-right ghost button with × icon

-   Focus trap: keyboard focus must stay within modal when open

-   Animation: fade in + scale from 0.96 to 1.0, 150ms ease-out

### 5.10 RejectionModal
-   Extends Modal (wide variant, 640px)

-   Contains: rejection reason Textarea (required), policy citation section

-   Policy citation section: search input filtering policies, results shown as selectable PolicyCitationChips

-   Selected chips appear below textarea as inline removable tags

-   Confirm button is disabled until rejection reason textarea has at least 20 characters

-   Confirm button variant: danger

### 5.11 InfoBundlePanel
-   Displays aggregated data from all queried data sources in a structured, readable layout

-   Each data source is a collapsible section: OMS / Payment / Logistics / Inventory

-   Section header: \--text-md, colored left border matching source type, collapse/expand toggle

-   Data rows: label (\--text-sm, \--color-text-secondary) + value (\--text-base, \--color-text-primary)

-   Conflicting values shown in \--color-danger with a warning icon

### 5.12 ApproveRejectBar
-   Sticky bar at bottom of ApproverRecordView

-   Background: \--color-bg-elevated, top border 1px \--color-border-default

-   Height: 64px, full width, padding 0 24px

-   Left: case reference number in \--text-mono-sm

-   Right: Reject button (danger variant) + Approve button (primary variant)

-   Both buttons show LoadingSpinner while action is processing

-   After action: bar replaced with status confirmation message

### 5.13 SearchFilterBar
-   Contains: search input (left, grows to fill space) + filter dropdowns (right)

-   Search input: placeholder 'Search by case ID, order ID, or customer name\...'

-   Filters: Dispute Type (All / Refund / Delivery), Status (contextual to dashboard)

-   Debounce search input: 300ms before triggering query

-   Clear button appears when search or filters are active

### 5.14 PolicyCitationChip
-   Background: \--color-primary-subtle

-   Text: \--color-text-primary-brand, \--text-sm

-   Border: 1px \--color-primary-border

-   Border radius: \--radius-pill

-   Padding: 4px 10px

-   Includes an external link icon --- clicking opens /policies#\[slug\] in a new tab

-   In RejectionModal: includes a remove (×) button on the right

## 6. Dark Mode
Dark mode is class-based. The .dark class is applied to the \<html\> element. All components use CSS tokens --- no hardcoded color values allowed anywhere in component code. This ensures dark mode works automatically everywhere.

### 6.1 Implementation
| // ThemeProvider.tsx                                                  |
|                                                                       |
| const ThemeProvider = ({ children }) =\> {                            |
|                                                                       |
| const \[dark, setDark\] = useState(() =\> {                           |
|                                                                       |
| if (typeof window === 'undefined') return false;                    |
|                                                                       |
| return localStorage.getItem('theme') === 'dark' \|\|              |
|                                                                       |
| (!localStorage.getItem('theme') &&                                  |
|                                                                       |
| window.matchMedia('(prefers-color-scheme: dark)').matches);         |
|                                                                       |
| });                                                                   |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| document.documentElement.classList.toggle('dark', dark);            |
|                                                                       |
| localStorage.setItem('theme', dark ? 'dark' : 'light');         |
|                                                                       |
| }, \[dark\]);                                                         |
|                                                                       |
| return (                                                              |
|                                                                       |
| \<ThemeContext.Provider value={{ dark, setDark }}\>                   |
|                                                                       |
| {children}                                                            |
|                                                                       |
| \</ThemeContext.Provider\>                                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| };                                                                    |

### 6.2 Dark Mode Rules
-   All colors MUST use CSS tokens --- never hardcode hex values in component styles

-   Images and illustrations should use appropriate opacity in dark mode if they look harsh

-   Chart colors and data visualizations must be verified in both modes

-   Shadows should be reduced or removed in dark mode (dark surfaces don't need elevation shadows)

-   Focus rings use \--color-border-focus which is already adjusted per mode

-   Do not use white text on orange in dark mode --- \--color-text-inverse handles this

## 7. Motion and Animation
Motion is functional --- it communicates state changes and guides attention. ROAR Engine uses subtle, fast transitions. No decorative animations.

  **Token**             **Value**                           **Usage**
  \--duration-instant   80ms                                Hover states, color transitions

  \--duration-fast      150ms                               Modal open/close, dropdown appear, focus rings

  \--duration-normal    220ms                               Page transitions, panel slide-in, card hover

  \--duration-slow      350ms                               Complex layout shifts, skeleton → content

  \--ease-default       ease-out                            All transitions unless specified

  \--ease-spring        cubic-bezier(0.34, 1.56, 0.64, 1)   Modal scale-in only

### 7.1 Specific Animation Specs
-   Modal open: opacity 0→1 + scale 0.96→1.0, 150ms, \--ease-spring

-   Modal close: opacity 1→0 + scale 1.0→0.96, 100ms, ease-in

-   Dropdown appear: opacity 0→1 + translateY -4px→0, 150ms, ease-out

-   Card hover: translateY 0→-1px, 80ms, ease-out

-   Typing indicator dots: staggered opacity pulse, 600ms loop, 150ms stagger between dots

-   ParticipantBanner transition (AI → human): background color crossfade, 220ms

-   CaseStatusPill status change: background/text color crossfade, 220ms

-   Button loading state: label fade out + spinner fade in, 80ms

-   Page route transitions: no animation --- instant navigation for operational efficiency

## 8. Screen-by-Screen Design Notes
### 8.1 Customer Chat (/chat)
-   Full-screen layout --- no sidebar. Clean, minimal. ROAR logo + product name top-left.

-   IntakeForm centered on page, max-width 560px. Card surface, 24px padding.

-   On submit: form slides up, ChatWindow slides in from below. Transition: 220ms ease-out.

-   ChatWindow fills remaining viewport height. Messages scroll from bottom. Auto-scroll on new message.

-   CaseStatusTracker shown as collapsed banner at top of ChatWindow after case is created. Expands on click.

-   Mobile: full width, no horizontal padding.

### 8.2 Approver and Escalation Dashboards
-   AppShell: sidebar (240px) + main content area.

-   Dashboard header: page title (\--text-2xl) + NotificationBadge + SearchFilterBar below.

-   DashboardGrid: 3-column CSS grid, gap 20px. Responsive: 2 columns below 1024px, 1 below 640px.

-   Empty state: centered EmptyState component with 'No cases pending review' message.

-   Cases sorted by: time in queue descending (oldest first --- highest urgency).

### 8.3 Record Views (Approver and Escalation)
-   Two-column layout on wide screens: left 60% (data panels) + right 40% (action panels).

-   Left column: InfoBundlePanel (collapsible source sections) stacked vertically.

-   Right column (Approver): ResolutionPlanPanel + ApproveRejectBar (sticky bottom).

-   Right column (Escalation): EscalationSummaryPanel + 'Join Chat' primary button.

-   Breadcrumb navigation at top: Dashboard \> Case CASE-00042.

### 8.4 Live Chat Screens (Approver and Escalation)
-   Full-height chat layout within AppShell. No scrollable page --- chat fills viewport.

-   ParticipantBanner pinned to top of chat area.

-   ChatWindow fills between banner and input bar.

-   ChatInput pinned to bottom. Includes ConversationClosePanel trigger (three-dot menu or dedicated button).

-   ConversationClosePanel: appears as bottom sheet on mobile, inline dropdown on desktop.

### 8.5 Policies Page (/policies)
-   Two-column layout: left sticky nav (policy category links) + right content area.

-   Each policy category is an h2 section with anchor ID matching the category slug.

-   Each individual policy record has an anchor ID matching its slug (for deep-linking from RejectionModal).

-   Policy records: title (\--text-lg), content (\--text-base), slug shown in \--text-mono-sm.

-   Search bar at top filters policy records in-page (client-side filtering).

## 9. Accessibility
ROAR Engine targets WCAG 2.1 AA compliance. The following standards are non-negotiable for the MVP.

  **Requirement**                    **Standard**    **Implementation Note**
  Color contrast --- body text       4.5:1 minimum   All text on backgrounds verified against token pairs

  Color contrast --- large text      3:1 minimum     Headings (18px+ bold or 24px+)

  Color contrast --- UI components   3:1 minimum     Button borders, input borders, status pills

  Focus indicators                   Visible, 2px+   All interactive elements have visible focus ring using \--color-border-focus

  Keyboard navigation                Full support    All interactive elements reachable via Tab. Modal has focus trap.

  ARIA labels                        Required        Icon-only buttons, status pills, and chat bubbles must have aria-label

  Form labels                        Required        Every input has an associated \<label\> or aria-label

  Live regions                       Required        Chat new messages announced via aria-live='polite'

  Reduced motion                     Required        All animations wrapped in \@media (prefers-reduced-motion: no-preference)

## 10. Tailwind Configuration
ROAR Engine extends Tailwind's default theme with ROAR-specific tokens. All CSS custom properties are available as Tailwind utility classes.

| // tailwind.config.ts                                                       |
|                                                                             |
| import type { Config } from 'tailwindcss';                                |
|                                                                             |
| const config: Config = {                                                    |
|                                                                             |
| darkMode: 'class',                                                        |
|                                                                             |
| content: \['./app/\*\*/\*.{ts,tsx}', './components/\*\*/\*.{ts,tsx}'\], |
|                                                                             |
| theme: {                                                                    |
|                                                                             |
| extend: {                                                                   |
|                                                                             |
| colors: {                                                                   |
|                                                                             |
| primary: {                                                                  |
|                                                                             |
| DEFAULT: 'var(\--color-primary)',                                         |
|                                                                             |
| hover: 'var(\--color-primary-hover)',                                     |
|                                                                             |
| active: 'var(\--color-primary-active)',                                   |
|                                                                             |
| subtle: 'var(\--color-primary-subtle)',                                   |
|                                                                             |
| border: 'var(\--color-primary-border)',                                   |
|                                                                             |
| },                                                                          |
|                                                                             |
| bg: {                                                                       |
|                                                                             |
| base: 'var(\--color-bg-base)',                                            |
|                                                                             |
| surface: 'var(\--color-bg-surface)',                                      |
|                                                                             |
| elevated: 'var(\--color-bg-elevated)',                                    |
|                                                                             |
| sunken: 'var(\--color-bg-sunken)',                                        |
|                                                                             |
| },                                                                          |
|                                                                             |
| border: {                                                                   |
|                                                                             |
| default: 'var(\--color-border-default)',                                  |
|                                                                             |
| strong: 'var(\--color-border-strong)',                                    |
|                                                                             |
| focus: 'var(\--color-border-focus)',                                      |
|                                                                             |
| },                                                                          |
|                                                                             |
| text: {                                                                     |
|                                                                             |
| primary: 'var(\--color-text-primary)',                                    |
|                                                                             |
| secondary:'var(\--color-text-secondary)',                                 |
|                                                                             |
| muted: 'var(\--color-text-muted)',                                        |
|                                                                             |
| inverse: 'var(\--color-text-inverse)',                                    |
|                                                                             |
| brand: 'var(\--color-text-primary-brand)',                                |
|                                                                             |
| },                                                                          |
|                                                                             |
| success: 'var(\--color-success)',                                         |
|                                                                             |
| warning: 'var(\--color-warning)',                                         |
|                                                                             |
| danger: 'var(\--color-danger)',                                           |
|                                                                             |
| info: 'var(\--color-info)',                                               |
|                                                                             |
| },                                                                          |
|                                                                             |
| fontFamily: {                                                               |
|                                                                             |
| sans: \['var(\--font-sans)'\],                                            |
|                                                                             |
| mono: \['var(\--font-mono)'\],                                            |
|                                                                             |
| },                                                                          |
|                                                                             |
| borderRadius: {                                                             |
|                                                                             |
| card: '12px',                                                             |
|                                                                             |
| btn: '8px',                                                               |
|                                                                             |
| input: '8px',                                                             |
|                                                                             |
| modal: '16px',                                                            |
|                                                                             |
| pill: '999px',                                                            |
|                                                                             |
| },                                                                          |
|                                                                             |
| transitionDuration: {                                                       |
|                                                                             |
| instant: '80ms',                                                          |
|                                                                             |
| fast: '150ms',                                                            |
|                                                                             |
| normal: '220ms',                                                          |
|                                                                             |
| slow: '350ms',                                                            |
|                                                                             |
| },                                                                          |
|                                                                             |
| },                                                                          |
|                                                                             |
| },                                                                          |
|                                                                             |
| plugins: \[\],                                                              |
|                                                                             |
| };                                                                          |
|                                                                             |
| export default config;                                                      |

*--- End of Document ---*
