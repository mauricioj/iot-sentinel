FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

RUN pnpm install --prod=false
RUN pnpm --filter @iot/worker build

CMD ["pnpm", "--filter", "@iot/worker", "start"]
