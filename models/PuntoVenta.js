const mongoose = require('mongoose');

const puntoVentaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del punto de venta es requerido'],
    trim: true
  },
  direccion: {
    type: String,
    trim: true,
    default: ''
  },
  telefono: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  responsable: {
    type: String,
    trim: true,
    default: ''
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
puntoVentaSchema.index({ nombre: 1 });
puntoVentaSchema.index({ activo: 1 });

module.exports = mongoose.model('PuntoVenta', puntoVentaSchema);

