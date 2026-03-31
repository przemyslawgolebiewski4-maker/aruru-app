# Aruru — Cursor Context

Aruru is a multi-tenant SaaS platform for ceramic studios.
Named after the Sumerian goddess Aruru — she who shaped life from clay.
NEVER confuse with Calmi Experiments (different project).

## Repos (GitHub org: przemyslawgolebiewski4-maker)
- aruru-app      ← this repo — React Native (Expo)
- aruru-backend  ← FastAPI (to build)

## Stack
- React Native (Expo ~51) + TypeScript
- React Native Web — one app for mobile and web
- Backend: FastAPI @ Railway
- DB: MongoDB Atlas Frankfurt (eu-central-1)
- Email: Resend
- Hosting: Vercel

## Design system — src/theme/
- `tokens.ts` — colours, typography, spacing, radius
- `index.ts`   — StyleSheet helpers (text.*, layout.*)
- UI components: `src/components/ui/index.tsx`

### Palette
- clay:  #C4714A  (primary action, accent)
- moss:  #4A5E3A  (success, confirm, close firing)
- cream: #F7F3ED  (backgrounds, stat cards)
- ink:   #1E1A16  (text primary)

### Typography
- Display : DM Serif Display   (headings, wordmark)
- Body    : Instrument Sans    (UI, forms)
- Mono    : DM Mono            (labels, dates, badges)

### UI rules
- Always use tokens from theme/tokens.ts — never hardcode colours
- fontSize.xxx / spacing[n] / radius.xxx
- Border width: 0.5px default, 1px for focused inputs
- Neurodivergent-friendly: calm, predictable, zero pressure

## Architecture
- `users`         — global profile (one email = one account worldwide)
- `studio_members`— junction: user ↔ studio with role
- Roles per studio: owner | assistant | member  (NOT per user)
- JWT payload: { user_id, tenant_id, role }
- Every DB query MUST include tenant_id filter
- Middleware: TenantMiddleware + RoleGuard decorator

## MongoDB collections
users, tenants, studio_members, pricing_configs,
events, bookings, tasks, task_logs, kiln_firings, cost_summaries

## Screens
auth/:      LoginScreen, RegisterScreen
owner/:     DashboardScreen, KilnFiringScreen
assistant/: (to build — same components as owner)
member/:    (to build)

## Sprint 1 — backend (next)
1. FastAPI structure: /app/models /routes /middleware /services /db.py
2. Pydantic models for all collections
3. Auth endpoints: register, login, verify-email, me
4. Studio endpoints: create, invite, role management
5. Middleware: TenantMiddleware + RoleGuard

## Conventions
- All API calls via src/services/api.ts
- Auth state via src/hooks/useAuth.tsx (AuthProvider)
- File names: PascalCase for screens, camelCase for utilities
- Comments and UI copy: English
