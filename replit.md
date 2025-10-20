# Sports Team Balancing Application

## Overview

This application manages and balances sports teams for coaches and players. It enables administrators to create matches, invite players via tokenized links, and automatically balance teams based on player ratings across six athletic attributes. The system supports various team formats (3v3, 5v5, 8v8, 11v11) and provides visual feedback on team balance through charts, field views, and statistics. The project aims to provide a robust, production-ready solution for sports team management with advanced features like real-time notifications, user role-based permissions, and a comprehensive lineup variant system.

**Status**: ✅ Production Ready - Complete with user authentication, role-based permissions, and security hardening (October 20, 2025)

## Test Credentials

Per facilitare i test, sono disponibili due utenti permanenti nel database:

- **Admin**: phone `12345`, password `12345`
- **Utente normale**: phone `6789`, password `6789`

Questi utenti vengono creati automaticamente al seed del database.

## Recent Updates

### Admin UX Improvements + Team Roster Management (October 20, 2025)

Implemented comprehensive admin interface enhancements and robust team roster management:

1. **Player Management Streamlining**:
   - Renamed "Approva rating suggeriti" → "Approva" for conciseness
   - Added "Modifica" button next to "Approva" for editing player data before approval
   - Admin can now edit name, surname, and all 6 athletic ratings in edit dialog

2. **Two-Column Team Roster View**:
   - Match detail page reorganized with side-by-side "Chiari" and "Scuri" columns
   - Each column displays three sections: Titolari, Riserve, Prossima Volta
   - Every player has status dropdown (Titolare/Riserva/Prossimo) for inline status changes
   - Visual separation with team colors and borders for clarity

3. **Starter Cap Validation**:
   - maxStarters calculated from sport type (3v3=3, 5v5=5, 8v8=8, 11v11=11)
   - "Titolare" option disabled when starter cap reached, displays "Titolare (Completo)"
   - Frontend prevents illegal promotions while showing current capacity
   - Last starter protected: cannot change to RESERVE/NEXT if only 1 starter remains

4. **Race Condition Protection**:
   - Implemented in-memory mutex (`withMatchLock`) for signup status changes
   - Serializes concurrent status modifications per match to prevent TOCTOU errors
   - Validates starter cap atomically before allowing STARTER promotion
   - Prevents removing last starter: returns 400 with error message
   - Lock released in finally block to prevent deadlocks or memory leaks

5. **ReserveTeam Assignment**:
   - Admin-added RESERVE/NEXT players now auto-assigned to reserveTeam (LIGHT/DARK)
   - Balances between teams based on current reserve counts
   - Ensures all reserves visible in roster columns (previously hidden if undefined)

**Technical Implementation**:
- Mutex: `Map<matchId, Promise<void>>` with async lock acquisition/release
- Validation: Pre-check + atomic update within mutex critical section
- Frontend: `isStartersLimitReached` and `isLastStarter` computed props disable SelectItems
- Backend: PATCH `/api/admin/signups/:signupId/status` with mutex + dual validation
- Bug fixes: reserveTeam now assigned on manual player addition (server/routes.ts line 290-303)

**Tested**: End-to-end Playwright tests verify concurrent status changes, cap enforcement, and UI feedback

### Updated Player Positioning for 3v3 and 5v5 (October 20, 2025)

Aggiornato il posizionamento dei giocatori nel campo visivo per formati calcio a 3 e calciotto:

1. **Calcio a 3 (3v3)**: Formazione triangolare
   - Portiere: posizione bassa laterale
   - 1 attaccante: posizione alta centrale
   - 1 centrocampista: posizione centrale
2. **Calciotto (5v5)**: Formazione 2-2-1
   - Portiere: posizione bassa laterale
   - 2 difensori: posizione bassa centrale
   - 2 centrocampisti: posizione centrale
   - (posizioni estendibili per attaccanti se necessario)

Le posizioni utilizzano coordinate assolute personalizzate per ogni formato sportivo nel componente FieldView.tsx.

### Streamlined Invite Flow + Public Status Changes (October 20, 2025)

Implemented fast-track player enrollment and public match interaction:

1. **Phone-First Invite Flow**: `/invite/:token/signup` now collects phone number + status choice upfront
2. **Smart Enrollment**: 
   - `POST /api/invite/:token/check-phone` determines player state (enrolled, exists, new)
   - Already enrolled → redirect to `/matches/:id` with phone stored
   - Existing player → direct signup without profile form
   - New player → show full registration form (name, surname, ratings)
