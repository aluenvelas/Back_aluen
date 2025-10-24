const mongoose = require('mongoose');

const itemVentaSchema = new mongoose.Schema({
  receta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receta',
    required: true
  },
  recetaNombre: {
    type: String,
    trim: true
  },
  frasco: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frasco',
    required: false
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  descripcion: {
    type: String,
    trim: true
  }
});

const ventaSchema = new mongoose.Schema({
  numeroVenta: {
    type: String,
    unique: true,
    trim: true
  },
  fecha: {
    type: Date,
    default: Date.now,
    required: true
  },
  cliente: {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    telefono: {
      type: String,
      trim: true
    },
    direccion: {
      type: String,
      trim: true
    }
  },
  puntoVenta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PuntoVenta',
    required: false
  },
  puntoVentaNombre: {
    type: String,
    trim: true
  },
  items: {
    type: [itemVentaSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'La venta debe tener al menos un producto'
    }
  },
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  descuento: {
    type: Number,
    default: 0,
    min: 0
  },
  impuestos: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'otro'],
    default: 'efectivo'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'completada', 'cancelada', 'reembolsada'],
    default: 'completada'
  },
  notas: {
    type: String,
    trim: true
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Generar número de venta automáticamente
ventaSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroVenta) {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    
    // Buscar la última venta del mes
    const ultimaVenta = await mongoose.model('Venta')
      .findOne({ 
        numeroVenta: new RegExp(`^V-${year}${month}`) 
      })
      .sort({ numeroVenta: -1 });
    
    let secuencia = 1;
    if (ultimaVenta) {
      const partes = ultimaVenta.numeroVenta.split('-');
      secuencia = parseInt(partes[2]) + 1;
    }
    
    this.numeroVenta = `V-${year}${month}-${String(secuencia).padStart(4, '0')}`;
  }
  
  this.fechaActualizacion = Date.now();
  next();
});

// Calcular totales antes de guardar
ventaSchema.pre('save', function(next) {
  // Calcular subtotal de items
  this.subtotal = this.items.reduce((sum, item) => {
    item.subtotal = item.cantidad * item.precioUnitario;
    return sum + item.subtotal;
  }, 0);
  
  // Calcular total
  this.total = this.subtotal - this.descuento + this.impuestos;
  
  next();
});

// Índices para mejorar búsquedas
ventaSchema.index({ numeroVenta: 1 });
ventaSchema.index({ fecha: -1 });
ventaSchema.index({ 'cliente.nombre': 1 });
ventaSchema.index({ estado: 1 });

module.exports = mongoose.model('Venta', ventaSchema);
