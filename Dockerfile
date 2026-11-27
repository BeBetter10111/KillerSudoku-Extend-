# syntax=docker/dockerfile:1
# Single image for Render: React build is served by the Spring Boot backend.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY backend/pom.xml backend/settings.xml ./
RUN mvn -B -q -s settings.xml dependency:go-offline
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -B -q -s settings.xml -DskipTests package

FROM eclipse-temurin:17-jre
RUN groupadd --system sudoku && useradd --system --gid sudoku --no-create-home sudoku
WORKDIR /app
COPY --from=build /build/target/killer-sudoku-backend-*.jar /app/app.jar
RUN mkdir -p /app/data && chown sudoku:sudoku /app/data
USER sudoku
# Tuned for Render free tier (512MB RAM, shared CPU): small heap, serial GC, fast JIT warm-up,
# lazy bean/JPA-repository init so the HTTP port opens quickly.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k -XX:MaxMetaspaceSize=160m"     SPRING_MAIN_LAZY_INITIALIZATION=true     SPRING_DATA_JPA_REPOSITORIES_BOOTSTRAP_MODE=lazy
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
