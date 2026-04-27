# Dockerfile — Frontend Angular 17
# Stage 1 : build ng build --configuration production
# Stage 2 : nginx pour servir les fichiers statiques

# Stage 1 : Build
FROM node:20-alpine AS builder

WORKDIR /app

# Cache des dépendances npm
COPY package*.json ./
RUN npm ci --prefer-offline

# Build production
COPY . .
RUN npm run build -- --configuration production

# Stage 2 : Nginx
FROM nginx:alpine AS runtime

# Copie la config Nginx personnalisée (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie le build Angular
COPY --from=builder /app/dist/plateforme-frontend/browser /usr/share/nginx/html

# Permissions correctes
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
