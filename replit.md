# Sports Team Balancing Application

## Overview

This application manages and balances sports teams for coaches and players. It enables administrators to create matches, invite players via tokenized links, and automatically balance teams based on player ratings across six athletic attributes. The system supports various team formats (3v3, 5v5, 8v8, 11v11) and provides visual feedback on team balance through charts, field views, and statistics. The project aims to provide a robust, production-ready solution for sports team management with advanced features like real-time notifications, user role-based permissions, and a comprehensive lineup variant system.

**Status**: ✅ Production Ready - Complete with user authentication, role-based permissions, and security hardening (October 20, 2025)

## Recent Updates

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