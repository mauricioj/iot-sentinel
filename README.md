# iot-sentinel

Monorepo Docker-first para gerenciamento e descoberta de dispositivos IoT.

## Stack

- `apps/api`: Node.js + TypeScript + Fastify + Sequelize + Postgres + Yup + JWT
- `apps/worker`: Node.js + TypeScript + node-cron
- `apps/web`: React + Vite + TypeScript + React Router + TanStack Query
- `packages/shared`: tipos e helpers compartilhados

## Quickstart

1. Copie variaveis de ambiente:

```bash
cp .env.example .env
```

2. Suba tudo com Docker:

```bash
docker compose up -d --build
```

3. Acesse:

- Web: `http://localhost:5173`
- API: `http://localhost:3000/health`

4. Login inicial:

- Email: valor de `ADMIN_EMAIL` no `.env`
- Senha: valor de `ADMIN_PASSWORD` no `.env`

## Comandos uteis

- `pnpm -r dev`: desenvolvimento local opcional
- `pnpm --filter @iot/api db:migrate`: roda migrations
- `pnpm --filter @iot/api build`
- `pnpm --filter @iot/worker build`
- `pnpm --filter @iot/web build`
