const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();

// Middleware CORS - Configuración específica para producción
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://aluenvelas.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB conectado exitosamente'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Middleware de autenticación
const { protegerRuta } = require('./middleware/auth');

// Routes públicas (sin autenticación)
app.use('/api/auth', require('./routes/auth'));

// Routes protegidas (requieren autenticación)
app.use('/api/materiales', protegerRuta, require('./routes/materiales'));
app.use('/api/recetas', protegerRuta, require('./routes/recetas'));
app.use('/api/frascos', protegerRuta, require('./routes/frascos'));
app.use('/api/activos', protegerRuta, require('./routes/activos'));
app.use('/api/ventas', protegerRuta, require('./routes/ventas'));
app.use('/api/reportes', protegerRuta, require('./routes/reportes'));
app.use('/api/reportes-pdf', protegerRuta, require('./routes/reportesPDF'));
app.use('/api/nombres-velas', protegerRuta, require('./routes/nombresVelas'));
app.use('/api/usuarios', protegerRuta, require('./routes/usuarios'));
app.use('/api/inventario', protegerRuta, require('./routes/inventario'));
app.use('/api/puntos-venta', protegerRuta, require('./routes/puntosVenta'));

// Proxy para imágenes de Google Drive (evita CORS)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).send('URL requerida');
    }

    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    // Parsear URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).send('URL invalida');
    }
    
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const request = protocol.request(options, (response) => {
      // Manejar redirecciones
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
      }
      
      // Verificar status code
      if (response.statusCode !== 200) {
        console.error(`HTTP ${response.statusCode} para URL: ${url}`);
        return res.status(response.statusCode).send('Error al obtener imagen');
      }
      
      // Establecer headers
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Pipe la respuesta
      response.pipe(res);
    });
    
    request.on('error', (err) => {
      console.error('Error de red:', err.message);
      if (!res.headersSent) {
        res.status(500).send(`Error de red: ${err.message}`);
      }
    });
    
    request.setTimeout(10000, () => {
      console.error('Timeout:', url);
      request.abort();
      if (!res.headersSent) {
        res.status(504).send('Timeout');
      }
    });
    
    request.end();
    
  } catch (error) {
    console.error('Error en proxy de imagen:', error);
    res.status(500).send('Error al cargar imagen');
  }
});

// API Health Check (para Render y otros servicios)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend ALUEN funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz - Información de la API
app.get('/', (req, res) => {
  res.json({
    message: 'API de ALUEN - Velas Artesanales',
    version: '1.0.1', // Actualizado para forzar redespliegue
    lastUpdate: '2025-10-24',
    endpoints: {
      auth: '/api/auth',
      materiales: '/api/materiales',
      recetas: '/api/recetas',
      frascos: '/api/frascos',
      activos: '/api/activos',
      ventas: '/api/ventas',
      reportes: '/api/reportes',
      reportesPDF: '/api/reportes-pdf',
      nombresVelas: '/api/nombres-velas',
      inventario: '/api/inventario',
      puntosVenta: '/api/puntos-venta', // 📍 NUEVO
      proxyImage: '/api/proxy-image',
      health: '/health'
    },
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

