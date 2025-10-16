# Design Guidelines: Sports Team Balancing Application

## Design Approach

**Selected Approach**: Design System-Based (Material Design foundation)
**Justification**: This is a data-intensive sports management tool requiring clear information hierarchy, reliable data visualization, and functional UI patterns. The application prioritizes usability, quick data comprehension, and efficient workflows over visual storytelling.

**Reference Products**: TeamSnap, SportsEngine, Hudl (sports management), combined with Material Design principles for data-heavy interfaces.

## Core Design Principles

1. **Clarity First**: Every element serves the goal of quick comprehension
2. **Action-Oriented**: Clear CTAs guide users through workflows (create match → generate invite → balance teams)
3. **Data Legibility**: Charts, lists, and stats must be instantly readable
4. **Mobile-Optimized**: Coaches/players often access on phones at fields
5. **High Contrast**: Ensures readability in outdoor/bright conditions

---

## Color Palette

### Light Mode (Primary)
- **Background**: `44 10% 97%` (paper - warm off-white)
- **Surface**: `0 0% 100%` (pure white cards)
- **Text Primary**: `0 0% 7%` (ink - near black)
- **Text Secondary**: `0 0% 40%` (muted gray)
- **Primary Action**: `221 100% 52%` (blueTeam - vibrant blue)
- **Primary Hover**: `221 100% 45%`
- **Success**: `142 76% 36%` (green for confirmed starters)
- **Warning**: `38 92% 50%` (amber for reserves)
- **Team Light Border**: `0 0% 85%` (subtle gray for Light team cards)
- **Team Dark Border**: `0 0% 20%` (strong gray for Dark team cards)

### Dark Mode
- **Background**: `0 0% 9%` (inkMuted)
- **Surface**: `0 0% 14%`
- **Text Primary**: `44 10% 97%`
- **Text Secondary**: `0 0% 65%`
- **Primary Action**: `221 100% 60%` (lighter blue for contrast)
- Maintain same success/warning hues with adjusted lightness

---

## Typography

**Font Stack**: Inter (via Google Fonts CDN), system-ui fallback

### Scale
- **Hero/H1**: 2.5rem / 3rem line / 700 weight
- **H2**: 2rem / 2.5rem / 600 weight
- **H3**: 1.5rem / 2rem / 600 weight
- **Body**: 1rem / 1.5rem / 400 weight
- **Small/Caption**: 0.875rem / 1.25rem / 400 weight
- **Button/Label**: 0.875rem / 1rem / 500 weight (uppercase)

### Usage
- **Headlines**: Bold (600-700) for section headers
- **Player Names**: Medium (500) for emphasis in team lists
- **Stats/Numbers**: Tabular numerals for radar chart values
- **Form Labels**: Small (0.875rem), medium weight, uppercase with letter-spacing

---

## Layout System

**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16, 20 (px equivalents: 8, 16, 24, 32, 48, 64, 80)

### Grid Structure
- **Container**: max-w-7xl (1280px) with px-4 on mobile, px-6 on desktop
- **Page Padding**: py-8 on mobile, py-12 on desktop
- **Card Spacing**: gap-6 between cards on desktop, gap-4 on mobile
- **Section Margins**: mb-12 between major sections

### Responsive Breakpoints
- Mobile-first approach
- md: 768px (tablet) - Switch to 2-column layouts
- lg: 1024px (desktop) - Full 3-column grids where appropriate

---

## Component Library

### Navigation
- **Admin Header**: Fixed top bar with logo, match selector dropdown, logout button
- **Public Header**: Minimal - match title, date, location (sticky on scroll)
- **Mobile Nav**: Hamburger menu on mobile (< md breakpoint)

### Buttons
- **Primary**: Blue background, white text, rounded-lg, px-6 py-3, shadow-sm
- **Secondary**: White background, blue border (2px), blue text, same padding
- **Danger**: Red background for destructive actions (close match, remove player)
- **Icon Buttons**: Circle, 40px, centered icon, subtle hover state

