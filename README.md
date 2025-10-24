# 🕯️ ALUEN - Backend API

Backend de la aplicación **ALUEN** para gestión de velas artesanales.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación
- **PDFKit** - Generación de reportes PDF
- **Cors** - Manejo de CORS
- **Axios** - Cliente HTTP para proxy de imágenes

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (local o MongoDB Atlas)
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/aluenvelas/backend-aluen.git
cd backend-aluen
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**

Crear un archivo `.env` en la raíz del proyecto:
```env
MONGO_URI=mongodb+srv://tu-usuario:tu-password@cluster.mongodb.net/aluen
PORT=5000
JWT_SECRET=tu_secreto_super_seguro_aqui
```

4. **Iniciar el servidor:**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📁 Estructura del Proyecto

```
Back_aluen/
├── models/           # Modelos de Mongoose
│   ├── Material.js
│   ├── Frasco.js
│   ├── Receta.js
│   ├── NombreVela.js
│   ├── InventarioVela.js
│   ├── Activo.js
│   ├── Venta.js
│   └── Usuario.js
├── routes/           # Rutas de la API
│   ├── materiales.js
│   ├── frascos.js
│   ├── recetas.js
│   ├── nombresVelas.js
│   ├── activos.js
│   ├── ventas.js
│   ├── reportes.js
│   └── auth.js
├── middleware/       # Middlewares
│   └── auth.js
├── scripts/          # Scripts de utilidad
│   └── crearUsuario.js
├── server.js         # Punto de entrada
├── package.json
└── .gitignore
```

## 🔐 API Endpoints

### **Autenticación**
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/registro` - Registrar usuario (deshabilitado)

### **Materiales**
- `GET /api/materiales` - Listar materiales
- `POST /api/materiales` - Crear material
- `PUT /api/materiales/:id` - Actualizar material
- `DELETE /api/materiales/:id` - Eliminar material (soft delete)

### **Frascos**
- `GET /api/frascos` - Listar frascos
- `POST /api/frascos` - Crear frasco
- `PUT /api/frascos/:id` - Actualizar frasco
- `DELETE /api/frascos/:id` - Eliminar frasco

### **Nombres de Velas**
- `GET /api/nombres-velas` - Listar nombres
- `POST /api/nombres-velas` - Crear nombre
- `PUT /api/nombres-velas/:id` - Actualizar nombre
- `DELETE /api/nombres-velas/:id` - Eliminar nombre

### **Recetas**
- `GET /api/recetas` - Listar recetas
- `GET /api/recetas/:id` - Obtener receta por ID
- `POST /api/recetas` - Crear receta (descuenta inventario)
- `PUT /api/recetas/:id` - Actualizar receta
- `DELETE /api/recetas/:id` - Eliminar receta

### **Activos**
- `GET /api/activos` - Listar activos
- `POST /api/activos` - Crear activo
- `PUT /api/activos/:id` - Actualizar activo
- `DELETE /api/activos/:id` - Eliminar activo

### **Ventas**
- `GET /api/ventas` - Listar ventas
- `GET /api/ventas/:id` - Obtener venta por ID
- `POST /api/ventas` - Registrar venta (descuenta inventario de velas)
- `PUT /api/ventas/:id` - Actualizar venta
- `DELETE /api/ventas/:id` - Eliminar venta

### **Reportes**
- `GET /api/reportes/inventario` - Reporte de inventario
- `GET /api/reportes/ventas` - Reporte de ventas
- `GET /api/reportes/pdf` - Generar PDF de reportes

### **Proxy de Imágenes**
- `GET /api/proxy-image` - Proxy para imágenes de Google Drive

## 💾 Modelos de Datos

### **Material**
```javascript
{
  nombre: String,
  tipo: String, // 'cera', 'esencia', 'aditivo'
  cantidad: Number,
  unidad: String,
  costoPorUnidad: Number,
  stockMinimo: Number,
  activo: Boolean
}
```

### **Frasco**
```javascript
{
  nombre: String,
  capacidad: Number,
  unidad: String,
  gramaje: Number,
  stockActual: Number,
  stockMinimo: Number,
  costoPorUnidad: Number,
  imagenUrl: String,
  activo: Boolean
}
```

### **NombreVela**
```javascript
{
  nombre: String, // Auto-generado o manual
  frasco: ObjectId,
  esencia: ObjectId,
  color: String,
  activo: Boolean
}
```

### **Receta**
```javascript
{
  nombre: String, // Referencia a NombreVela
  frasco: ObjectId,
  porcentajeCera: Number,
  porcentajeAditivo: Number,
  porcentajeEsencia: Number,
  cera: ObjectId,
  esencia: ObjectId,
  aditivo: ObjectId,
  unidadesProducir: Number,
  costosProduccion: Object,
  costosOperativos: Number,
  margenGanancia: Number,
  precioSugerido: Number,
  activo: Boolean
}
```

### **InventarioVela**
```javascript
{
  nombreVela: String,
  receta: ObjectId,
  stockActual: Number,
  stockMinimo: Number,
  ultimaProduccion: Object,
  ultimaVenta: Object,
  activo: Boolean
}
```

### **Venta**
```javascript
{
  numeroVenta: Number, // Auto-generado
  fecha: Date,
  cliente: String,
  items: [{
    receta: ObjectId,
    recetaNombre: String,
    cantidad: Number,
    precioUnitario: Number,
    subtotal: Number
  }],
  subtotal: Number,
  descuento: Number,
  total: Number,
  metodoPago: String,
  estado: String,
  activo: Boolean
}
```

## 🔄 Lógica de Negocio

### **Creación de Recetas:**
1. Se calcula el gramaje total basado en el frasco seleccionado
2. Se calculan los gramos de cera, aditivo y esencia según porcentajes
3. Se descuentan los materiales del inventario
4. Se descuentan los frascos del stock
5. Se agregan las unidades producidas al inventario de velas terminadas
6. Se calcula el precio sugerido con costos fijos y margen de ganancia

### **Registro de Ventas:**
1. Se valida que exista stock suficiente en el inventario de velas
2. Se descuenta el stock de velas terminadas
3. Se genera automáticamente el número de venta
4. Se calculan subtotales y total
5. Se registra la venta con todos los detalles

### **Reportes:**
- **Inventario:** Materiales, frascos y velas con alertas de stock bajo
- **Ventas:** Mejores productos, totales, fechas
- **PDF:** Generación de reportes en formato PDF

## 🛡️ Autenticación

El sistema usa **JWT (JSON Web Tokens)** para autenticación:

1. El usuario inicia sesión con email y contraseña
2. El servidor valida y devuelve un token JWT
3. El token se incluye en el header de cada petición:
   ```
   Authorization: Bearer <token>
   ```
4. El middleware `auth.js` valida el token en rutas protegidas

## 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ Contraseñas hasheadas con bcrypt
- ✅ CORS configurado
- ✅ Validación de datos
- ✅ Soft delete (no se eliminan registros permanentemente)
- ✅ Variables de entorno para datos sensibles

## 📦 Dependencias Principales

```json
{
  "express": "^4.18.2",
  "mongoose": "^7.5.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "pdfkit": "^0.13.0",
  "axios": "^1.5.0"
}
```

## 🚀 Scripts Disponibles

```bash
# Iniciar servidor en desarrollo (con nodemon)
npm run dev

