# syntax=docker/dockerfile:1

# -------------------
# Build stage
# -------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# -------------------
# Production stage
# -------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Generate Prisma client again (in case of different arch)
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]