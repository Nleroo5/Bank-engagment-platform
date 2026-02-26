# Bank Engagement Survey Platform

## Project Overview

A web-based survey platform for banks. Digitizes 5 paper-based employee engagement/assessment surveys. Admins create campaigns, send survey links via email, employees complete surveys through tokenized URLs, and results are aggregated into dashboards with exports.

**This is a client project. All code must be production-quality, secure, and accessible.**

## Tech Stack (STRICT — do not deviate)

- **Framework**: Next.js 14+ with App Router (NOT Pages Router)
- **Language**: TypeScript (strict mode, no `any` types)
- **Styling**: Tailwind CSS (no CSS modules, no styled-components)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma (always run `npx prisma generate` after schema changes)
- **Auth**: NextAuth.js (Auth.js v5) — credentials for admins, anonymous access-code flow for respondents
- **Email**: Resend
- **Charts**: Recharts
- **Exports**: ExcelJS for Excel, jsPDF for PDF
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: Vercel

## Architecture Rules

### Directory Structure

```
src/
  app/                    # Next.js App Router
    (admin)/              # Admin route group (requires auth)
      dashboard/
      campaigns/
      users/
      reports/
    (survey)/             # Public survey route group
      a/[code]/           # Access-code entry page
    api/                  # API routes
      anonymous/          # Anonymous survey endpoints (validate, respond, submit)
      campaigns/
      public/             # Public endpoints (survey data for respondents)
      reports/
      surveys/
  components/
    ui/                   # Reusable primitives (Button, Input, Card, etc.)
    survey/               # Survey-specific components (LikertScale, ProgressBar, etc.)
    admin/                # Admin dashboard components
    charts/               # Recharts wrappers
    reports/              # Report display components
  lib/
    prisma/               # Prisma client singleton
    surveys/              # Survey query functions (PostgreSQL)
    email/                # Email templates and sending logic
    scoring/              # Score calculation and reverse-scoring logic
    auth/                 # Auth configuration
    utils/                # Shared utilities
  types/                  # TypeScript type definitions
prisma/
  schema.prisma           # Database schema
  migrations/             # Prisma migrations
```

### Routing Convention

- Admin routes: `/admin/dashboard`, `/admin/campaigns`, `/admin/users`, `/admin/reports`
- Survey routes: `/a/[code]` (public, access-code based, no auth required)
- API routes: `/api/campaigns`, `/api/anonymous/*`, `/api/reports`
- Public API: `/api/public/surveys` (survey data for anonymous respondents)
- Use route groups `(admin)` and `(survey)` for layout separation

### Component Rules

- All components are functional components with TypeScript interfaces for props
- Use `"use client"` directive ONLY when the component needs interactivity (onClick, useState, useEffect)
- Server Components are the default — keep data fetching in Server Components
- Never fetch data in Client Components — pass it as props from Server Components
- Colocate component files: `ComponentName.tsx` (no separate index.ts barrel files)

### API Route Rules

- All API routes use the App Router convention: `route.ts` with exported functions (GET, POST, PUT, DELETE)
- Always validate request bodies with Zod schemas
- Always return proper HTTP status codes and JSON error messages
- Wrap all handlers in try/catch and log errors server-side
- Never expose internal error details to the client

## The 5 Surveys

### 1. Demographics (collected once per survey cycle)

Dropdown/radio form. Fields: Name of Bank, Location (Country > State > Metro City Area > City — cascading dropdowns), Size of Bank (12 ranges: <$100M to >$20B), Device Used, Employment Status, Gender, Time at Bank, Bank Experience, Bank Division (11 options + Other), Job Role (16 options + Other).

### 2. Leadership Team Effectiveness (LTE) — Survey 4

40 items, 4 sections (Goal Setting, Roles, Interpersonal Relationships, Procedures). 5-point Likert: 5=Strongly Agree to 1=Strongly Disagree. Some items have right-side anchor text describing the "ideal" answer. 7 categories: Communication, Leadership, Culture, Accountability, Execution, Associate, Team Dynamics.

### 3. Operational Team Effectiveness (OTE) — Survey 5

36 items, 3 sections (Operating Effectiveness, Support Person Effectiveness, Leadership Team Support). Same 5-point Likert scale. Same 7 categories.

### 4. Managerial Assessment — Survey 6

35 items. 3-point scale: 1=Rarely, 2=Sometimes, 3=Frequently. HAS REVERSE-SCORED ITEMS where scale flips (3=Rarely, 2=Sometimes, 1=Frequently). Same 7 categories. Requires `Executive or Manager Name` field.

