# Model Escape web platform

Next.js 16, React 19, TypeScript, PostgreSQL and Drizzle. Includes event booking, host and admin workspaces, member portfolios, account settings, profile credits, and activity statistics.

## Local development

Requires Docker Desktop, or Node.js 22.13+ and PostgreSQL 17.

1. Copy `.env.example` to `.env` and configure private environment values.
2. Start the local database and test inbox: `docker compose up -d database mailpit`.
3. Build and start the application: `docker compose up -d --build application`.
4. Open http://localhost:3000. The local test inbox is http://localhost:8025.

Migrations run through the Docker entrypoint. With a host Node.js installation, use `npm ci`, `npm run db:migrate`, and `npm run build` / `npm start`.

This repository contains application source and public design assets. It does not contain the working environment file, database records, private identity uploads, exported account files, or login credentials. A fresh database will be empty.

## Existing installations

Set POSTGRES_PASSWORD and MONITOR_SECRET to private random values in .env before starting Compose. Direct database tools need DATABASE_URL configured privately. Optional seed and smoke scripts require private SEED_PASSWORD and TEST_PASSWORD values.

Preserve existing data and encryption keys. Never run the legacy `db:seed` script on a restored or live database: it changes demonstration accounts and passwords. Database backups and credentials must remain outside Git.

Background workers are intentionally not started by the local startup commands. Review account lifecycle and email behavior before enabling them.

## Hosting preparation

Deploy as a Node.js application with PostgreSQL, private environment variables, working SMTP, HTTPS and persistent media storage. Keep uploads separate from deployment artifacts. Run migrations without seeding existing data.

Payments and profile credits currently require Stripe test mode. This repository does not enable live charging. Instagram profile-photo authorization requires a configured Meta app; see `INSTAGRAM-SETUP.md`.

The generated imagery under `public/images/demo-members` depicts fictional demo people and brands. Demo account records and their login details are not included.

## Validation

`npm run build` performs the production build and TypeScript checks. Tests are under `tests/`; some historical infrastructure checks describe earlier interface behavior.
