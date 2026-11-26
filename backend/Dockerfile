# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml settings.xml ./
RUN mvn -B -q -s settings.xml dependency:go-offline
COPY src ./src
RUN mvn -B -q -s settings.xml -DskipTests package

FROM eclipse-temurin:17-jre
RUN groupadd --system sudoku && useradd --system --gid sudoku --no-create-home sudoku
WORKDIR /app
COPY --from=build /build/target/killer-sudoku-backend-*.jar /app/app.jar
USER sudoku
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
