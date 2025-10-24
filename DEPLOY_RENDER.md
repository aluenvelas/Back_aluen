# 🚀 GUÍA DE DESPLIEGUE EN RENDER

## 🔧 SOLUCIÓN A LOS ERRORES

### **ERROR 1: `ENOENT: no such file or directory, stat '/opt/render/project/Front_aluen/build/index.html'`**

**Causa:** El servidor intentaba servir el frontend React desde una carpeta que no existe en Render.

**Solución:** ✅ Ya solucionado. Eliminé el código que intentaba servir el frontend y agregué:
- Ruta `/health` para health checks
- Ruta `/` con información de la API

---

### **ERROR 2: MongoDB Atlas - IP no permitida**

**Causa:** MongoDB Atlas bloquea conexiones desde IPs que no están en la lista blanca.

**Solución:** Debes permitir las IPs de Render en MongoDB Atlas.

---

## 📋 PASOS PARA DESPLEGAR EN RENDER

### **PASO 1: Configurar MongoDB Atlas**

#### **1.1. Permitir Conexiones desde Render:**

1. Ve a **MongoDB Atlas**: https://cloud.mongodb.com
2. Click en tu proyecto → **Network Access** (menú izquierdo)
3. Click en **"+ ADD IP ADDRESS"**
4. Selecciona **"ALLOW ACCESS FROM ANYWHERE"**
   ```
   IP Address: 0.0.0.0/0
   Comment: Render y acceso público
   ```
5. Click **"Confirm"**

⚠️ **Nota de Seguridad:** Esto permite acceso desde cualquier IP. Es seguro porque:
- MongoDB requiere usuario/contraseña
- Las credenciales están en variables de entorno
- Solo tú conoces la URI completa

#### **1.2. Verificar String de Conexión:**

Tu URI actual:
```
mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales
```

✅ Esta URI es correcta y funcionará una vez permitas las IPs.

---

### **PASO 2: Preparar el Repositorio**

#### **2.1. Hacer Commit de los Cambios:**

```bash
cd C:\Users\Administrador\Documents\Proyecto\Back_aluen

# Ver cambios
git status

# Agregar archivos modificados
git add server.js render.yaml

# Commit
git commit -m "Fix: Preparar backend para despliegue en Render"

# Push a GitHub
git push origin main
```

---

### **PASO 3: Configurar Render**

#### **3.1. Crear Cuenta en Render:**

1. Ve a: https://render.com
2. **Sign Up** → Conecta con tu cuenta de GitHub
3. Autoriza el acceso a tus repositorios

#### **3.2. Crear Web Service:**

1. En Render Dashboard, click **"+ New"** → **"Web Service"**
2. Conecta tu repositorio: **`aluenvelas/Back_aluen`**
3. Click **"Connect"**

#### **3.3. Configurar el Servicio:**

**Configuración Básica:**
```
Name: aluen-backend
Region: Frankfurt (EU Central) o Oregon (US West)
Branch: main
Root Directory: (dejar vacío)
Runtime: Node
Build Command: npm install
Start Command: node server.js
Plan: Free
```

**Variables de Entorno:**
Click en **"Advanced"** → **"Add Environment Variable"**

Agregar estas variables:

```
NODE_ENV = production

MONGODB_URI = mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales

JWT_SECRET = aluen_jwt_secret_2024_super_seguro_cambiar_en_produccion

PORT = 5000
```

⚠️ **Importante:** 
- Copia exactamente la `MONGODB_URI` de arriba
- Cambia el `JWT_SECRET` por uno más seguro (puedes usar un generador online)

#### **3.4. Crear el Servicio:**

1. Click **"Create Web Service"**
2. Render comenzará a desplegar automáticamente
3. Espera 2-5 minutos

---

### **PASO 4: Verificar el Despliegue**

#### **4.1. Ver Logs:**

En Render Dashboard:
- Click en tu servicio **"aluen-backend"**
- Ve a la pestaña **"Logs"**
- Deberías ver:
  ```
  MongoDB conectado exitosamente
  Servidor corriendo en puerto 10000
  ```

#### **4.2. Probar la API:**

Tu URL será algo como: `https://aluen-backend.onrender.com`

**Prueba en el navegador:**
```
https://tu-servicio.onrender.com/
```

Deberías ver:
```json
{
  "message": "API de ALUEN - Velas Artesanales",
  "version": "1.0.0",
  "endpoints": { ... },
  "status": "running"
}
```

**Prueba Health Check:**
```
https://tu-servicio.onrender.com/health
```

