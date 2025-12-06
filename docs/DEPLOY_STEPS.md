# Deployment Steps - Mermaid2SF API

Pasos detallados para desplegar la API REST de Mermaid2SF en DigitalOcean.

---

## 📋 Plan de Deployment

Este documento cubre el deployment de la **Opción C: API REST pública** en DigitalOcean.

Para el plan detallado completo, ver: [API_DEPLOYMENT_PLAN.md](./API_DEPLOYMENT_PLAN.md)

---

## 🚀 Quick Start (Método Automatizado)

### Opción 1: Setup Automatizado

**En DigitalOcean:**
1. Crear droplet Ubuntu 22.04 LTS (1GB RAM, $6/mes)
2. Agregar tu SSH key
3. Obtener la IP del droplet

**En el droplet (como root):**
```bash
# SSH al droplet
ssh root@<DROPLET_IP>

# Ejecutar script de setup
bash <(curl -s https://raw.githubusercontent.com/krukmat/Mermaid2SF/feature/api-deployment/scripts/setup-droplet.sh)
```

Este script automáticamente:
- ✅ Instala Node.js 18, Nginx, dependencias
- ✅ Crea usuario `mermaid2sf`
- ✅ Clona el repositorio
- ✅ Instala dependencies y hace build
- ✅ Configura PM2 para process management
- ✅ Configura Nginx como reverse proxy
- ✅ Configura firewall (UFW)
- ✅ Inicia la aplicación

**Verificación:**
```bash
curl http://<DROPLET_IP>/health
# Debería retornar: {"status":"ok"}
```

---

## 🔄 Deploy Updates (Después del setup inicial)

**Desde tu máquina local:**
```bash
# Commit y push cambios
git add .
git commit -m "feat: your changes"
git push origin feature/api-deployment

# Deploy al droplet
./scripts/deploy-to-digitalocean.sh <DROPLET_IP>
```

**O manualmente en el droplet:**
```bash
ssh mermaid2sf@<DROPLET_IP>
cd /home/mermaid2sf/app
git pull origin feature/api-deployment
npm install
npm run build
npm test
pm2 restart mermaid2sf-api
```

---

## 📊 Monitoreo y Logs

### Ver logs en tiempo real
```bash
ssh mermaid2sf@<DROPLET_IP> 'pm2 logs mermaid2sf-api'
```

### Ver estado de la app
```bash
ssh mermaid2sf@<DROPLET_IP> 'pm2 status'
```

### Ver logs de Nginx
```bash
ssh root@<DROPLET_IP> 'tail -f /var/log/nginx/mermaid2sf-access.log'
```

---

## 🧪 Testing Endpoints

### Health check
```bash
curl http://<DROPLET_IP>/health
```

**Respuesta esperada:**
```json
{"status":"ok"}
```

### Compile endpoint
```bash
curl -X POST http://<DROPLET_IP>/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "mermaidText": "flowchart TD\n  Start[START: Begin]\n  End[END: Complete]\n  Start --> End"
  }'
```

**Respuesta esperada:**
```json
{
  "dsl": {
    "version": 1,
    "flowApiName": "WebFlow",
    "label": "WebFlow",
    "processType": "Autolaunched",
    "apiVersion": "60.0",
    "startElement": "Start",
    "elements": [...]
  },
  "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
  "errors": [],
  "warnings": []
}
```

---

## 🔒 Configurar SSL (Opcional, requiere dominio)

**Pre-requisito:** Tener un dominio apuntando a la IP del droplet

```bash
# SSH al droplet como root
ssh root@<DROPLET_IP>

# Instalar certbot
apt install -y certbot python3-certbot-nginx

# Actualizar nginx config con tu dominio
sed -i 's/server_name .*/server_name yourdomain.com;/' /etc/nginx/sites-available/mermaid2sf
nginx -t
systemctl reload nginx

# Obtener certificado SSL
certbot --nginx -d yourdomain.com

# Verificar renovación automática
systemctl status certbot.timer
```

---

## 🐛 Troubleshooting

### API no responde
```bash
ssh mermaid2sf@<DROPLET_IP>
pm2 status
pm2 logs mermaid2sf-api --lines 50
pm2 restart mermaid2sf-api
```

### Nginx error
```bash
ssh root@<DROPLET_IP>
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Puerto 4000 no escucha
```bash
ssh mermaid2sf@<DROPLET_IP>
netstat -tulpn | grep 4000
pm2 restart mermaid2sf-api
```

---

## 📝 Pre-deployment Checklist

Antes de hacer el deployment, verificar:

- [ ] Tests pasan: `npm test`
- [ ] Build exitoso: `npm run build`
- [ ] Servidor funciona localmente: `node web/server/index.js`
- [ ] Endpoint `/health` responde
- [ ] Endpoint `/api/compile` compila correctamente
- [ ] Cuenta DigitalOcean activa
- [ ] SSH key configurada
- [ ] Git remote configurado correctamente

---

## 🎯 Post-deployment Checklist

Después del deployment, verificar:

- [ ] Droplet accesible vía SSH
- [ ] PM2 corriendo: `pm2 status`
- [ ] Nginx corriendo: `systemctl status nginx`
- [ ] Firewall activo: `ufw status`
- [ ] Health check funciona: `curl http://<IP>/health`
- [ ] Compile endpoint funciona correctamente
- [ ] Logs accesibles: `pm2 logs`
- [ ] SSL configurado (si aplica)

---

## 📚 Documentación Relacionada

- [API_DEPLOYMENT_PLAN.md](./API_DEPLOYMENT_PLAN.md) - Plan detallado completo
- [README.md](../README.md) - Documentación general del proyecto
- [QUICK_START.md](./QUICK_START.md) - Guía de inicio rápido

---

## 🔄 Workflow de Deploy

```
Desarrollo Local
  ↓
npm test (verificar)
  ↓
git commit & push
  ↓
./scripts/deploy-to-digitalocean.sh <IP>
  ↓
SSH al droplet
  ↓
git pull & npm install & build
  ↓
pm2 restart
  ↓
Verificar endpoints
  ↓
✅ Deploy exitoso
```

---

## 📞 Información de Contacto (Deployment)

**Droplet IP:** `_____________` (completar después del deployment)

**SSH Access:** `ssh mermaid2sf@<DROPLET_IP>`

**API URLs:**
- Health: `http://<DROPLET_IP>/health`
- Compile: `http://<DROPLET_IP>/api/compile`

**PM2 Commands:**
- Status: `pm2 status`
- Logs: `pm2 logs mermaid2sf-api`
- Restart: `pm2 restart mermaid2sf-api`
- Stop: `pm2 stop mermaid2sf-api`

---

## 🚀 Próximos Pasos (Fase B - Web Visualizer)

Una vez que la API esté en producción:

1. Crear nuevo branch: `feature/web-visualizer`
2. Desarrollar frontend interactivo con editor Mermaid
3. Integrar con API desplegada
4. Desplegar frontend (puede usar el mismo droplet o separado)

---

**Última actualización:** 2025-12-06
