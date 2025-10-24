const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
require('dotenv').config({ path: '../config.env' });

const probarLogin = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuario admin
    const usuario = await Usuario.findOne({ email: 'admin@velas.com' });

    if (!usuario) {
      console.log('❌ No se encontró el usuario admin@velas.com');
      console.log('\nSolución: Ejecuta "npm run crear-admin"');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado en la base de datos');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:', usuario.email);
    console.log('👤 Nombre:', usuario.nombre);
    console.log('🔑 Rol:', usuario.rol);
    console.log('✓ Activo:', usuario.activo);
    console.log('📅 Creado:', usuario.fechaCreacion);
    console.log('═══════════════════════════════════\n');

    // Probar contraseña
    const passwordCorrecta = await usuario.compararPassword('admin123');

    if (passwordCorrecta) {
      console.log('✅ La contraseña "admin123" es correcta\n');
      console.log('🎯 DIAGNÓSTICO: Todo está bien configurado');
      console.log('\nSi no puedes hacer login, el problema es que:');
      console.log('1. El backend no está corriendo');
      console.log('2. El backend está corriendo pero no tiene los cambios');
      console.log('3. El frontend no se está conectando al backend\n');
      console.log('SOLUCIÓN: Reinicia el backend');
      console.log('   Ejecuta: REINICIAR_BACKEND.bat');
      console.log('   O presiona Ctrl+C en la terminal del backend y ejecuta "node server.js" nuevamente\n');
    } else {
      console.log('❌ La contraseña "admin123" NO es correcta');
      console.log('\nSolución: Vuelve a crear el usuario admin');
      console.log('   1. Elimina el usuario en MongoDB Atlas');
      console.log('   2. Ejecuta: npm run crear-admin');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

probarLogin();

