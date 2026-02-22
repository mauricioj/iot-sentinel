FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install

COPY . .

RUN pnpm --filter @iot/shared build
RUN pnpm --filter @iot/api build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @iot/api db:migrate && pnpm --filter @iot/api start"]