# Iniciar servidor en producción
npm start

# Crear usuario administrador
node scripts/crearUsuario.js
```

## 🌐 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MONGO_URI` | URI de MongoDB | `mongodb+srv://...` |
| `PORT` | Puerto del servidor | `5000` |
| `JWT_SECRET` | Secreto para JWT | `mi_secreto_123` |

## 📝 Notas Importantes

### **Registro de Usuarios:**
El endpoint de registro está **deshabilitado** por defecto. Para crear usuarios, usar el script:
```bash
node scripts/crearUsuario.js
```

### **Imágenes de Google Drive:**
El sistema incluye un proxy para evitar problemas de CORS con imágenes de Google Drive:
- Las imágenes se acceden vía `/api/proxy-image?url=...`
- Usar formato: `https://lh3.googleusercontent.com/d/ID`

### **Inventario Automático:**
- Al crear una receta, se descuentan automáticamente los materiales y frascos
- Al registrar una venta, se descuentan automáticamente las velas del inventario
- El sistema mantiene histórico de última producción y última venta

## 🐛 Troubleshooting

### **Error de conexión a MongoDB:**
```
Error: querySrv ENOTFOUND _mongodb._tcp...
```
**Solución:** Verifica tu `MONGO_URI` en el archivo `.env`

### **Error de autenticación:**
```
Error: jwt malformed
```
**Solución:** Verifica que el token JWT esté correctamente configurado

### **Puerto ya en uso:**
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solución:** Cambia el puerto en `.env` o mata el proceso que lo está usando

## 📄 Licencia

Este proyecto es privado y pertenece a **ALUEN - Velas Artesanales**.

## 👥 Autor

**ALUEN Team**
- GitHub: [@aluenvelas](https://github.com/aluenvelas)

## 📞 Soporte

Para soporte o consultas, contacta al equipo de desarrollo.

---

**© 2025 ALUEN - Velas Artesanales. Todos los derechos reservados.**
