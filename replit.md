# Sports Team Balancing Application

## Overview

This application manages and balances sports teams, allowing administrators to create matches, invite players via tokenized links, and automatically balance teams based on player ratings across six athletic attributes. It supports various team formats (3v3, 5v5, 8v8, 11v11) and provides visual feedback on team balance through charts and field views. The system includes user authentication, role-based permissions, real-time notifications, and a comprehensive lineup variant system, aiming to be a robust, production-ready solution for sports team management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript and Vite.
**UI Component System**: Radix UI primitives, shadcn/ui (New York style), and Tailwind CSS with custom design tokens.
**State Management**: TanStack Query for server state, local React state for UI.
**Routing**: Wouter.
**Design System**: Material Design foundation, custom color palette optimized for outdoor/mobile viewing, with primary light mode and dark mode support. Emphasizes clarity, action-oriented workflows, and data legibility. Consistent team colors for "Squadra Chiara" and "Squadra Scura".

### Backend Architecture

**Server Framework**: Express.js with TypeScript.
**API Design**: RESTful with JSON responses, cookie-based JWT authentication for admins, phone number-based user identification, and token-based invite system.
**Core Services**:
*   **Team Balancing Algorithms**: `GREEDY_LOCAL` (greedy with local search balancing across 6 athletic attributes) and `RANDOM_SEEDED` (randomized assignment with consistent seeding).
*   **Lineup Version System**: Generates multiple team configurations, scores them, and identifies the best-balanced option (V1), including manual V4 mode.
*   **Match View Builder**: Constructs public match data.
*   **Storage Abstraction**: Interface-based for database flexibility.
*   **Audit System**: Tracks player-suggested ratings for admin review.
*   **WebSocket Real-Time Notifications**: Broadcasts `PLAYER_REGISTERED` and `VARIANTS_REGENERATED` events.
**Admin Features**: Player rating editing, manual player addition/creation, automatic variant regeneration upon starter changes, and user role-based permissions with specific user endpoints and status change logic including reserve promotion.

### Data Storage

**ORM/Query Builder**: Drizzle ORM.
**Database Provider**: Neon Database (serverless PostgreSQL).
**Schema Design**: Includes tables for Users, Players, PlayerRatings, Matches, Signups, Teams, TeamAssignments, LineupVersion, LineupAssignment, and AuditLog, using VARCHAR UUIDs for primary keys and proper foreign key relationships.
**Data Flow**: Admin initiates matches and invites players, players self-rate and sign up, admin reviews/approves ratings, the system generates balanced lineup variants, and the public view displays teams.

## External Dependencies

**Third-Party Services**:
*   Neon Database (serverless PostgreSQL hosting).
*   Google Fonts CDN (Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono).

**Key Libraries**:
*   **Authentication**: `jsonwebtoken`.
*   **Data Visualization**: Chart.js with `react-chartjs-2`.
*   **Form Management**: React Hook Form with `@hookform/resolvers` and Zod.
*   **Database**: Drizzle ORM with `@neondatabase/serverless` driver.
*   **Session Management**: `cookie-parser`.
*   **UI Components**: Radix UI primitives (`@radix-ui/react-*`).

**API Security**: HTTP-only cookies for tokens, Bearer token support, environment-based JWT secret configuration.

## Recent Updates

### October 24, 2025

**Starter Cap Validation Fix**: Fixed critical bug where users could exceed sport-specific starter limits when changing status from public match view:
- Bug: Public endpoint `/api/matches/:id/change-status` was missing starter cap validation
- Impact: Users could change their status to STARTER even when the limit was reached (e.g., 21 starters in 8v8 when max is 16)
- Fix: Added cap validation matching admin endpoint behavior - returns 400 error "Posti titolari esauriti (X totali, Y per squadra)" when limit reached
- All endpoints now consistently enforce sport caps: 3v3=6, 5v5=10, 8v8=16, 11v11=22 total starters
- Tested: Verified 8v8 match correctly blocks 17th starter and allows adding as RESERVE instead

**Field View Enhancements**: Enhanced player visualization on the field with rating badges and improved positioning:
- Player rating badges: Colored circular badges (pink for Chiari, blue for Scuri) display average rating (1 decimal) above player names, calculated from 6 attributes (defense, attack, speed, power, technique, shot)
- 3v3 positioning refined: Goalkeeper lateral-bottom (20%, 12%), Striker top-center (15%, 25%), Midfielder center (45%, 22%)
- Center circle enlarged by 33% (from 96px to 128px) for better visibility
- Robust NaN prevention: Rating calculation validates finite values before display

