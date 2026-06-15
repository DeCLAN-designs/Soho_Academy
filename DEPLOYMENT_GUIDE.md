# Deployment & Setup Guide

## Prerequisites

### Backend Requirements
- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

### Frontend Requirements
- Node.js 16+
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

---

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create or update `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=soho_transport

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here

# Frontend
FRONTEND_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# R2 (Cloudflare, optional)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

### 3. Initialize Database
```bash
# Option 1: Using existing schema files (recommended)
mysql -u root -p soho_transport < src/migration/schema.sql

# Option 2: Apply migration for fuel maintenance confirmation
mysql -u root -p soho_transport < src/migration/migration_001_fuel_maintenance_dynamic_confirmation.sql
```

### 4. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 5. Start Production Server
```bash
npm start
# Server runs on PORT specified in .env
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create or update `.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Soho Transport Management
```

### 3. Start Development Server
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Build for Production
```bash
npm run build
# Output goes to dist/ directory
```

### 5. Preview Production Build
```bash
npm run preview
# Preview runs on http://localhost:4173
```

---

## Docker Setup (Optional)

### Build and Run with Docker Compose
```bash
# Navigate to project root
cd Soho

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Compose Services
- **Backend:** Port 5000
- **Frontend:** Port 5173
- **MySQL:** Port 3306

---

## Database Migration Guide

### Apply New Migrations

#### Migration: Dynamic Fuel Confirmation (Already Created)
```bash
# Ensure backup first
mysqldump -u root -p soho_transport > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migration
mysql -u root -p soho_transport < src/migration/migration_001_fuel_maintenance_dynamic_confirmation.sql
```

### Verify Migration Success
```bash
mysql -u root -p soho_transport -e "
  DESCRIBE fuel_maintenance_requests;
" | grep -E "confirmedByUserId|confirmationStatus|confirmedAt"
```

Expected output:
```
confirmedByUserId    int(11)    YES    MUL    NULL
confirmationStatus   varchar    NO          PENDING
confirmedAt          timestamp  YES        NULL
```

---

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
DEBUG=true
DB_LOGGING=true
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=dev_secret_change_in_production
```

### Staging
```env
NODE_ENV=staging
DEBUG=false
DB_LOGGING=false
FRONTEND_ORIGIN=https://staging.soho.com
JWT_SECRET=staging_secret_key
SSL_CERTIFICATE=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

### Production
```env
NODE_ENV=production
DEBUG=false
DB_LOGGING=false
FRONTEND_ORIGIN=https://soho.com
JWT_SECRET=production_secret_key_very_long_and_random
SSL_CERTIFICATE=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
DB_POOL_SIZE=20
```

---

## Deployment Checklist

### Before Deployment

- [ ] All tests pass (`npm test`)
- [ ] Code linting passes (`npm run lint`)
- [ ] No console errors in browser dev tools
- [ ] Environment variables configured correctly
- [ ] Database backup created
- [ ] Migration tested in staging
- [ ] All new endpoints tested with cURL/Postman
- [ ] UI responsive tested on mobile/tablet
- [ ] Authentication and authorization verified
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Load balancer configured (if applicable)

### Database Pre-Deployment

```bash
# 1. Backup database
mysqldump -u root -p soho_transport > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup integrity
mysql -u root -p < backup_*.sql --dry-run

# 3. Create test database
CREATE DATABASE soho_transport_test;

# 4. Restore to test database
mysql -u root -p soho_transport_test < backup_*.sql

# 5. Run migrations on test database
mysql -u root -p soho_transport_test < src/migration/migration_001_fuel_maintenance_dynamic_confirmation.sql

# 6. Verify test database
mysql -u root -p soho_transport_test -e "SELECT COUNT(*) FROM fuel_maintenance_requests;"
```

### Deployment Steps

#### Backend Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run migrations
npm run migrate

# 4. Start with process manager (PM2)
pm2 start ecosystem.config.cjs --env production

# 5. Verify deployment
curl http://localhost:5000/health

# 6. Check logs
pm2 logs
```

