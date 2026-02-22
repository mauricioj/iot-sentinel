FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json

RUN pnpm install

COPY . .
RUN pnpm --filter @iot/worker build

CMD ["pnpm", "--filter", "@iot/worker", "start"]
