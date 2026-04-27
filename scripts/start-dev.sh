#!/usr/bin/env bash
# ============================================================
# scripts/start-dev.sh — Démarre l'environnement de développement
# Usage : ./scripts/start-dev.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Vérifications préalables

info "Vérification des prérequis..."

command -v docker    >/dev/null 2>&1 || error "Docker n'est pas installé"
command -v docker compose >/dev/null 2>&1 || error "Docker Compose n'est pas disponible"

if [ ! -f ".env" ]; then
    warning "Fichier .env manquant — copie de .env.example..."
    cp .env.example .env
    warning "⚠️  Remplis les valeurs dans .env avant de continuer !"
    echo ""
    echo "Variables OBLIGATOIRES à renseigner :"
    echo "  DB_PASSWORD, JWT_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET"
    echo ""
    read -p "Appuie sur Entrée quand .env est prêt..." _
fi

# Vérifie que JWT_SECRET est défini
source .env
if [[ -z "${JWT_SECRET:-}" || "$JWT_SECRET" == "CHANGE_ME"* ]]; then
    error "JWT_SECRET n'est pas configuré dans .env !\nGénère-le avec : openssl rand -base64 64"
fi

# Démarrage des services d'infrastructure

info "Démarrage PostgreSQL, Redis, MinIO..."
docker compose up -d postgres redis minio

info "Attente que PostgreSQL soit prêt..."
timeout 60 bash -c 'until docker compose exec -T postgres pg_isready -U ${DB_USER:-plateforme_user} > /dev/null 2>&1; do sleep 2; done'
info "PostgreSQL prêt ✓"

info "Attente que Redis soit prêt..."
timeout 30 bash -c 'until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do sleep 2; done'
info "Redis prêt ✓"

# Build et démarrage du backend

info "Build du backend Spring Boot (peut prendre 2-3 min la première fois)..."
docker compose up -d --build backend

info "Attente que le backend soit prêt..."
timeout 120 bash -c 'until wget -qO- http://localhost:8080/actuator/health > /dev/null 2>&1; do sleep 5; done'
info "Backend prêt ✓"

# Résumé

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Environnement de développement démarré !${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  🔗 API Backend  : http://localhost:8080"
echo "  📖 Swagger UI   : http://localhost:8080/swagger-ui.html"
echo "  🗄️  PostgreSQL   : localhost:5432"
echo "  ⚡ Redis         : localhost:6379"
echo "  📦 MinIO Console : http://localhost:9001"
echo ""
echo -e "${YELLOW}Pour le frontend Angular :${NC}"
echo "  cd frontend && npm install && ng serve"
echo ""
echo "Logs backend : docker compose logs -f backend"
echo ""
