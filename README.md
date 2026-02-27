# Recipe AI Manager V3

Production-oriented multi-user Recipe Management web app built with Next.js App Router, Supabase, Azure OpenAI, and Tailwind CSS.

## Features

- Recipe CRUD with structured ingredients
- Food logging with daily macro totals
- Nutrition analysis (Edamam) with fallback estimates
- Open Food Facts search integration (open source food database)
- Smart natural language search to structured filters
- Multi-user authentication and private/public visibility model
- Explore page for public recipes
- Macro target tracking in settings and dashboard

## Tech Stack

- Frontend: Next.js (App Router), JavaScript, Tailwind CSS
- Backend: Next.js Route Handlers (`app/api/...`)
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- AI: Azure OpenAI deployed model
- Nutrition: Edamam API
- Deployment: Vercel

## Project Structure

- `app/` - routes and pages
- `app/api/` - backend route handlers
- `components/` - reusable UI components
- `lib/services/` - domain and integration services
- `lib/supabase/` - Supabase server/browser clients
- `supabase/schema.sql` - schema, constraints, indexes, triggers
- `supabase/policies.sql` - RLS policy setup
- `supabase/seed.sql` - optional sample seed

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`
- `EDAMAM_APP_ID`
- `EDAMAM_APP_KEY`
- `OPENFOODFACTS_BASE_URL`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase, Azure OpenAI, and Edamam values

3. Create Supabase project and run SQL:
   - Open Supabase SQL Editor
   - Run `supabase/schema.sql`
   - Run `supabase/policies.sql`
   - Optionally run `supabase/seed.sql`

4. Configure Supabase Auth:
   - Enable Email/Password provider
   - Add OAuth provider(s) as needed
   - Set redirect URL to `http://localhost:3000`

5. Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Route Map

- Recipes:
  - `GET /api/recipes`
  - `POST /api/recipes`
  - `GET /api/recipes/:id`
  - `PATCH /api/recipes/:id`
  - `DELETE /api/recipes/:id`
- Search:
  - `GET /api/search`
  - `POST /api/ai/query-parser`
- Foods:
  - `GET /api/foods/search?q=...`
  - `GET /api/foods/logs?date=YYYY-MM-DD`
  - `POST /api/foods/logs`
- Nutrition:
  - `POST /api/nutrition/analyze`
  - `GET /api/nutrition/daily?date=YYYY-MM-DD`
- Optional AI helpers:
  - `POST /api/ai/substitutions`
  - `POST /api/ai/simplify`
  - `POST /api/ai/shopping-list`
- Profile:
  - `GET /api/profile`
  - `PATCH /api/profile`

## Deploy to Vercel

1. Push repository to GitHub.
2. Import repo in Vercel.
3. Set all env vars from `.env.example` in:
   - Development
   - Preview
   - Production
4. In Supabase Auth settings, add Vercel URLs:
   - `https://<your-project>.vercel.app`
   - Preview domain pattern as needed
5. Deploy and test:
   - signup/login flow
   - recipe CRUD
   - food logging
   - explore public visibility

## Production Hardening Checklist

- Add request rate limiting on AI endpoints
- Add robust response validation for AI JSON outputs
- Add centralized logging/observability
- Add error boundaries/loading states
- Add automated integration tests for critical routes

## Bonus Feature Ideas

- Pantry-aware recipe matching
- Grocery list export (CSV/PDF)
- Weekly grocery cost estimation
- Ingredient substitution with allergy awareness
