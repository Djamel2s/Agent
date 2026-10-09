FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @agent/admin build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
