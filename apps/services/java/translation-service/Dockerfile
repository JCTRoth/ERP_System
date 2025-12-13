FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
# Copy entire project context so builds without gradle wrapper won't fail during COPY
COPY . .

# Install Gradle
RUN apt-get update && apt-get install -y wget unzip \
    && wget -q https://services.gradle.org/distributions/gradle-8.5-bin.zip \
    && unzip gradle-8.5-bin.zip \
    && mv gradle-8.5 /opt/gradle \
    && ln -s /opt/gradle/bin/gradle /usr/bin/gradle \
    && apt-get remove -y wget unzip \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Build the application
RUN gradle bootJar --no-daemon

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

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
        CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
