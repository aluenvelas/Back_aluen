const mongoose = require('mongoose');

const nombreVelaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: false, // Se genera automáticamente en pre-save
    trim: true,
    unique: true
  },
  frasco: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frasco',
    required: true
  },
  esencia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
});

// Generar nombre automáticamente antes de validar (solo si no se envió uno manual)
nombreVelaSchema.pre('validate', async function() {
  console.log('=== PRE-VALIDATE NombreVela ===');
  console.log('Nombre enviado:', this.nombre || '(vacío - se auto-generará)');
  console.log('Frasco ID:', this.frasco);
  console.log('Esencia ID:', this.esencia);
  console.log('Color:', this.color);
  
  // Solo generar el nombre si NO se envió uno manualmente
  if (!this.nombre && this.frasco && this.esencia && this.color) {
    try {
      const Frasco = mongoose.model('Frasco');
      const Material = mongoose.model('Material');
      
      const frasco = await Frasco.findById(this.frasco);
      const esencia = await Material.findById(this.esencia);
      
      console.log('Frasco encontrado:', frasco ? frasco.nombre : 'NO');
      console.log('Esencia encontrada:', esencia ? esencia.nombre : 'NO');
      
      if (!frasco) {
        throw new Error('Frasco no encontrado con ID: ' + this.frasco);
      }
      
      if (!esencia) {
        throw new Error('Esencia no encontrada con ID: ' + this.esencia);
      }
      
      // Generar nombre automático: "Vela [Esencia] [Color] [Capacidad]ml"
      this.nombre = `Vela ${esencia.nombre} ${this.color} ${frasco.capacidad}ml`;
      
      console.log('✅ Nombre AUTO-GENERADO:', this.nombre);
    } catch (error) {
      console.error('❌ Error generando nombre:', error.message);
      throw error;
    }
  } else if (this.nombre) {
    console.log('✅ Usando NOMBRE MANUAL:', this.nombre);
  } else {
    console.log('⚠️ Falta información para generar nombre');
  }
});

module.exports = mongoose.model('NombreVela', nombreVelaSchema);

