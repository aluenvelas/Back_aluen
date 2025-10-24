const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
require('dotenv').config({ path: '../config.env' });

const crearAdmin = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado a MongoDB');

    // Verificar si ya existe un admin
    const adminExiste = await Usuario.findOne({ email: 'admin@velas.com' });
    
    if (adminExiste) {
      console.log('Ya existe un usuario administrador');
      process.exit(0);
    }

    // Crear usuario administrador
    const admin = new Usuario({
      nombre: 'Administrador',
      email: 'admin@velas.com',
      password: 'admin123',
      rol: 'admin'
    });

    await admin.save();

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('Email: admin@velas.com');
    console.log('Contraseña: admin123');
    console.log('¡IMPORTANTE! Cambia la contraseña después del primer login');

    process.exit(0);
  } catch (error) {
    console.error('Error al crear administrador:', error);
    process.exit(1);
  }
};

crearAdmin();