3. **Public Status Changes**: 
   - `PATCH /api/matches/:id/change-status` allows enrolled players to change own status via phone verification
   - Security: validates phone ownership through signup lookup
   - Auto-promotes first RESERVE when STARTER downgrades (excludes current user from candidates)
4. **Match View Enhancements**: 
   - `/matches/:id` now displays status dropdown for enrolled users
   - Refetch uses query predicate to capture all public view variants
   - localStorage handoff ensures seamless phone persistence across redirects

**Bug Fixes**:
- Admin v4 swap now correctly invalidates all public view queries (fixed predicate matching)
- Reserve promotion excludes signup initiating the change (prevents circular logic)

### User Role-Based Permissions System (October 20, 2025)

Implemented dual authentication with role-based access control:

1. **User Authentication** (`/api/user/login`): Phone-based login for regular users, separate token management, auto-creates USER role
2. **User Endpoints**: GET `/api/user/matches` (enrolled matches only), PATCH `/api/user/matches/:id/status` (change own status)
3. **Reserve Promotion Logic**: When STARTER changes to RESERVE/NEXT, first existing RESERVE auto-promotes (excludes user who just changed)
4. **Frontend Pages**: `/user/login`, `/user/matches`, `/user/matches/:id` with status dropdowns and warnings
5. **Access Control**: Admin routes protected by `adminAuth`, user routes by `userAuth`

**Security Hardening**:
- `userAuth` enforces role='USER' only (prevents admin token reuse)
- PATCH endpoint verifies authenticated user owns the signup
- GET endpoint scopes to authenticated user's phone/player
- Multiple ownership checks prevent cross-user data access

**Technical**: Dual middleware in server/routes.ts, frontend pages in client/src/pages/user-*.tsx, bug fix at line 647 excludes current signup from promotion

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite.

**UI Component System**: Radix UI primitives, shadcn/ui (New York style), and Tailwind CSS with custom design tokens.

**State Management**: TanStack Query for server state, local React state for UI.

**Routing**: Wouter.

**Design System**: Material Design foundation, custom color palette optimized for outdoor/mobile viewing, with primary light mode and dark mode support. Emphasizes clarity, action-oriented workflows, and data legibility. Team colors for "Squadra Chiara" (#fc0fc0) and "Squadra Scura" (#0000ff) are consistently applied.

### Backend Architecture

**Server Framework**: Express.js with TypeScript.

**API Design**: RESTful with JSON responses, cookie-based JWT authentication for admins, phone number-based user identification, and token-based invite system.

**Core Services**:
1.  **Team Balancing Algorithms**:
    *   **GREEDY_LOCAL**: Greedy algorithm with local search, balancing across 6 athletic axes (defense, attack, speed, power, technique, shot) with weighted scoring (70% axis, 30% mean balance).
    *   **RANDOM_SEEDED**: Randomized assignment with consistent seeding.
2.  **Lineup Version System**: Generates multiple team configurations (default 3 GREEDY_LOCAL variants), scores them, and marks the best-balanced option (V1). Includes manual V4 mode.
3.  **Match View Builder**: Constructs public match data.
4.  **Storage Abstraction**: Interface-based for database flexibility.
5.  **Audit System**: Tracks player-suggested ratings for admin review.
6.  **WebSocket Real-Time Notifications**: Broadcasts `PLAYER_REGISTERED` and `VARIANTS_REGENERATED` events.

**Admin Features**:
*   Player rating editing.
*   Manual player addition to matches.
*   Manual player creation.
*   Automatic variant regeneration and V1 application upon starter changes.
*   User role-based permissions for admin and regular users, including specific user endpoints and status change logic with reserve promotion.

### Data Storage

**ORM/Query Builder**: Drizzle ORM.

**Database Provider**: Neon Database (serverless PostgreSQL).

**Schema Design**: Includes tables for Users, Players, PlayerRatings, Matches, Signups, Teams, TeamAssignments, LineupVersion, LineupAssignment, and AuditLog.

**Data Flow**: Admin creates match and invites players, players self-rate and sign up, admin reviews/approves ratings, system generates and applies balanced lineup variants, public view displays teams.

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

**Development Tools**: TypeScript, ESBuild, Tailwind CSS, PostCSS.

**API Security**: HTTP-only cookies for tokens, Bearer token support, environment-based JWT secret configuration.