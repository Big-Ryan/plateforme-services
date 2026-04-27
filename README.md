# Plateforme Services Cameroun

Plateforme web de mise en relation entre **prestataires** et **clients**. Les prestataires publient leurs services après souscription à un abonnement PayPal. Les clients peuvent contacter les prestataires directement ou sans compte.

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Backend | Spring Boot + Java | 17 / 3.2.5 |
| Frontend | Angular + Material | 17 / Node 20 |
| Base de données | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Stockage fichiers | MinIO | Latest |
| Paiements | PayPal Subscriptions API | v1 |
| Conteneurisation | Docker + Compose | — |

---

## Prérequis

Installe ces outils avant de commencer :

| Outil | Version | Lien |
|---|---|---|
| Java JDK | 17 | https://adoptium.net |
| Maven | 3.9+ | https://maven.apache.org |
| Node.js | 20 LTS | https://nodejs.org |
| Angular CLI | 17 | `npm install -g @angular/cli@17` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Git | Latest | https://git-scm.com |

---

## Installation et démarrage

### 1. Cloner le dépôt

```bash
git clone https://github.com/TON_USERNAME/plateforme-services.git
cd plateforme-services
```

### 2. Démarrer les services Docker (PostgreSQL, Redis, MinIO)

```bash
docker compose up -d postgres redis minio
```

Attendre ~10 secondes que les services démarrent.

### 3. Configurer le backend dans IntelliJ

Ouvre le dossier `backend/` dans IntelliJ IDEA.

Dans **Run → Edit Configurations**, ajoute ces variables d'environnement :

```
SPRING_DATASOURCE_PASSWORD=postgres123
JWT_SECRET=<générer avec : openssl rand -base64 64>
PAYPAL_CLIENT_ID=<ton client ID sandbox PayPal>
PAYPAL_CLIENT_SECRET=<ton secret sandbox PayPal>
PAYPAL_WEBHOOK_ID=<ton webhook ID sandbox PayPal>
PAYPAL_MODE=sandbox
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=<ton email Gmail>
MAIL_PASSWORD=<mot de passe application Gmail 16 chars>
MAIL_AUTH=true
MAIL_SSL=true
MAIL_STARTTLS=false
```

Lance le backend : `PlateformeApplication.java` → Run

Le backend démarre sur **http://localhost:8080**  
Les migrations Flyway (V1 → V5) s'exécutent automatiquement.

### 4. Démarrer le frontend

```bash
cd frontend
npm install
ng serve
```

Frontend disponible sur **http://localhost:4200**

### 5. Compte admin par défaut

```
Email    : admin@plateforme.cm
Password : Admin@2024!
```

> ⚠️ Changer ce mot de passe immédiatement en production.

---

## URLs de développement

| Service | URL |
|---|---|
| Frontend Angular | http://localhost:4200 |
| API Backend | http://localhost:8080 |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin123) |
| PostgreSQL | localhost:5432 (postgres / postgres123) |
| Redis | localhost:6379 |

---

## Configuration PayPal (sandbox)

1. Créer un compte sur https://developer.paypal.com
2. **Apps & Credentials** → Create App → récupérer `Client ID` et `Secret`
3. Créer un webhook pointant vers ton URL ngrok + `/api/payments/paypal/webhook`
4. Activer l'événement `BILLING.SUBSCRIPTION.ACTIVATED`
5. Créer les 3 plans de billing (mensuel / trimestriel / annuel) via l'API PayPal
6. Mettre à jour la base avec les IDs des plans :

```sql
UPDATE subscription_plans SET paypal_plan_id = 'P-XXX' WHERE name = 'Mensuel';
UPDATE subscription_plans SET paypal_plan_id = 'P-XXX' WHERE name = 'Trimestriel';
UPDATE subscription_plans SET paypal_plan_id = 'P-XXX' WHERE name = 'Annuel';
```

Pour les webhooks en local, utiliser ngrok :
```bash
ngrok http 8080
# Copier l'URL HTTPS dans le webhook PayPal
```

---

## Structure du projet

```
plateforme/
├── backend/                    # Spring Boot (Java 17)
│   ├── src/main/java/com/plateforme/
│   │   ├── auth/               # JWT, refresh tokens, sécurité
│   │   ├── users/              # Profils client et prestataire
│   │   ├── catalogue/          # Services, catégories, recherche
│   │   ├── subscription/       # Plans, abonnements PayPal
│   │   ├── payment/            # Webhooks PayPal
│   │   ├── negotiation/        # Messagerie interne
│   │   ├── review/             # Système de notation
│   │   ├── referral/           # Programme de parrainage
│   │   ├── admin/              # Back-office
│   │   └── common/             # Config, exceptions, MinIO
│   └── src/main/resources/
│       └── db/migration/       # Migrations Flyway V1 → V5
│
├── frontend/                   # Angular 17
│   └── src/app/
│       ├── core/               # Services, guards, modèles
│       ├── shared/             # Composants réutilisables
│       └── features/           # Modules lazy-loaded
│           ├── auth/
│           ├── catalogue/
│           ├── provider/
│           ├── client/
│           └── admin/
│
├── nginx/                      # Config Nginx prod
├── scripts/                    # Scripts utilitaires
├── docker-compose.yml
└── .env.example
```

---

## Fonctionnalités implémentées

- ✅ Authentification JWT (register, login, refresh, logout)
- ✅ Catalogue avec recherche et filtres
- ✅ CRUD services prestataires + upload photos/logo (MinIO)
- ✅ Abonnements PayPal (mensuel, trimestriel, annuel) avec période d'essai 7 jours
- ✅ Webhooks PayPal → activation automatique
- ✅ Messagerie interne / négociations
- ✅ Système de notation et avis clients
- ✅ Programme de parrainage avec paliers de récompenses
- ✅ Dashboard prestataire, client, admin
- ✅ Envoi d'emails (Gmail SMTP)

---

## Variables d'environnement obligatoires

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_PASSWORD` | Mot de passe PostgreSQL |
| `JWT_SECRET` | Secret HMAC-SHA256 (base64, min 64 chars) |
| `PAYPAL_CLIENT_ID` | Client ID PayPal |
| `PAYPAL_CLIENT_SECRET` | Secret PayPal |
| `PAYPAL_WEBHOOK_ID` | ID du webhook PayPal |
| `MINIO_ACCESS_KEY` | Clé MinIO |
| `MINIO_SECRET_KEY` | Secret MinIO (min 8 chars) |
| `MAIL_USERNAME` | Adresse Gmail |
| `MAIL_PASSWORD` | Mot de passe application Gmail |

---

## Déploiement en production (VPS Hetzner)

```bash
# Sur le VPS Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

git clone https://github.com/TON_USERNAME/plateforme-services.git
cd plateforme-services
cp .env.example .env
# Remplir .env avec les valeurs de production

docker compose up -d
```

HTTPS via Certbot (Let's Encrypt) — voir `/nginx/` pour la config.

---

## Licence

Propriétaire — Tous droits réservés.