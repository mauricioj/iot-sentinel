FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

RUN pnpm install --prod=false
RUN pnpm --filter @iot/web build

EXPOSE 5173
CMD ["pnpm", "--filter", "@iot/web", "start"]
