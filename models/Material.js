const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['cera', 'aditivo', 'esencia', 'otro']
  },
  precioPorGramo: {
    type: Number,
    required: true,
    min: 0
  },
  proveedor: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  unidad: {
    type: String,
    default: 'gramos',
    enum: ['gramos', 'ml', 'unidades']
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Material', materialSchema);