Deberías ver:
```json
{
  "status": "OK",
  "message": "Backend ALUEN funcionando correctamente",
  "timestamp": "2025-10-23T..."
}
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### **Error: "Application failed to respond"**

**Causa:** El servidor no está escuchando en el puerto correcto.

**Solución:** Render asigna automáticamente el puerto. El código ya usa `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 5000;
```
✅ Ya está correcto.

---

### **Error: "MongooseServerSelectionError"**

**Causa:** MongoDB Atlas bloqueando la IP de Render.

**Solución:**
1. Ve a MongoDB Atlas → Network Access
2. Verifica que `0.0.0.0/0` esté en la lista
3. Si no está, agrégalo
4. Espera 1-2 minutos
5. En Render, click **"Manual Deploy"** → **"Clear build cache & deploy"**

---

### **Error: "Build failed"**

**Causa:** Dependencias faltantes o error en package.json.

**Solución:**
1. Verifica que `package.json` esté en el repositorio
2. Verifica que todas las dependencias estén listadas
3. En Render Logs, busca el error específico

---

### **El servicio se duerme (Free Plan)**

**Comportamiento:** El plan gratuito de Render duerme el servicio después de 15 minutos de inactividad.

**Solución:**
- **Primera petición:** Puede tardar 30-60 segundos (cold start)
- **Peticiones siguientes:** Normales
- **Para evitarlo:** Upgrade a plan de pago ($7/mes) o usa un servicio de "ping" externo

---

## 🔐 SEGURIDAD EN PRODUCCIÓN

### **Variables de Entorno Seguras:**

1. **JWT_SECRET:** Genera uno nuevo:
   ```javascript
   // En Node.js
   require('crypto').randomBytes(32).toString('hex')
   ```
   
2. **MONGODB_URI:** 
   - ✅ Ya está segura (credenciales ocultas)
   - No la compartas públicamente
   
3. **Rotar Credenciales:**
   - Cambia el JWT_SECRET periódicamente
   - Considera crear un usuario de BD específico para producción

---

## 📊 MONITOREO

### **Ver Métricas en Render:**

Dashboard → Tu servicio → **"Metrics"**
- CPU Usage
- Memory Usage
- Request Count
- Response Time

### **Ver Logs en Tiempo Real:**

Dashboard → Tu servicio → **"Logs"**
- Errores de conexión
- Peticiones entrantes
- Errores de aplicación

---

## 🔄 ACTUALIZACIONES FUTURAS

### **Despliegue Automático:**

Render se conecta a tu repositorio de GitHub:
1. Haces cambios localmente
2. `git push origin main`
3. Render detecta el push
4. Automáticamente construye y despliega
5. ¡Listo! La nueva versión está online

### **Despliegue Manual:**

En Render Dashboard:
- Click en tu servicio
- Click **"Manual Deploy"** (botón superior derecho)
- Selecciona **"Clear build cache & deploy"** si hay problemas

---

## 🌐 CONFIGURAR FRONTEND PARA USAR LA API

Una vez que tu backend esté online, actualiza el frontend:

### **En `Front_aluen/src/services/api.js`:**

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://tu-servicio.onrender.com/api';
```

### **Crear archivo `.env` en el frontend:**

```env
REACT_APP_API_URL=https://aluen-backend.onrender.com/api
```

---

## 📋 CHECKLIST DE DESPLIEGUE

- [ ] MongoDB Atlas: IP 0.0.0.0/0 permitida
- [ ] MongoDB Atlas: Usuario y contraseña correctos
- [ ] GitHub: Cambios pusheados (server.js actualizado)
- [ ] Render: Cuenta creada y conectada a GitHub
- [ ] Render: Web Service creado
- [ ] Render: Variables de entorno configuradas
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET
  - [ ] NODE_ENV=production
  - [ ] PORT=5000
- [ ] Render: Despliegue exitoso (ver logs)
- [ ] Prueba: https://tu-servicio.onrender.com/ funciona
- [ ] Prueba: https://tu-servicio.onrender.com/health funciona
- [ ] Frontend: Configurado para usar la URL de Render

---

## 🆘 SI TODO FALLA

### **Opción 1: Revisar Logs de Render**

Copia los logs y busca:
- "MongoDB conectado exitosamente" ✅
- "MongooseServerSelectionError" ❌
- "ENOENT" ❌
- El puerto en el que está escuchando

### **Opción 2: Verificar Variables de Entorno**

En Render Dashboard → Tu servicio → Settings → Environment:
- Verifica que `MONGODB_URI` esté completa
- Verifica que no haya espacios extra
- Verifica que la contraseña sea correcta

### **Opción 3: Re-desplegar**

En Render:
1. Settings → Delete Service
2. Crear nuevo Web Service desde cero
3. Seguir los pasos de configuración nuevamente

---

## 📞 URL DE TU API

Una vez desplegado, tu API estará en:

```
https://aluen-backend.onrender.com
```

**Endpoints disponibles:**
```
GET  /                          → Info de la API
GET  /health                    → Health check
POST /api/auth/login           → Login
GET  /api/materiales           → Materiales (requiere auth)
GET  /api/recetas              → Recetas (requiere auth)
GET  /api/frascos              → Frascos (requiere auth)
GET  /api/ventas               → Ventas (requiere auth)
GET  /api/reportes/inventario  → Reportes (requiere auth)
...
```

---

## 🎯 SIGUIENTE PASO

Después de desplegar el backend:

1. **Desplegar el Frontend** en Vercel/Netlify
2. **Configurar CORS** si es necesario
3. **Conectar frontend con backend**
4. **Crear usuario admin** usando los scripts

---

## ✅ RESUMEN

**Cambios Realizados:**
- ✅ Eliminado código que buscaba el frontend
- ✅ Agregada ruta `/health` para health checks
- ✅ Agregada ruta `/` con info de la API
- ✅ Creado `render.yaml` para configuración
- ✅ Documentación completa de despliegue

**Lo que Debes Hacer:**
1. ✅ Permitir IP 0.0.0.0/0 en MongoDB Atlas
2. ✅ Hacer commit y push de los cambios
3. ✅ Crear cuenta en Render
4. ✅ Crear Web Service con las variables de entorno
5. ✅ Verificar que funcione

---

**¡Listo para desplegar!** 🚀

