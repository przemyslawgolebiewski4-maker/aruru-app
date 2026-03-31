# Aruru — Foundation Document v1.2
_Last updated: 31.03.2026_

---

## 1. Name & Identity

**Aruru** — from the Sumerian goddess Aruru (~4000 BCE),
she who shaped life from clay.
Alternative name of Ninhursag, the potter-creatrix.

```
Wordmark:  aru·ru  (clay accent on last two letters)
Domains:   aruru.app / aruru.studio  (to register)
Handle:    @aruru / @withAruru
Bundle ID: com.lelekstudio.aruru
Backend:   aruru-production.up.railway.app (Railway)
```

---

## 2. Vision

**Phase 1 — MVP:** Operational tool for a single ceramic studio.
**Phase 2:** Portal connecting studios and ceramic artists.
**Phase 3:** Community platform monetised through sponsorship
            (clay suppliers, glaze brands, tools) — not advertising.

Philosophy: no algorithm, no engagement metrics, no infinite scroll.
Ceramists have a place that works for them — not against them.
Neurodivergent-friendly UI throughout: calm, predictable, zero pressure.

---

## 3. Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| App          | React Native (Expo ~51) + TypeScript|
| Web          | React Native Web (same codebase)    |
| Backend      | FastAPI (Python) → Railway          |
| Database     | MongoDB Atlas (Frankfurt eu-central-1) |
| Email        | Resend (sender: lelekstudio.com)    |
| Payments     | Stripe (future — field ready now)   |
| Hosting      | Vercel                              |
| PDF export   | WeasyPrint (server-side)            |
| Auth         | JWT {user_id, tenant_id, role}      |

**Repos (GitHub org: przemyslawgolebiewski4-maker)**
- `aruru-app`      — React Native (Expo)
- `aruru-backend`  — FastAPI

---

## 4. Users & Roles

### Global profile
One email = one account across the entire system.
A user can belong to multiple studios with different roles in each.

```
users collection — global
  _id, email, name, avatar_url,
  password_hash, email_verified,
  created_at, last_login
```

### Roles (per studio, stored in studio_members)

**Owner**
- Full access to everything in the studio
- Sets pricing / membership plans
- Creates workshops and events
- Assigns roles and manages invitations
- Can perform all assistant actions
  (log firings, add weights, manage tasks)
- Generates cost summaries and PDFs

**Assistant**
- Logs kiln sessions (date, type, kg per member)
- Manages tasks (create, execute, log hours)
- Views member list
- Cannot see pricing, costs, or financial data

**Member**
- Books open studio hours
- Signs up for workshops and events
- Views own cost summary
- Cannot see other members, pricing, or tasks

---

## 5. Studio Verification & Security

```
Step 1  POST /auth/register
        → email + password + name
        → verification email sent (Resend)
        → account inactive until verified

Step 2  GET /auth/verify?token=...
        → token valid 24h
        → account active

Step 3  POST /studios
        → name, slug (auto-generated), city, country
        → status: pending_setup
        → owner auto-added to studio_members

Step 4  Setup gate (blocks panel access)
        PUT  /studios/{id}/pricing    ← min 1 rate
        POST /studios/{id}/invite     ← min 1 member
        → both done: status → active
```

**Safeguards:**
- Email must be verified before creating a studio
- Max 3 studios per email (rate limit)
- Slug: globally unique
- `tenant.plan: "beta"` (full access now)
  Ready for: `"free" | "pro"` (Stripe later)
- Every DB query filtered by `tenant_id` — enforced by middleware

---

## 6. MongoDB Collections

### users (global)
```
_id, email (unique), name, avatar_url
password_hash, email_verified
created_at, last_login
```

### tenants
```
_id, name, slug (unique), city, country
description, owner_id
plan: "beta"
status: "pending_setup" | "active" | "suspended"
settings: { timezone, currency }
created_at
```

### studio_members
```
_id, tenant_id, user_id
role: "owner" | "assistant" | "member"
status: "active" | "invited" | "suspended"
joined_at, invited_by
INDEX: { tenant_id, user_id } unique
```

### pricing_configs (1:1 with tenants)
```
_id, tenant_id
open_studio_per_h: float
kiln_bisque_per_kg: float
kiln_glaze_per_kg: float
kiln_private_per_firing: float
updated_at
```

### events
```
_id, tenant_id
title, description
type: "workshop" | "event" | "open_studio_block"
starts_at, duration_min
capacity, spots_left
price: float  (0 = included in membership)
created_by
```

### bookings
```
_id, tenant_id, user_id
type: "open_studio" | "event"
event_id (nullable)
date, hours
status: "confirmed" | "cancelled"
booked_at
```

### tasks
```
_id, tenant_id
title, description
created_by, assigned_to
due_date
status: "todo" | "in_progress" | "done"
created_at, updated_at
```

### task_logs
```
_id, tenant_id, task_id, user_id
date, hours: float, note
created_at
```

