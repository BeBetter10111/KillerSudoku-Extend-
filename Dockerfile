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
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:17-jre
RUN groupadd --system sudoku && useradd --system --gid sudoku --no-create-home sudoku
WORKDIR /app
COPY --from=build /build/target/killer-sudoku-backend-*.jar /app/app.jar
USER sudoku
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
