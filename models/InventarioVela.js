const mongoose = require('mongoose');

const inventarioVelaSchema = new mongoose.Schema({
  receta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receta'
  },
  nombreVela: {
    type: String,
    required: true,
    trim: true,
    unique: true  // El nombre es único, no la receta
  },
  stockActual: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  stockMinimo: {
    type: Number,
    default: 10
  },
  ultimaProduccion: {
    fecha: Date,
    cantidad: Number
  },
  ultimaVenta: {
    fecha: Date,
    cantidad: Number
  },
  activo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Índice para el nombre de vela (ya es único en el schema)
// Se elimina el índice por receta porque queremos agrupar por nombre

// Método para agregar stock (cuando se produce)
inventarioVelaSchema.methods.agregarStock = function(cantidad) {
  this.stockActual += cantidad;
  this.ultimaProduccion = {
    fecha: new Date(),
    cantidad: cantidad
  };
  return this.save();
};

// Método para descontar stock (cuando se vende)
inventarioVelaSchema.methods.descontarStock = function(cantidad) {
  if (this.stockActual < cantidad) {
    throw new Error(`Stock insuficiente. Disponible: ${this.stockActual}, Solicitado: ${cantidad}`);
  }
  this.stockActual -= cantidad;
  this.ultimaVenta = {
    fecha: new Date(),
    cantidad: cantidad
  };
  return this.save();
};

// Método para verificar si está en stock bajo
inventarioVelaSchema.methods.esBajoStock = function() {
  return this.stockActual <= this.stockMinimo;
};

module.exports = mongoose.model('InventarioVela', inventarioVelaSchema);

