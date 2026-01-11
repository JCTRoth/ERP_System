FROM gradle:8.5-jdk21 AS build
WORKDIR /app
# Copy entire project context
COPY . .
# Skip gradle build in container - we'll use pre-built JAR
RUN ls -la build/libs/ 2>/dev/null || echo "No build/libs directory found"
RUN mkdir -p build/libs && \
    if ls build/libs/notification-service-*.jar 1> /dev/null 2>&1; then \
        echo "Using pre-built JAR"; \
    else \
        echo "Pre-built JAR not found, attempting gradle build..."; \
        if [ -f gradlew ]; then \
            chmod +x gradlew && ./gradlew bootJar --no-daemon; \
        else \
            gradle bootJar --no-daemon; \
        fi \
    fi

# Ensure there is at least one jar file  
RUN set -- build/libs/notification-service-*.jar; \
		if [ -e "$1" ]; then \
			echo "jar(s) present: $1"; \
		else \
			echo "ERROR: No JAR file found"; \
			ls -la build/; \
		fi

FROM eclipse-temurin:21-jre
# Use a different directory for the JAR to avoid volume mount conflicts
WORKDIR /opt/app
# Copy the executable JAR (not the -plain version)
COPY --from=build /app/build/libs/notification-service-1.0.0.jar app.jar
EXPOSE 8082

# Just run the JAR directly
ENTRYPOINT ["java", "-jar", "app.jar"]
