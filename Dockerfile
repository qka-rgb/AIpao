# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
