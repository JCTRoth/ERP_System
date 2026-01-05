FROM node:20-alpine

WORKDIR /app

# Install asciidoctor-pdf via Ruby gems
RUN apk add --no-cache ruby ruby-dev build-base && \
    gem install asciidoctor-pdf

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./
# Install Node dependencies before copying source to leverage Docker layer caching.
# Prefer `npm ci` for reproducible builds when package-lock.json is present,
# otherwise fall back to `npm install` to remain tolerant in development.
RUN if [ -f package-lock.json ]; then \
            npm ci --only=production --no-audit --no-fund; \
        else \
            npm install --no-audit --no-fund; \
        fi

COPY . .

RUN chown -R appuser:appgroup /app

EXPOSE 8087

USER appuser
CMD ["npm", "start"]