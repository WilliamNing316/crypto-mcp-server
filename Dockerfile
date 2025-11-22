# Multi-stage build for crypto-mcp-server
FROM node:20-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081
ENV MCP_TRANSPORT=http

# Expose port (Smithery uses 8081)
EXPOSE 8081

# Run the MCP server
CMD ["node", "dist/server.js"]

