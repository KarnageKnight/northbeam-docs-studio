FROM node:24.22.2-bookworm-slim AS base
WORKDIR /app
RUN npm install --global pnpm@12.18.0

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild esbuild

FROM dependencies AS build
COPY . .
RUN pnpm run build

FROM dependencies AS production-dependencies
RUN pnpm prune --prod --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts ./
COPY server/db/schema.ts ./server/db/schema.ts
COPY drizzle ./drizzle
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && exec node .output/server/index.mjs"]

FROM build AS test
ENV NODE_ENV=test
CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && node scripts/test-integration.mjs --inside"]
