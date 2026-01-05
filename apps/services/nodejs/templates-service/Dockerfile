FROM node:20-alpine

WORKDIR /app

# Install asciidoctor-pdf via Ruby gems
RUN apk add --no-cache ruby ruby-dev build-base && \
    gem install asciidoctor-pdf

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./
# Use npm install --production to avoid failing when package-lock.json is out of sync in the image build context
RUN npm install --no-audit --no-fund

COPY . .

RUN chown -R appuser:appgroup /app

EXPOSE 8087

USER appuser
CMD ["npm", "start"]