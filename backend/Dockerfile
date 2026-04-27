# Dockerfile — Backend Spring Boot (Java 17)
# Multi-stage build : builder + image runtime minimale

# Stage 1 : Build Maven
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copie le pom.xml en premier pour profiter du cache des dépendances
COPY pom.xml .
RUN mvn dependency:go-offline -B 2>/dev/null || true

# Si Maven n'est pas dans l'image, on l'installe
RUN apk add --no-cache maven

# Re-download with Maven available
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copie les sources et compile
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2 : Runtime JRE minimal
FROM eclipse-temurin:17-jre-alpine AS runtime

# Sécurité : utilisateur non-root
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Copie uniquement le JAR final
COPY --from=builder /app/target/*.jar app.jar

# Répertoire pour les fichiers temporaires
RUN mkdir -p /app/tmp && chown spring:spring /app/tmp

USER spring:spring

# Port exposé
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Options JVM optimisées pour les conteneurs
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}", \
    "-jar", "app.jar"]
