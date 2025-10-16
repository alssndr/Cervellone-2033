# Sports Team Balancing Application

## Overview

This is a sports team management and balancing application designed for coaches and players. The system allows admins to create matches, invite players via tokenized links, and automatically balance teams based on player ratings across multiple athletic attributes. The application supports various team formats (3v3, 5v5, 8v8, 11v11) and provides visual representations of team balance through charts, field views, and statistics panels.

**Status**: ✅ Production Ready - Extended with lineup variants, player management, and UX improvements (October 2025)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: 
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library (New York style variant)
- Tailwind CSS for styling with custom design tokens

**State Management**:
- TanStack Query (React Query) for server state management
- Local React state for UI interactions
- React Hook Form with Zod resolvers for form validation

**Routing**: 
- Wouter for client-side routing (lightweight alternative to React Router)
- Key routes include admin dashboard, match view, invite signup, and public match display

**Design System**:
- Material Design foundation with sports management focus
- Custom color palette optimized for outdoor/mobile viewing with high contrast
- Light mode primary with dark mode support
- Design emphasizes clarity, action-oriented workflows, and data legibility
- **Team Colors** (Updated October 2025):
  - Squadra Chiara (LIGHT): #fc0fc0 (rosa/magenta)
  - Squadra Scura (DARK): #0000ff (blu)
  - Applied in: Radar charts, field visualization, player badges

### Backend Architecture

**Server Framework**: Express.js with TypeScript

**Development Setup**:
- Vite middleware for hot module replacement in development
- TSX for TypeScript execution
- Concurrent development server setup

**API Design**:
- RESTful endpoints with JSON responses
- Cookie-based JWT authentication for admin users
- Phone number-based user identification
- Token-based invite system for match signups

**Core Services**:

1. **Team Balancing Algorithms**: 
   - **GREEDY_LOCAL**: Greedy algorithm with local search optimization that balances teams across 6 athletic axes (defense, attack, speed, power, technique, shot). Minimizes differences using weighted scoring (70% axis balance, 30% mean balance).
   - **RANDOM_SEEDED**: Randomized team assignment with consistent seeding for reproducibility.

2. **Lineup Version System**: Multi-variant lineup generation service that creates multiple team configurations, scores each variant, and marks the best-balanced option as recommended. Supports batch generation (default: 5 variants) with different algorithms.

3. **Match View Builder**: Constructs public-facing match data including team rosters, starters, reserves, and statistical comparisons.

4. **Storage Abstraction**: Interface-based storage layer allowing for flexible database implementations.

5. **Audit System**: Tracks player-suggested ratings from signup for admin review and approval workflow.

### Data Storage

**ORM/Query Builder**: Drizzle ORM configured for PostgreSQL

**Database Provider**: Neon Database (serverless PostgreSQL)

**Schema Design**:

- **Users**: Admin and player authentication via phone numbers
- **Players**: Individual player profiles with name, surname, contact information
- **PlayerRatings**: Six-axis skill ratings (defense, attack, speed, power, technique, shot) on 1-5 scale
- **Matches**: Event details including sport type, datetime, location, status (OPEN/FROZEN/CLOSED)
- **Signups**: Player registration for matches with status (STARTER/RESERVE/NEXT)
- **Teams**: Light and Dark team divisions per match
- **TeamAssignments**: Junction table linking players to teams
- **LineupVersion**: Multiple lineup variants per match with algorithm type (GREEDY_LOCAL/RANDOM_SEEDED), balance score, and recommendation flag
- **LineupAssignment**: Player-to-team assignments for each lineup version
- **AuditLog**: Tracks player-suggested ratings from signup for admin review

**Data Flow**:
1. Admin creates match → generates invite token
2. Players access invite URL → submit name, surname, phone number, and self-rate 6 athletic attributes
3. System identifies/creates player → records signup with suggestedRatings in AuditLog
4. Admin reviews players page → approves or modifies suggested ratings
5. Admin generates lineup variants → system creates multiple balanced team options with scoring
6. Admin selects and applies preferred variant → updates match teams
7. Public match view displays balanced teams with statistics

**Admin Player Management Features** (Added October 2025):

1. **Edit Player Ratings**: Admin can modify any player's 6 athletic ratings through a dialog interface with sliders. Changes are saved immediately and reflected across all match lineups.
   - Endpoint: `PATCH /api/admin/players/:id/ratings`
   - UI: Edit button on each player card opens rating modification dialog

2. **Add Player to Match Manually**: Admin can manually add any existing player to a match without requiring an invite link. Allows selection of match and player status (Starter/Reserve/Next).
   - Endpoint: `POST /api/admin/players/:id/add-to-match`
   - UI: "Aggiungi a Partita" button on player cards opens match selection dialog

3. **Create Player Manually**: Admin can create new players directly without requiring signup via invite link. Form includes name, surname, optional phone number, and initial 6 athletic ratings.
   - Endpoint: `POST /api/admin/players`
   - UI: "Crea Giocatore" button at top of players page opens creation dialog
   - Automatically creates associated user record if phone number provided

**UX Improvements** (October 2025):

1. **Match Creation Defaults**: 
   - Sport: 3v3 (most common format)
   - Date/Time: +24 hours from creation
   - Location: "Da definire" placeholder

2. **Public Match View Layout**: 
   - Field visualization at top (always visible, 500px height)
   - Radar chart below field
   - Team statistics panels in two columns at bottom

3. **Admin Match Detail Page** (`/admin/matches/:id`):
   - Variant selection system with circular buttons (v1, v2, v3, v!) positioned top-right above field
   - Real-time switching between lineup variants
   - Automatic field/radar/stats updates when variant changes
   - Compact player management section at bottom with 2-column grid
   - Context-aware "Aggiungi Giocatore" dialog for quick player additions

4. **Admin Players Page Redesign** (`/admin/players`):
   - 2-column grid layout (md:grid-cols-2)
   - Vertical player cards with centered content
   - Prominent average rating display (4xl font, blue color) with "MEDIA" label
   - Rating details in compact 2-column grid
   - Stacked action buttons

5. **Admin Matches List**:
   - Simplified "Gestisci" (Manage) button replacing "Visualizza"
   - Direct navigation to match detail page with variant controls

**Seed Data**:
- 22 placeholder players with randomized ratings (pre-seeded on startup)
- 3 sample matches for testing (ELEVEN/11v11, EIGHT/8v8, FIVE/5v5)
- Admin user: phone +39 333 0000000

### External Dependencies

**Third-Party Services**:
- Neon Database (serverless PostgreSQL hosting)
- Google Fonts CDN (Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono)

**Key Libraries**:
- **Authentication**: jsonwebtoken for JWT token generation/validation
- **Data Visualization**: Chart.js with react-chartjs-2 for radar charts and statistics
- **Form Management**: React Hook Form with @hookform/resolvers and Zod schemas
- **Database**: Drizzle ORM with @neondatabase/serverless driver
- **Session Management**: cookie-parser for HTTP cookie handling
- **UI Components**: Comprehensive Radix UI primitives suite (@radix-ui/react-*)

**Development Tools**:
- TypeScript for type safety
- ESBuild for production bundling
- Tailwind CSS with PostCSS for styling
- Replit-specific plugins for development experience

**Phone Number Normalization**: E.164 format standardization for international phone number handling

**API Security**: 
- HTTP-only cookies for token storage
- Bearer token support in authorization headers
- Environment-based JWT secret configuration with production safety checks