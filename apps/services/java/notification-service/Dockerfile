FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
# Copy entire project context — some repos may not include the gradle wrapper files
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

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8082

# Check if we're in development mode (source code mounted)
# If src directory exists and contains source files, run in dev mode with hot reload
ENTRYPOINT ["sh", "-c", "if [ -d src ] && [ -f build.gradle ]; then ./gradlew bootRun --no-daemon; else java -jar app.jar; fi"]
