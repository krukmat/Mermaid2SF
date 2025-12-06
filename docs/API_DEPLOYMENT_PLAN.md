# API Deployment Plan - DigitalOcean

Plan detallado para desplegar la API REST de Mermaid2SF en DigitalOcean.

---

## 📋 Resumen del Deployment

**Objetivo:** Desplegar API REST pública en DigitalOcean para compilar diagramas Mermaid a Salesforce Flow XML

**Tipo de deployment:** Opción C (API REST solamente, sin frontend)

**Endpoints disponibles:**
- `GET /health` - Health check
- `POST /api/compile` - Compilar Mermaid a Flow DSL + XML

---

## 🎯 Pre-requisitos

### En tu máquina local:
- ✅ Cuenta de DigitalOcean activa
- ✅ SSH key configurada en DigitalOcean
- ✅ `doctl` CLI instalado (opcional, para automatización)
- ✅ Acceso al repositorio GitHub

### En DigitalOcean:
- [ ] Droplet Ubuntu 22.04 LTS creado
- [ ] Node.js 18+ instalado
- [ ] Nginx instalado y configurado
- [ ] Dominio configurado (opcional, pero recomendado)
- [ ] Certificado SSL (Let's Encrypt vía Certbot)

---

## 📦 Fase 1: Preparación del Droplet

### 1.1 Crear Droplet en DigitalOcean

**Especificaciones mínimas:**
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($6/mes - 1GB RAM, 1 vCPU, 25GB SSD)
- **Datacenter:** Closest to target users (ej: NYC1, SFO3)
- **SSH:** Agregar tu SSH key
- **Hostname:** `mermaid2sf-api`

**Vía UI:**
1. Login a DigitalOcean → Create → Droplets
2. Seleccionar Ubuntu 22.04 LTS
3. Elegir plan Basic $6/mes
4. Agregar SSH key
5. Hostname: `mermaid2sf-api`
6. Create Droplet

**Vía CLI (doctl):**
```bash
doctl compute droplet create mermaid2sf-api \
  --image ubuntu-22-04-x64 \
  --size s-1vcpu-1gb \
  --region nyc1 \
  --ssh-keys <your-ssh-key-fingerprint>
```

### 1.2 Conectarse al Droplet

```bash
ssh root@<droplet-ip>
```

### 1.3 Configuración inicial del servidor

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar dependencias básicas
apt install -y curl git build-essential

# Crear usuario para la app (no usar root)
adduser --disabled-password --gecos "" mermaid2sf
usermod -aG sudo mermaid2sf

# Configurar SSH para el nuevo usuario
mkdir -p /home/mermaid2sf/.ssh
cp /root/.ssh/authorized_keys /home/mermaid2sf/.ssh/
chown -R mermaid2sf:mermaid2sf /home/mermaid2sf/.ssh
chmod 700 /home/mermaid2sf/.ssh
chmod 600 /home/mermaid2sf/.ssh/authorized_keys
```

---

## 🔧 Fase 2: Instalación de Node.js

```bash
# Cambiar a usuario mermaid2sf
su - mermaid2sf

# Instalar Node.js 18 LTS via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Cargar nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verificar instalación
node --version  # Debe mostrar v18.x.x
npm --version   # Debe mostrar 9.x.x o superior
```

---

## 📥 Fase 3: Deploy de la Aplicación

### 3.1 Clonar el repositorio

```bash
# Como usuario mermaid2sf
cd /home/mermaid2sf
git clone https://github.com/krukmat/Mermaid2SF.git app
cd app
```

**Nota:** Ajusta la URL del repo según tu cuenta de GitHub

### 3.2 Instalar dependencias y compilar

```bash
npm install
npm run build
npm test  # Verificar que todo funciona
```

### 3.3 Probar el servidor localmente

```bash
# Iniciar servidor
node web/server/index.js

# En otra terminal SSH, probar:
curl http://localhost:4000/health
# Debería retornar: {"status":"ok"}
```

---

## 🔄 Fase 4: Configurar PM2 (Process Manager)

PM2 mantiene la app corriendo y la reinicia automáticamente si falla.

### 4.1 Instalar PM2 globalmente

```bash
npm install -g pm2
```

### 4.2 Crear archivo de configuración PM2

```bash
cat > /home/mermaid2sf/app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mermaid2sf-api',
    script: 'web/server/index.js',
    cwd: '/home/mermaid2sf/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/home/mermaid2sf/logs/err.log',
    out_file: '/home/mermaid2sf/logs/out.log',
    log_file: '/home/mermaid2sf/logs/combined.log',
    time: true
  }]
};
EOF
```

### 4.3 Crear directorio de logs

```bash
mkdir -p /home/mermaid2sf/logs
```

### 4.4 Iniciar la app con PM2

```bash
cd /home/mermaid2sf/app
pm2 start ecosystem.config.js
pm2 save  # Guardar configuración
pm2 startup  # Configurar PM2 para iniciar en boot
```

### 4.5 Verificar que está corriendo

```bash
pm2 status
pm2 logs mermaid2sf-api --lines 50
curl http://localhost:4000/health
```

---

## 🌐 Fase 5: Configurar Nginx como Reverse Proxy

### 5.1 Instalar Nginx

```bash
# Como root
sudo apt install -y nginx
```

### 5.2 Configurar Nginx para la API

```bash
# Como root
cat > /etc/nginx/sites-available/mermaid2sf << 'EOF'
server {
    listen 80;
    server_name <TU_DOMINIO_O_IP>;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/mermaid2sf-access.log;
    error_log /var/log/nginx/mermaid2sf-error.log;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (sin proxy overhead)
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}
EOF
```

**Reemplaza `<TU_DOMINIO_O_IP>` con:**
- Tu dominio si lo tienes (ej: `api.mermaid2sf.com`)
- O la IP del droplet si no tienes dominio

### 5.3 Activar el sitio

```bash
# Crear symlink
ln -s /etc/nginx/sites-available/mermaid2sf /etc/nginx/sites-enabled/

