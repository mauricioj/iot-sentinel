FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json

RUN pnpm install

COPY . .
RUN pnpm --filter @iot/web build

EXPOSE 5173
CMD ["pnpm", "--filter", "@iot/web", "start"]
