FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY . .
RUN set -eu; \
    if ls build/libs/*.jar 1> /dev/null 2>&1; then \
        echo "JAR already exists, skipping build"; \
    else \
        gradle bootJar --no-daemon; \
    fi; \
    jar_path="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | head -n1)"; \
    if [ -z "$jar_path" ]; then \
        echo "No executable Spring Boot jar found in build/libs" >&2; \
        exit 1; \
    fi; \
    cp "$jar_path" /tmp/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /tmp/app.jar ./app.jar
EXPOSE 8084

ENTRYPOINT ["java", "-jar", "app.jar"]