# Eliminar default site si existe
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx
```

### 5.4 Configurar Firewall (UFW)

```bash
# Permitir SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

### 5.5 Probar el endpoint público

```bash
# Desde tu máquina local
curl http://<DROPLET_IP>/health
curl -X POST http://<DROPLET_IP>/api/compile \
  -H "Content-Type: application/json" \
  -d '{"mermaidText":"flowchart TD\n  Start[START: Begin]\n  End[END: Complete]\n  Start --> End"}'
```

---

## 🔒 Fase 6: Configurar SSL con Let's Encrypt (Opcional pero recomendado)

**Requisito:** Necesitas un dominio apuntando a tu droplet IP

### 6.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtener certificado SSL

```bash
sudo certbot --nginx -d <TU_DOMINIO>
```

Certbot automáticamente:
- Obtiene el certificado
- Actualiza la configuración de Nginx
- Configura redirección HTTP → HTTPS

### 6.3 Renovación automática

```bash
# Verificar que el timer de renovación está activo
sudo systemctl status certbot.timer

# Probar renovación (dry run)
sudo certbot renew --dry-run
```

---

## 📊 Fase 7: Monitoreo y Logs

### 7.1 Ver logs de la aplicación

```bash
# Logs de PM2
pm2 logs mermaid2sf-api
pm2 logs mermaid2sf-api --lines 100

# Logs de Nginx
sudo tail -f /var/log/nginx/mermaid2sf-access.log
sudo tail -f /var/log/nginx/mermaid2sf-error.log
```

### 7.2 Monitoreo de PM2

```bash
pm2 monit  # Monitor interactivo
pm2 status # Estado actual
```

---

## 🔄 Fase 8: Script de Deploy/Update

Crear script para futuros updates:

```bash
cat > /home/mermaid2sf/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Mermaid2SF API..."

cd /home/mermaid2sf/app

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Build
echo "🔨 Building..."
npm run build

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart mermaid2sf-api

# Show status
pm2 status

echo "✅ Deployment complete!"
echo "📊 Logs: pm2 logs mermaid2sf-api"
EOF

chmod +x /home/mermaid2sf/deploy.sh
```

**Uso futuro:**
```bash
cd /home/mermaid2sf
./deploy.sh
```

---

## ✅ Checklist de Verificación Final

### Pre-deployment:
- [ ] Tests pasan localmente: `npm test`
- [ ] Build exitoso: `npm run build`
- [ ] Servidor funciona localmente: `node web/server/index.js`
- [ ] Endpoints responden correctamente

### Post-deployment:
- [ ] Droplet creado y accesible vía SSH
- [ ] Node.js 18+ instalado
- [ ] Repositorio clonado
- [ ] Dependencies instaladas
- [ ] Build exitoso en servidor
- [ ] PM2 configurado y corriendo
- [ ] Nginx configurado como reverse proxy
- [ ] Firewall configurado (UFW)
- [ ] Endpoints públicos funcionan:
  - [ ] `GET /health` retorna `{"status":"ok"}`
  - [ ] `POST /api/compile` compila Mermaid correctamente
- [ ] SSL configurado (si aplica)
- [ ] Logs accesibles
- [ ] Script de deploy creado

---

## 🔐 Información Sensible a Guardar

**Droplet IP:** `_____________`

**Dominio (si aplica):** `_____________`

**SSH Command:** `ssh mermaid2sf@<DROPLET_IP>`

**API URL:**
- HTTP: `http://<DROPLET_IP>/api/compile`
- HTTPS: `https://<DOMINIO>/api/compile` (si SSL está configurado)

---

## 🐛 Troubleshooting

### API no responde
```bash
# Verificar que PM2 está corriendo
pm2 status
pm2 logs mermaid2sf-api --lines 50

# Verificar que el puerto 4000 está escuchando
sudo netstat -tulpn | grep 4000

# Reiniciar PM2
pm2 restart mermaid2sf-api
```

### Nginx no funciona
```bash
# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### No se puede conectar desde afuera
```bash
# Verificar firewall
sudo ufw status

# Verificar que Nginx está escuchando en 80/443
sudo netstat -tulpn | grep nginx
```

### Build falla
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📝 Próximos Pasos (Fase B - Web Visualizer)

Una vez que la API esté desplegada y probada en producción:

1. Crear nuevo proyecto/branch para Web Visualizer
2. Desarrollar frontend interactivo con editor Mermaid
3. Integrar frontend con API existente
4. Desplegar frontend (puede ser mismo droplet o separado)

---

## 📚 Referencias

- [DigitalOcean Droplet Docs](https://docs.digitalocean.com/products/droplets/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt Certbot](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal)

---

**Documento creado:** 2025-12-06
**Versión:** 1.0
**Autor:** Claude Code + Matias Kruk
