FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

RUN pnpm install --prod=false

RUN pnpm --filter @iot/shared build
RUN pnpm --filter @iot/api build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @iot/api db:migrate && pnpm --filter @iot/api start"]
