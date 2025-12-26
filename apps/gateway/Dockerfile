FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN chown -R appuser:appgroup /app

# USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]