### Cards
- **Match Card**: White background, rounded-xl, shadow-md, p-6, border-l-4 (blue accent)
- **Player Card**: Compact, flex layout, avatar placeholder, name, ratings mini-bar
- **Team Card**: Larger, includes team name header, player list, summary stats
- **Stat Card**: Small, centered number (large), label below, colored border-top

### Forms
- **Input Fields**: border-2, rounded-lg, px-4 py-3, focus:ring-2 ring-blue
- **Phone Input**: Prefix with country flag icon, format helper text below
- **Select Dropdowns**: Custom styled with chevron icon, match input styling
- **Radio/Checkbox**: Large touch targets (44px min), blue accent color

### Data Display
- **Player List**: Vertical stack, alternating subtle backgrounds, 56px row height
- **Team Roster Grid**: 2 columns (LIGHT vs DARK), side-by-side comparison
- **Stats Table**: Sticky header, zebra stripes, right-aligned numbers
- **Radar Chart**: 300px diameter, blue/gray team colors, axis labels outside, grid lines subtle

### Overlays
- **Modal**: Centered, max-w-lg, rounded-xl, shadow-2xl, backdrop blur
- **Toast Notifications**: Top-right, auto-dismiss, color-coded (success/error), slide-in animation
- **Loading State**: Spinner overlay with backdrop-filter: blur(4px)

---

## Page-Specific Layouts

### Admin Dashboard
- **Hero**: None - immediately show action ("Create New Match" prominent button)
- **Match List**: Card grid, 3 columns on desktop, 1 on mobile, sorted by date
- **Quick Stats**: 4-column row above match list (total matches, active, closed, players)

### Create Match Flow
- **Form**: Single column, max-w-2xl centered, clear step indicators if multi-step
- **Sport Selector**: Large icon buttons (calcio a 3, 5, 8, 11) in 2x2 grid
- **Date/Time**: Native date picker, time slots as button group

### Match View (Public)
- **Hero**: Compact header with match details (sport icon, date/time, location), no large image
- **Team Display**: 2-column layout, LIGHT on left, DARK on right, equal height
- **Radar Chart Section**: Full-width, centered, 400px max, legend below
- **Reserve Lists**: Collapsible accordions below starters, sorted alphabetically

### Invite Signup Page
- **Hero**: Minimal - match title and countdown to match time
- **Phone Input**: Prominent, centered, autofocus, "Verify & Sign Up" button below
- **Availability Selector**: 3 large buttons (Starter, Reserve, Can't Make It) with icons
- **Confirmation**: Success message with assigned team display

---

## Animations

**Minimal Approach**: Use only for feedback and transitions

- **Page Transitions**: None (instant navigation preferred)
- **Card Hover**: Subtle shadow lift (shadow-md → shadow-lg), 150ms ease
- **Button Press**: Scale down to 98%, 100ms ease-out
- **Loading States**: Rotating spinner, 1s linear infinite
- **Toast Enter/Exit**: Slide from right, 200ms ease-out
- **Radar Chart**: Animate from center on load, 600ms ease-out (one-time only)

---

## Accessibility & Dark Mode

- **Dark Mode**: Fully supported, toggle in admin header, persisted in localStorage
- **Focus States**: 2px blue ring, 2px offset, visible on all interactive elements
- **Touch Targets**: Minimum 44x44px for mobile
- **Color Contrast**: WCAG AA compliance (4.5:1 for text, 3:1 for UI components)
- **Screen Reader**: Semantic HTML, aria-labels for icons, live regions for dynamic updates

---

## Images

**Minimal Image Use**: This is a data-focused utility app

- **No Hero Images**: Skip decorative photography
- **Sport Icons**: Use icon library (Heroicons or Font Awesome) for sport type indicators
- **Player Avatars**: Placeholder circles with initials (e.g., "LM" for Luca Martini)
- **Empty States**: Simple illustrations (optional) for "No matches yet" screens