### 5. Associate 180 Assessment — Survey 7

35 items. Same 3-point scale as Survey 6. HAS REVERSE-SCORED ITEMS. Same 7 categories. ANONYMITY IS CRITICAL — never expose individual responses. Reports only show team averages. Minimum 5 respondents required before generating reports. Requires `Associate Name` field.

## Reverse Scoring (CRITICAL)

Some questions on Surveys 6 and 7 are reverse-scored (marked `isReversed: true` in the database). The scoring engine MUST:

1. Store the RAW value as the respondent selected it
2. At report time, apply: `adjustedScore = (scaleMax + 1) - rawScore`
3. For 3-point scale: raw 1 becomes 3, raw 3 becomes 1, raw 2 stays 2
4. Display both raw and adjusted in admin reports

## Database (PostgreSQL via Prisma)

The Prisma schema is in `prisma/schema.prisma`. All survey content (surveys, sections, questions, categories, scales) lives in PostgreSQL. Key tables:

- `organizations` — bank profiles
- `users` — admin accounts (role: SUPER_ADMIN only)
- `surveys` — survey definitions with sections, questions, categories
- `survey_campaigns` — a distribution of a survey to an org with date range
- `anonymous_responses` — anonymous survey completion sessions
- `anonymous_response_items` — individual answer values per question

Always use `@db.Uuid` for IDs. Always use `@default(uuid())`. Never use auto-increment for primary keys.

## Authentication

- **Respondents**: Access surveys via access code at `/a/[code]`. NO login required. Access code validated against `survey_campaigns.accessCode`. Creates anonymous session with UUID session token.
- **Admins**: Login via `/admin/login` with email/password credentials. Use NextAuth session with JWT strategy.
- **Role**: SUPER_ADMIN only. Enforced in middleware.

## Email System

Use Resend API. Email types:

- **Invitation**: Contains unique survey link, deadline, estimated time, bank branding
- **Reminder**: Same link, sent at configurable interval before campaign close
- **Confirmation**: Thank-you after submission, no response data included
- **Admin notification**: Campaign completion stats

All emails use React Email templates in `src/lib/email/templates/`.

## Security Requirements

- All tokens are UUID v4 — never sequential, never guessable
- Hash IP addresses before storing (SHA-256)
- Rate limit API routes (especially `/api/anonymous/*`)
- Validate all inputs server-side with Zod (never trust client data)
- Set proper security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Use `httpOnly`, `secure`, `sameSite` cookie flags for auth
- No PII in URLs or query params
- Database credentials only in environment variables, never committed

## Anonymity (Associate 180)

- Individual responses for Survey 7 are NEVER visible in any admin view
- Reports require minimum 5 respondents before generating
- Aggregate scores are rounded to 1 decimal place
- Demographic cross-filtering is disabled when it would reduce the pool below 5 respondents
- The system must enforce this at the API level, not just the UI

## Code Style

- Use `const` over `let`, never `var`
- Prefer named exports over default exports (except for page/layout components)
- Use early returns to reduce nesting
- Extract magic numbers into named constants
- All database queries go through Prisma — never write raw SQL
- Use `async/await`, never `.then()` chains
- Error messages should be user-friendly, never expose stack traces
- All form inputs need proper `aria-label` or `label` elements
- All images need `alt` text
- Keyboard navigation must work for all interactive elements

## Common Commands

```bash
# Development
npm run dev                          # Start Next.js dev server
npx prisma studio                   # Open Prisma database GUI
npx prisma migrate dev               # Run database migrations
npx prisma generate                  # Regenerate Prisma client

# Testing
npm run test                         # Run Vitest
npm run test:e2e                     # Run Playwright
npm run lint                         # ESLint
npm run type-check                   # TypeScript check

# Build
npm run build                        # Production build
```

## Environment Variables

See `.env.example` for all required variables. NEVER commit `.env` files. Critical vars:

- `DATABASE_URL` — PostgreSQL connection string (with `?pgbouncer=true` for Supabase pooler)
- `DIRECT_URL` — Direct PostgreSQL connection (bypasses PgBouncer, used for migrations)
- `NEXTAUTH_SECRET` — Auth.js secret key
- `NEXTAUTH_URL` — Base URL for auth callbacks
- `RESEND_API_KEY` — Email service API key
- `NEXT_PUBLIC_BASE_URL` — Public-facing base URL for survey links in emails
