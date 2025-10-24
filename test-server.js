console.log('🔍 INICIANDO PRUEBA DEL SERVIDOR...\n');

try {
  console.log('1. Verificando módulos...');
  const express = require('express');
  console.log('   ✅ Express cargado');
  
  const mongoose = require('mongoose');
  console.log('   ✅ Mongoose cargado');
  
  const cors = require('cors');
  console.log('   ✅ CORS cargado');
  
  const dotenv = require('dotenv');
  console.log('   ✅ Dotenv cargado');
  
  const bcrypt = require('bcryptjs');
  console.log('   ✅ Bcryptjs cargado');
  
  const jwt = require('jsonwebtoken');
  console.log('   ✅ JWT cargado');
  
  const validator = require('express-validator');
  console.log('   ✅ Express-validator cargado');
  
  console.log('\n2. Cargando configuración...');
  const result = dotenv.config({ path: './config.env' });
  if (result.error) {
    console.log('   ⚠️  Error cargando .env:', result.error.message);
  } else {
    console.log('   ✅ Config.env cargado');
    console.log('   📍 MongoDB URI:', process.env.MONGODB_URI ? 'Configurado ✅' : 'NO configurado ❌');
    console.log('   📍 PORT:', process.env.PORT || 5000);
    console.log('   📍 JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado ✅' : 'NO configurado ❌');
  }
  
  console.log('\n3. Verificando archivos...');
  const fs = require('fs');
  const archivos = [
    './models/Usuario.js',
    './models/Material.js',
    './middleware/auth.js',
    './routes/auth.js',
    './routes/materiales.js'
  ];
  
  archivos.forEach(archivo => {
    if (fs.existsSync(archivo)) {
      console.log(`   ✅ ${archivo}`);
    } else {
      console.log(`   ❌ ${archivo} NO ENCONTRADO`);
    }
  });
  
  console.log('\n4. Probando conexión a MongoDB...');
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('   ✅ MongoDB conectado exitosamente\n');
    console.log('═══════════════════════════════════════');
    console.log('✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('═══════════════════════════════════════');
    console.log('\n📌 Ahora puedes iniciar el servidor con: node server.js\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('   ❌ Error de conexión a MongoDB:', err.message);
    console.log('\n⚠️  PROBLEMA: No se puede conectar a MongoDB');
    console.log('Verifica tu conexión a internet y las credenciales de MongoDB Atlas\n');
    process.exit(1);
  });
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}


