# Checklist de déploiement — Plateforme Services Cameroun

## Prérequis
- Accès au repo GitHub : https://github.com/Big-Ryan/plateforme-services
- Un VPS Hetzner (recommandé : CX21 — 2 vCPU, 4 GB RAM, 40 GB SSD)
- Un nom de domaine pointé vers l'IP du VPS

---

## Étape 1 — Créer le VPS Hetzner

1. Va sur https://hetzner.com et crée un compte
2. Crée un serveur :
    - **Type** : CX21 (~6€/mois)
    - **OS** : Ubuntu 24.04
    - **Région** : Nuremberg ou Helsinki
    - **SSH Key** : ajoute ta clé publique SSH
3. Note l'**IP publique** du serveur

---

## Étape 2 — Configurer le DNS

Chez ton registrar (domaine), crée ces enregistrements DNS :

```
Type  Nom    Valeur
A     @      <IP_VPS>
A     www    <IP_VPS>
```

Attends la propagation DNS (5 min à 24h).

---

## Étape 3 — Préparer le VPS

Connecte-toi en SSH :
```bash
ssh root@<IP_VPS>
```

Installe Docker et Docker Compose :
```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git curl

# Activer Docker au démarrage
systemctl enable docker
systemctl start docker

# Créer le dossier de l'application
mkdir -p /opt/plateforme
```

---

## Étape 4 — Configurer les secrets GitHub

Dans le repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :

| Nom | Valeur |
|-----|--------|
| `VPS_HOST` | IP publique du VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contenu de ta clé privée SSH (`cat ~/.ssh/id_rsa`) |
| `DOMAIN` | Ton domaine (ex: `plateforme.cm`) |

---

## Étape 5 — Déployer l'application sur le VPS

```bash
cd /opt/plateforme

# Cloner le repo
git clone https://github.com/Big-Ryan/plateforme-services.git .

# Créer le fichier .env de production
cp .env.example .env
nano .env
```

Remplis le `.env` avec les vraies valeurs :
```env
POSTGRES_DB=plateforme_db
POSTGRES_USER=relationcl
POSTGRES_PASSWORD=<mot_de_passe_fort>

JWT_SECRET=<générer avec: openssl rand -base64 64>

PAYPAL_CLIENT_ID=<vrai client ID PayPal>
PAYPAL_CLIENT_SECRET=<vrai secret PayPal>
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=<vrai webhook ID>

MINIO_ACCESS_KEY=<clé MinIO>
MINIO_SECRET_KEY=<secret MinIO fort>

MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=<email>
MAIL_PASSWORD=<mot de passe app Gmail>
MAIL_AUTH=true
MAIL_SSL=true
MAIL_STARTTLS=false

ADMIN_PASSWORD=<mot de passe admin fort>
DOMAIN=<ton-domaine.cm>
```

---

## Étape 6 — Configurer Nginx avec ton domaine

```bash
# Remplacer VOTRE_DOMAINE par ton vrai domaine dans nginx.prod.conf
sed -i 's/VOTRE_DOMAINE/ton-domaine.cm/g' nginx/nginx.prod.conf
```

---

## Étape 7 — Obtenir le certificat HTTPS (Certbot)

```bash
# Installer Certbot
apt install -y certbot

# Créer le dossier pour le challenge ACME
mkdir -p /var/www/certbot

# Démarrer Nginx temporairement en HTTP seulement pour valider le domaine
docker compose up -d nginx

# Obtenir le certificat
certbot certonly --webroot -w /var/www/certbot -d ton-domaine.cm -d www.ton-domaine.cm

# Créer le dossier SSL pour Nginx
mkdir -p nginx/ssl
ln -s /etc/letsencrypt nginx/ssl/live
```

---

## Étape 8 — Lancer l'application

```bash
cd /opt/plateforme

# Se connecter au registry GitHub
echo "<GITHUB_TOKEN>" | docker login ghcr.io -u big-ryan --password-stdin

# Lancer tous les services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Vérifier que tout tourne
docker compose ps
docker compose logs backend --tail=50
```

---

## Étape 9 — Vérifier que tout fonctionne

```bash
# Health check backend
curl https://ton-domaine.cm/api/actuator/health

# Voir les logs en temps réel
docker compose logs -f backend
```

---

## Étape 10 — Renouvellement automatique SSL

```bash
# Ajouter un cron pour renouveler le certificat automatiquement
crontab -e

# Ajouter cette ligne :
0 3 * * * certbot renew --quiet && docker compose -f /opt/plateforme/docker-compose.yml restart nginx
```

---

## Déploiements futurs

Une fois tout configuré, chaque `git push` sur `main` :
1. Lance les tests automatiquement
2. Build les images Docker
3. Les pousse sur GHCR
4. **Déploie automatiquement sur le VPS** ✓

Plus besoin de se connecter en SSH manuellement.

---

## En cas de problème

```bash
# Voir tous les logs
docker compose logs

# Redémarrer un service
docker compose restart backend

# Voir l'utilisation des ressources
docker stats

# Rollback vers la version précédente
docker compose pull && docker compose up -d
```