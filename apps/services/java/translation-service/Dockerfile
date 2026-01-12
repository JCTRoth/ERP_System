# Build stage - using Gradle with JDK 21
FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY . .
RUN if ls build/libs/*.jar 1> /dev/null 2>&1; then \
        echo "JAR already exists, skipping build"; \
    elif [ -f gradlew ]; then \
        chmod +x gradlew && ./gradlew bootJar --no-daemon; \
    else \
        gradle bootJar --no-daemon; \
    fi

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy JAR file
COPY --from=build /app/build/libs/translation-service-*.jar ./

# Switch to non-root user
USER appuser

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "translation-service-0.1.0.jar"]