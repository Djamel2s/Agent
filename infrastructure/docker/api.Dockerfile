FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @agent/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/api/dist ./dist
COPY --from=build /repo/services/api/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts fastify @fastify/cors @fastify/helmet @fastify/rate-limit zod
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
