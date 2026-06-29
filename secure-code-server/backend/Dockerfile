FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production environment
FROM node:20-slim AS runner

WORKDIR /app

# Install native compilation dependencies for node-pty and other native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install latest Docker CLI to prevent "client version is too old" errors from the host daemon
COPY --from=docker:latest /usr/local/bin/docker /usr/bin/docker

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
# node-pty will be compiled during this step
RUN npm ci --only=production

# Copy compiled build from builder
COPY --from=builder /app/dist ./dist

# Create a user for general security, but we must run as root to access /var/run/docker.sock cleanly
RUN groupadd -r nestjs && useradd -r -g nestjs nestjs
RUN mkdir -p /workspaces /sessions /backups && chown nestjs:nestjs /workspaces /sessions /backups
USER root

EXPOSE 3001

CMD ["node", "dist/main"]
