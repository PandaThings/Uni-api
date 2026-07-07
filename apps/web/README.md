# Uni AI Web

First-party web chat experience for Uni AI.

## Local Database

Start the local PostgreSQL database with pgvector:

```bash
docker compose -f docker-compose.local.yml up -d db
```

Use this local database URL in your root `.env`:

```bash
DATABASE_URL="postgresql://uniai:uniai_local_password@localhost:55432/uniai_local?schema=public"
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

Push the Prisma schema into the local database:

```bash
pnpm --filter @uniai/database run db:push
```

## Development

```bash
pnpm --filter web dev
```

The app runs on `http://localhost:3001`.
