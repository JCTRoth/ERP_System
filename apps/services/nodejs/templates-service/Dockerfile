FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN chown -R appuser:appgroup /app

EXPOSE 8087

USER appuser
CMD ["npm", "start"]