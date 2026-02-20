# Deployment Guide

This guide covers three production-ready deployment styles:
1. Backend with PM2
2. Frontend + API reverse proxy with Nginx
3. Full stack with Docker Compose (Nginx + Backend + MySQL)

## Prerequisites
- Linux server (Ubuntu 22.04+ recommended)
- Node.js 20+
- MySQL 8+ (for PM2/Nginx path) or Docker (for full-stack path)
- Domain name pointed to your server

## A) PM2 + Nginx (Traditional VPS)

### 1) Prepare project directories
```bash
sudo mkdir -p /var/www/soho
sudo chown -R $USER:$USER /var/www/soho
cd /var/www/soho
```

Copy repository files to `/var/www/soho`.

### 2) Backend setup
```bash
cd /var/www/soho/backend
npm ci --omit=dev
cp .env.example .env
```

Edit `backend/.env` for production values.

Apply schema (once):
```bash
mysql -u <db_user> -p <db_name> < /var/www/soho/backend/src/migration/schema.sql
```

### 3) Frontend build
```bash
cd /var/www/soho/frontend
npm ci
npm run build
```

### 4) PM2 process manager
Install PM2 globally:
```bash
sudo npm i -g pm2
```

Use template file:
- `deploy/pm2/ecosystem.config.cjs`

Start app:
```bash
pm2 start /var/www/soho/deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5) Nginx reverse proxy + static hosting
Use template:
- `deploy/nginx/soho.conf`

Install and activate:
```bash
sudo apt update && sudo apt install -y nginx
sudo cp /var/www/soho/deploy/nginx/soho.conf /etc/nginx/sites-available/soho.conf
sudo ln -s /etc/nginx/sites-available/soho.conf /etc/nginx/sites-enabled/soho.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 6) HTTPS with Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d soho.example.com
```

## B) Full Stack with Docker Compose

Files provided:
- `deploy/docker/docker-compose.prod.yml`
- `deploy/docker/backend.Dockerfile`
- `deploy/docker/nginx.Dockerfile`
- `deploy/docker/nginx.conf`
- `deploy/docker/.env.prod.example`

### 1) Prepare environment file
```bash
cd /var/www/soho/deploy/docker
cp .env.prod.example .env.prod
```

Set strong values in `.env.prod`.

### 2) Build and run
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### 3) Verify services
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### 4) Access
- App: `http://<server-ip>/`
- Health: `http://<server-ip>/health`

## Operational Commands
### PM2
```bash
pm2 list
pm2 logs soho-backend
pm2 restart soho-backend
```

### Docker
```bash
docker compose -f deploy/docker/docker-compose.prod.yml ps
docker compose -f deploy/docker/docker-compose.prod.yml logs -f backend
docker compose -f deploy/docker/docker-compose.prod.yml restart backend
```

## Production Hardening Checklist
- Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Restrict DB credentials and permissions
- Use HTTPS only
- Lock server firewall ports (80/443 and SSH only)
- Back up MySQL data regularly
- Add centralized logs/monitoring
- Add rate limiting in backend for auth endpoints
