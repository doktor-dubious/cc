# syntax=docker/dockerfile:1

# -------------------
# Build stage
# -------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy everything including node_modules from host
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app (standalone output)
RUN npm run build

# -------------------
# Production stage
# -------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and full node_modules for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy i18n message files (required at runtime by next-intl)
COPY --from=builder /app/messages ./messages

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
