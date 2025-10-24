const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// URI de PRODUCCIÓN (MongoDB Atlas)
const MONGODB_URI = 'mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/velas_artesanales';

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  rol: { 
    type: String, 
    enum: ['admin', 'usuario'], 
    default: 'usuario' 
  },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', usuarioSchema);

async function crearAdmin() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas (Producción)...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas exitosamente!\n');

    // Verificar si ya existe
    const email = 'admin@aluen.com';
    const existente = await Usuario.findOne({ email });

    if (existente) {
      console.log('⚠️  El usuario administrador ya existe:');
      console.log('   📧 Email:', existente.email);
      console.log('   👤 Nombre:', existente.nombre);
      console.log('   🔒 Rol:', existente.rol);
      console.log('   ✓ Activo:', existente.activo);
      console.log('\n💡 Puedes usar este usuario para iniciar sesión.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hashear la contraseña
    console.log('🔐 Generando hash de contraseña...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Crear el usuario
    console.log('👤 Creando usuario administrador...');
    const usuario = new Usuario({
      nombre: 'Administrador ALUEN',
      email: email,
      password: hashedPassword,
      rol: 'admin',
      activo: true
    });

    await usuario.save();

    console.log('\n🎉 ¡Usuario administrador creado exitosamente en PRODUCCIÓN!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    admin@aluen.com');
    console.log('🔑 Password: admin123');
    console.log('🔒 Rol:      admin');
    console.log('✓ Estado:    activo');
    console.log('═══════════════════════════════════════\n');
    console.log('✨ Ahora puedes iniciar sesión en:');
    console.log('   https://tu-sitio.netlify.app\n');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al crear usuario administrador:');
    console.error('   ', error.message);
    if (error.code === 11000) {
      console.error('\n💡 El usuario ya existe en la base de datos.');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar
crearAdmin();

