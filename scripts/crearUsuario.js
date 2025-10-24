const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const readline = require('readline');
require('dotenv').config({ path: '../config.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pregunta = (pregunta) => {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta);
    });
  });
};

const crearUsuario = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB\n');
    console.log('=== CREAR NUEVO USUARIO ===\n');

    // Solicitar datos del usuario
    const nombre = await pregunta('Nombre completo: ');
    const email = await pregunta('Email: ');
    
    // Verificar si el usuario ya existe
    const usuarioExiste = await Usuario.findOne({ email });
    if (usuarioExiste) {
      console.log('\n❌ Ya existe un usuario con ese email');
      rl.close();
      process.exit(1);
    }

    const password = await pregunta('Contraseña (mínimo 6 caracteres): ');
    
    if (password.length < 6) {
      console.log('\n❌ La contraseña debe tener al menos 6 caracteres');
      rl.close();
      process.exit(1);
    }

    const rolInput = await pregunta('Rol (usuario/admin) [usuario]: ');
    const rol = rolInput.toLowerCase() === 'admin' ? 'admin' : 'usuario';

    // Crear usuario
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password,
      rol
    });

    await nuevoUsuario.save();

    console.log('\n✅ Usuario creado exitosamente!\n');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:', nuevoUsuario.email);
    console.log('👤 Nombre:', nuevoUsuario.nombre);
    console.log('🔑 Rol:', nuevoUsuario.rol === 'admin' ? '👑 Administrador' : '👤 Usuario');
    console.log('═══════════════════════════════════\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al crear usuario:', error.message);
    rl.close();
    process.exit(1);
  }
};

crearUsuario();

