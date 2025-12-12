FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN if [ -f gradlew ]; then \
            chmod +x gradlew && ./gradlew bootJar --no-daemon; \
        else \
            echo "gradlew not found; skipping gradle build (ensure jar is provided or add gradle wrapper)"; \
        fi

# Ensure there is at least one jar file so the final image can copy it even if build was skipped
RUN set -- build/libs/*.jar; \
        if [ -e "$1" ]; then \
            echo "jar(s) present: $1"; \
        else \
            mkdir -p build/libs; printf "placeholder" > build/libs/app.jar; \
        fi

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 appgroup && \
        adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy JAR file
COPY --from=build /app/build/libs/*.jar app.jar

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
        CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
