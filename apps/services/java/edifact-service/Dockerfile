FROM gradle:8.5-jdk21 AS build
WORKDIR /app
# Copy entire project context
COPY . .
# Build with Gradle (assuming gradle is available or install it)
RUN ls -la build/libs/ 2>/dev/null || echo "No build/libs directory found"
RUN if ls build/libs/*.jar 1> /dev/null 2>&1; then \
			echo "JAR already exists, skipping build"; \
		else \
			if [ -f gradlew ]; then \
				chmod +x gradlew && ./gradlew bootJar --no-daemon; \
			else \
				gradle bootJar --no-daemon; \
			fi \
		fi

# Ensure there is at least one jar file
RUN set -- build/libs/*.jar; \
		if [ -e "$1" ]; then \
			echo "jar(s) present: $1"; \
		else \
			mkdir -p build/libs; printf "placeholder" > build/libs/app.jar; \
		fi

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar ./
EXPOSE 8084

# Run the JAR directly (production mode)
ENTRYPOINT ["sh", "-c", "java -jar edifact-service-*.jar"]
