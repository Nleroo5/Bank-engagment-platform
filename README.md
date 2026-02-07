# Bank Engagement Survey Platform

A production-ready web-based survey platform for banks built with Next.js 14, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Sanity.io account

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Then fill in your actual values in `.env`.

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run database migrations:

```bash
npm run db:migrate
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
  app/                    # Next.js App Router
    (admin)/              # Admin routes (requires auth)
    (survey)/             # Public survey routes
    api/                  # API routes
  components/
    ui/                   # Reusable UI components
    survey/               # Survey-specific components
    admin/                # Admin dashboard components
  lib/
    sanity/               # Sanity CMS client and queries
    prisma/               # Prisma client singleton
    email/                # Email templates
  types/                  # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **CMS**: Sanity.io v3
- **Auth**: NextAuth.js (Auth.js v5)
- **Email**: Resend
- **Charts**: Recharts
- **Testing**: Vitest, Playwright

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed project documentation and coding guidelines.

## License

Private - All Rights Reserved
