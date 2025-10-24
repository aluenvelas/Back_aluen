const mongoose = require('mongoose');

const frascoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  capacidad: {
    type: Number,
    required: true,
    min: 0
  },
  unidad: {
    type: String,
    default: 'ml',
    enum: ['ml', 'gramos']
  },
  material: {
    type: String,
    required: true,
    trim: true
  },
  precio: {
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
  imagenUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view/.test(v);
      },
      message: 'La URL debe ser de Google Drive válida'
    }
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
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

module.exports = mongoose.model('Frasco', frascoSchema);

