FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY . .
RUN if [ -f gradlew ]; then \
        chmod +x gradlew && ./gradlew bootJar --no-daemon; \
    else \
        gradle bootJar --no-daemon; \
    fi

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar ./
EXPOSE 8083

ENTRYPOINT ["sh", "-c", "java -jar *.jar"]
