FROM node:20-alpine

WORKDIR /app

# Install asciidoctor-pdf via Ruby gems with required system dependencies
RUN apk add --no-cache ruby ruby-dev build-base fontconfig freetype harfbuzz cairo pango gdk-pixbuf librsvg ttf-dejavu ttf-liberation && \
    gem install --no-document asciidoctor-pdf

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./

# Install Node dependencies with increased memory and simplified flags
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm ci --only=production --no-audit --no-fund --prefer-offline

COPY . .

RUN chown -R appuser:appgroup /app

EXPOSE 8087

USER appuser
CMD ["npm", "start"]