# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- run ----
FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# runtime needs next + deps
COPY --from=deps /app/node_modules ./node_modules

# app artifacts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.* ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next

EXPOSE 3000
CMD ["npm", "run", "start"]