**Placeholder Styling System**: Unified placeholder appearance across all forms:
- Global placeholder color: #ff551a (distinctive orange-red)
- Applied to admin login, user login, and match creation forms
- Native HTML5 behavior: disappears on focus, reappears only when field is empty on blur
- Uses `!important` to override Shadcn component defaults

**Homepage Button Unification**: All three homepage buttons now share consistent styling:
- Uniform appearance: text #0B4DFF (blue), background #F7F7F5 (off-white)
- Hover state: colors invert (background becomes blue, text becomes off-white)
- Applied to "Le mie partite", "Login Admin", and "Vedi Demo" buttons

**Form Initial State Cleanup**: Improved UX by showing placeholders immediately:
- Admin login: phone field starts empty (previously "+390000000000")
- Match creation: location field starts empty (previously "Da definire")
- User login: already had empty initial state

**Cervellone™ Branding**: Added trademark symbol (™) after "Cervellone" throughout the application:
- Homepage title: "Cervellone™ 2.0"
- Homepage footer: "Cervellone™ 2.0 is a coffee break project by Studio Dude"
- Establishes consistent brand identity across all user-facing text

**Radar Chart Selection Fix**: Fixed interaction behavior for player comparison in radar charts:
- Previous behavior: Hovering over a player would hide the selected player's stats
- New behavior: Selected players remain visible during hover, allowing simultaneous comparison
- Implementation: Changed logic from if/else (hover OR selected) to additive (selected AND hover)
- Applied to both public match view and admin match detail pages
- Improves UX by maintaining selected player context during exploration

**Radar Chart Animation Control**: Improved visual stability when players are selected:
- Animations disabled when any player is selected (click), preventing constant chart movement
- Animations remain active when showing team averages (no selections)
- Smoother UX: after selecting a player, the radar stays stable during hover interactions
- Applied to both public match view and admin match detail pages

### October 23, 2025

**Stats Section Reorganization**: Redesigned match detail page layout to consolidate team information in a single "Stats" section with three equal columns:
- Left: "Chiari" team roster (starters, reserves, next players with status management)
- Center: "Radar" chart comparing team attributes
- Right: "Scuri" team roster (starters, reserves, next players with status management)
Replaced previous two-section layout ("Confronto Radar" + "Giocatori Schierati") for better information density and easier comparison.

**Success Modal After Match Creation**: Improved post-creation UX with a modal dialog offering two immediate actions: "Copia Invito" (copies invite URL to clipboard) and "Gestisci" (navigates to match management page). Replaces previous auto-redirect behavior, giving admins control over next steps.

**Centered Toast Notifications**: Moved toast notifications from top-right to top-center for better visibility and to avoid overlap with UI controls.

**Dynamic Dropdown Options**: Status dropdowns now hide "Titolare" option when starter capacity is reached, preventing confusion. Default status automatically set to "Riserva" when cap is full.

**Inline Player Addition Dropdown**: Streamlined admin UX for adding players to matches. Replaced icon button + modal dialog workflow with direct inline dropdown next to each available player. Dropdown labeled "Aggiungi come" with options "Titolare", "Riserva", "Prossimo". Selection immediately triggers addition - no confirmation step. Smart regeneration: only regenerates lineup variants when adding starters (reserves/next players skip regeneration for faster UX and to avoid errors when no starters exist). Reduces clicks from 4 steps to 1.

**Interactive Radar Chart**: Enhanced radar visualization with hover and click interactions for player comparison:
- Default state: Displays team average statistics (Squadra Chiara vs Squadra Scura)
- Hover interaction: Temporarily shows individual player statistics, hiding team averages
- Click interaction: Pins player statistics for persistent comparison, click again to deselect
- Constraints: Maximum 2 players selected simultaneously, maximum 1 player per team
- Visual feedback: Selected players highlighted with team-colored borders (pink for Chiari, blue for Scuri), hover shows lighter border
- Status indicator: Shows "Hover attivo" or count of selected players below radar chart
- Both admin and public views support this interactive comparison feature

**Team Renaming**: Admins can now customize team names for each match. Pencil icon button next to match title opens a dialog with inputs for both team names ("Squadra Chiara" and "Squadra Scura"). Changes are saved immediately and reflected across all views. Default names are "Chiari" and "Scuri".

**User Avatar Upload**: Users can upload profile pictures from their matches page. Avatar appears in a profile card at the top of the page with their name and phone number. Upload button overlays the avatar, supports images up to 2MB, shows preview during upload. New `/api/user/me` endpoint provides user data including avatar URL.

**Match Deletion**: Admins can delete matches from the match detail page. "Elimina Partita" button in the header triggers confirmation dialog warning that all signups and team configurations will be removed. Upon deletion, admin is redirected to matches list with success toast. Backend endpoint removes all related data (signups, team assignments, lineup versions) and the match itself.