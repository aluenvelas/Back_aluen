const mongoose = require('mongoose');

const activoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['equipo', 'herramienta', 'mueble', 'tecnologia', 'otro']
  },
  descripcion: {
    type: String,
    trim: true
  },
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  fechaAdquisicion: {
    type: Date,
    required: true
  },
  proveedor: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    enum: ['nuevo', 'bueno', 'regular', 'malo', 'obsoleto'],
    default: 'bueno'
  },
  ubicacion: {
    type: String,
    trim: true
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

module.exports = mongoose.model('Activo', activoSchema);


