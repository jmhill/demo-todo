
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy only package files first for better caching

# Root workspace files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy all package.json files from workspace
# This preserves workspace structure while only copying package files
COPY apps/todo-api/package*.json ./apps/todo-api/
COPY apps/todo-api/tsconfig*.json ./apps/todo-api/

# Once we have shared code in other workspaces, add them:
# COPY packages/shared/package*.json ./packages/shared/
# COPY packages/shared/tsconfig*.json ./packages/shared/

# Install ALL dependencies (workspace-aware)
# This layer is cached unless package.json files change
RUN npm ci

# NOW copy source code (this changes frequently)
# COPY packages/shared/src ./packages/shared/src
COPY apps/todo-api/src ./apps/todo-api/src

# Build everything
RUN npm run build --workspaces

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY apps/todo-api/package*.json ./apps/todo-api/
# COPY packages/shared/package*.json ./packages/shared/

# Install only production dependencies
# This is also cached unless package.json changes
RUN npm ci --omit=dev

# Copy only the built output from builder
COPY --from=builder /app/apps/todo-api/dist ./apps/todo-api/dist
# COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/todo-api

EXPOSE 3000
CMD ["node", "dist/main.js"]