#### Frontend Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Copy to web server
cp -r dist/* /var/www/html/

# 5. Restart web server (nginx/apache)
sudo systemctl restart nginx
# or
sudo systemctl restart apache2
```

---

## Rollback Procedure

If deployment fails:

### Database Rollback
```bash
# 1. Stop application
pm2 stop all

# 2. Restore backup
mysql -u root -p soho_transport < backup_YYYYMMDD_HHMMSS.sql

# 3. Restart application
pm2 start all

# 4. Verify
curl http://localhost:5000/health
```

### Code Rollback
```bash
# 1. Revert to previous commit
git revert <commit-hash>

# 2. Reinstall and rebuild
npm install
npm run build

# 3. Restart services
pm2 restart all
```

---

## Monitoring & Logs

### Backend Logs
```bash
# Using PM2
pm2 logs

# Direct logs (Linux)
tail -f /var/log/soho-transport/app.log

# Docker logs
docker-compose logs -f backend
```

### Frontend Logs
Check browser console (F12) for client-side errors

### Database Logs
```bash
# MySQL general log
mysql -u root -p -e "SET GLOBAL general_log = 'ON';"

# View slow queries
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

---

## Health Checks

### Backend Health Check
```bash
# Should return 200 with {"status": "OK"}
curl http://localhost:5000/health
```

### Database Health Check
```bash
# Direct connection test
mysql -u root -p -e "SELECT 1;"

# Via backend
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/fuel-maintenance/all \
  -s | jq '.success'
# Should return true
```

### Frontend Health Check
Open browser: http://localhost:5173
- Should load without errors
- Check browser console (F12)
- Test user login

---

## Performance Optimization

### Database Optimization
```bash
# Analyze tables
ANALYZE TABLE fuel_maintenance_requests;
ANALYZE TABLE users;
ANALYZE TABLE audit_logs;

# Optimize tables
OPTIMIZE TABLE fuel_maintenance_requests;
OPTIMIZE TABLE users;
OPTIMIZE TABLE audit_logs;

# Check indexes
SHOW INDEX FROM fuel_maintenance_requests;
```

### Backend Optimization
- Enable gzip compression
- Implement Redis caching
- Use connection pooling (already configured)
- Enable query optimization

### Frontend Optimization
- Run bundle analysis: `npm run build:analyze`
- Implement code splitting
- Lazy load routes
- Optimize images
- Enable browser caching

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
Solution:
```bash
# Check MySQL is running
sudo systemctl status mysql

# Start MySQL if stopped
sudo systemctl start mysql

# Verify credentials in .env
mysql -u root -p -e "SELECT 1;"
```

**2. Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
Solution:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

**3. Migration Fails**
```
Error: Table 'fuel_maintenance_requests' already has 'confirmedByUserId'
```
Solution:
```bash
# Check existing columns
DESCRIBE fuel_maintenance_requests;

# Migration includes IF NOT EXISTS, safe to retry
mysql -u root -p soho_transport < migration_001_fuel_maintenance_dynamic_confirmation.sql
```

**4. Frontend Can't Connect to Backend**
```
Error: Failed to fetch /api/fuel-maintenance/all
```
Solution:
- Verify backend is running: `curl http://localhost:5000/health`
- Check CORS configuration in backend
- Verify API_BASE_URL in frontend .env
- Check network tab in browser dev tools

---

## Testing

### Backend Testing
```bash
# Create test file: backend/test/fuelMaintenance.test.js
npm test

# Test specific endpoint
curl -X GET http://localhost:5000/api/fuel-maintenance/all \
  -H "Authorization: Bearer TOKEN"
```

### Frontend Testing
```bash
# Run component tests (when test suite is set up)
npm run test

# Manual testing
1. Open http://localhost:5173
2. Log in as Transport Manager
3. Navigate to Fuel & Maintenance section
4. Verify pending requests display
5. Try confirming a request
6. Check success message
```

### Integration Testing
```bash
# Test full workflow
1. Driver creates request (POST /fuel-maintenance/requests)
2. Transport Manager views request (GET /fuel-maintenance/all)
3. Transport Manager confirms request (POST /fuel-maintenance/:id/confirm)
4. Driver views updated status (GET /fuel-maintenance/requests)
5. Verify audit log created (SELECT * FROM audit_logs)
```

---

## Support & Debugging

### Getting Help
- Check documentation files in `/docs` directory
- Review API reference: [API_REFERENCE.md](API_REFERENCE.md)
- Check implementation summary: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

### Enable Debug Mode
```env
DEBUG=true
```

### Generate Debug Reports
```bash
# Backend diagnostics
node -e "console.log(process.env)"

# Frontend bundle analysis
npm run build:analyze

# Database status
mysql -u root -p -e "SHOW PROCESSLIST; SHOW ENGINE INNODB STATUS;"
```

---

## Security Considerations

### Password Security
- Ensure strong database passwords
- Use environment variables for secrets
- Never commit .env to version control

### Database Security
- Restrict database user privileges
- Enable SSL for database connections
- Regular backups with encryption
- Audit log monitoring

### API Security
- Validate all inputs
- Use prepared statements (already implemented)
- Implement rate limiting
- Monitor for unusual activity

### SSL/TLS
```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Use Let's Encrypt for production
sudo certbot certonly --webroot -w /var/www/html -d soho.com
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor logs for errors
- Check health endpoints
- Monitor disk space

**Weekly:**
- Analyze slow queries
- Review audit logs
- Check backup integrity

**Monthly:**
- Update dependencies: `npm update`
- Optimize database: `ANALYZE TABLE` + `OPTIMIZE TABLE`
- Review security patches

**Quarterly:**
- Full system audit
- Performance testing
- Load testing
- Security scanning