### kiln_firings
```
_id, tenant_id
logged_by (user_id — assistant or owner)
fired_at: date
kiln_type: "bisque" | "glaze" | "private"
status: "open" | "closed"
items: [{ user_id, member_name, weight_kg, cost }]
total_cost: float
notes
created_at, closed_at
INDEX: { tenant_id, fired_at: -1 }
```

### cost_summaries
```
_id, tenant_id, user_id
year: int, month: int
membership_fee: float
open_studio_total: float
kiln_total: float
events_total: float
grand_total: float
status: "draft" | "sent"
pdf_url: string (nullable)
breakdown: {
  kiln_items:    [{ firing_id, date, type, kg, cost }],
  booking_items: [{ date, hours, cost }],
  event_items:   [{ event_id, title, cost }]
}
generated_at, sent_at
INDEX: { tenant_id, user_id, year, month } unique
```

---

## 7. Kiln Firing Flow

```
OPEN SESSION
  POST /studios/{id}/kiln-firings
  body: { fired_at, kiln_type }
  → status: open
  access: owner, assistant

ADD MEMBER WEIGHT
  POST /studios/{id}/kiln-firings/{fid}/items
  body: { user_id, weight_kg }
  → appends to items[]
  → cost = weight_kg × rate from pricing_config
    (private: flat fee per firing)
  access: owner, assistant

CLOSE SESSION
  POST /studios/{id}/kiln-firings/{fid}/close
  → recalculates all costs from current pricing_config
  → status: closed
  → upserts data into cost_summaries
  access: owner, assistant

REOPEN (correction)
  POST /studios/{id}/kiln-firings/{fid}/reopen
  access: owner only
```

---

## 8. Cost Summary Flow

```
GENERATE
  POST /studios/{id}/cost-summaries/generate
  body: { user_id, year, month }
  → aggregates: bookings + kiln_firings + events
  → creates or overwrites draft
  access: owner

PDF EXPORT
  GET /studios/{id}/cost-summaries/{sid}/pdf
  → WeasyPrint generates PDF server-side
  → returns file or saves URL
  access: owner (download) + member (own only)

SEND
  POST /studios/{id}/cost-summaries/{sid}/send
  → Resend emails member with PDF attached
  → status: sent
  access: owner
```

---

## 9. App Screens

```
AUTH
  /login
  /register
  /verify-email

ONBOARDING
  /studios/new          ← step 1: studio details
  /studios/{id}/setup   ← step 2: pricing + first invite

OWNER / ASSISTANT PANEL
  /studios/{id}/dashboard   ← stats overview
  /studios/{id}/members     ← list, invite, roles
  /studios/{id}/pricing     ← rate configuration
  /studios/{id}/kiln        ← firing sessions + flow
  /studios/{id}/tasks       ← task board
  /studios/{id}/events      ← workshops + events
  /studios/{id}/costs       ← summaries, PDF, send

MEMBER VIEW
  /studios/{id}/book        ← reserve open studio hours
  /studios/{id}/events      ← browse + sign up
  /studios/{id}/my-costs    ← own cost summary
```

---

## 10. Design System

**Palette**
```
clay:       #C4714A   primary action, accent
clayLight:  #F2E4D8   backgrounds, stat cards
clayDark:   #7A3D22   text on clay fills
moss:       #4A5E3A   success, confirm, close
mossLight:  #E8EFE1   success backgrounds
cream:      #F7F3ED   page background
creamDark:  #EDE5D8   card fills
ink:        #1E1A16   text primary
inkMid:     #5C5248   text secondary
inkLight:   #9C8E82   labels, metadata
```

**Typography**
```
DM Serif Display   → headings, wordmark, page titles
Instrument Sans    → body, UI, forms
DM Mono            → labels, dates, codes, badges
```

**Principles**
- Light background (cream #FDFAF6)
- Neurodivergent-friendly: calm, predictable, no pressure
- 0.5px borders, generous whitespace
- Balanced density — clean but with content

---

## 11. Sprint Plan

### Sprint 1 — Foundation (now)
_Backend: auth + tenant + role system_
```
POST /auth/register
POST /auth/login
GET  /auth/verify
GET  /auth/me
POST /studios
PUT  /studios/{id}/pricing
POST /studios/{id}/invite
PATCH /studios/{id}/members/{uid}/role
GET  /studios/{id}/members
GET  /studios/{id}/pricing
Middleware: JWT + TenantMiddleware + RoleGuard
```

### Sprint 2 — Core operations
```
kiln_firings (open, items, close, reopen)
tasks + task_logs (CRUD + hour logging)
events (CRUD)
bookings (CRUD)
```

### Sprint 3 — Billing
```
cost_summaries (generate, calculate)
PDF export (WeasyPrint)
Owner costs dashboard
Member my-costs view
```

### Sprint 4 — Portal (post-MVP validation)
```
Public studio profiles
City-based search
Community feed (chronological, no algorithm)
Sponsor / clay supplier section (transparent)
```

---

## 12. Open Decisions (non-blocking for Sprint 1)
- Push notifications in MVP: yes / no?
- Studio subdomain (aruru.app/studio/slug vs slug.aruru.app)?
- Avatar upload: Cloudflare R2 or URL only?
- PDF date locale: en-GB or en-US?
