const mongoose = require('mongoose');

const recetaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  // Componentes de la vela con porcentajes configurables
  cera: {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true
    },
    porcentaje: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 85
    }
  },
  aditivo: {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: false
    },
    porcentaje: {
      type: Number,
      min: 0,
      max: 100,
      default: 5
    }
  },
  esencia: {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true
    },
    porcentaje: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10
    }
  },
  frasco: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frasco',
    required: true
  },
  // Producción
  gramajeTotal: {
    type: Number,
    required: true,
    min: 0
  },
  unidadesProducir: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  // Cálculos
  costoPorUnidad: {
    type: Number,
    default: 0
  },
  costoTotal: {
    type: Number,
    default: 0
  },
  // Costos fijos por unidad
  costosFijos: {
    pabiloChapeta: { type: Number, default: 500 },
    trabajo: { type: Number, default: 2500 },
    servicios: { type: Number, default: 400 },
    servilletas: { type: Number, default: 200 },
    anilina: { type: Number, default: 50 },
    stickers: { type: Number, default: 100 },
    empaque: { type: Number, default: 1000 }
  },
  costosFijosTotales: {
    type: Number,
    default: 4750 // Suma de todos los costos fijos
  },
  porcentajeGanancia: {
    type: Number,
    default: 20, // 20% de ganancia
    min: 0,
    max: 100
  },
  precioVentaSugerido: {
    type: Number,
    default: 0
  },
  imagenUrl: {
    type: String,
    default: ''
  },
  inventarioDescontado: {
    type: Boolean,
    default: false
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

// Middleware para generar código automático si no existe
recetaSchema.pre('save', async function(next) {
  try {
    // Generar código si no existe
    if (!this.codigo) {
      const Material = mongoose.model('Material');
      
      // Obtener el material de cera para generar el prefijo
      let prefijoCera = 'REC';
      if (this.cera && this.cera.material) {
        const ceraDoc = await Material.findById(this.cera.material);
        if (ceraDoc) {
          // Extraer identificador del nombre de la cera
          // Ejemplos: "Cera de Soja" -> "SOJ", "Cera Parafina" -> "PAR"
          const nombreCera = ceraDoc.nombre.toUpperCase();
          
          // Buscar la última palabra del nombre (generalmente el tipo)
          const palabras = nombreCera.split(/\s+/);
          const ultimaPalabra = palabras[palabras.length - 1];
          
          // Tomar las primeras 3 letras de la última palabra
          prefijoCera = ultimaPalabra.substring(0, 3);
          
          // Si la última palabra es muy corta, usar las primeras letras del nombre completo
          if (prefijoCera.length < 3) {
            prefijoCera = nombreCera.replace(/[^A-Z]/g, '').substring(0, 3);
          }
        }
      }
      
      // Buscar la última receta con el mismo prefijo
      const ultimaRecetaConPrefijo = await this.constructor
        .findOne({ codigo: new RegExp(`^${prefijoCera}-`) })
        .sort({ fechaCreacion: -1 });
      
      let numeroSecuencial = 1;
      if (ultimaRecetaConPrefijo && ultimaRecetaConPrefijo.codigo) {
        // Extraer el número del código (formato: SOJ-0001, PAR-0002, etc.)
        const match = ultimaRecetaConPrefijo.codigo.match(/[A-Z]+-(\d+)/);
        if (match) {
          numeroSecuencial = parseInt(match[1]) + 1;
        }
      }
      
      // Generar código con formato [CERA]-0001, [CERA]-0002, etc.
      this.codigo = `${prefijoCera}-${numeroSecuencial.toString().padStart(4, '0')}`;
    }
    
    // Obtener modelos para cálculo de costos
    const Material = mongoose.model('Material');
    const Frasco = mongoose.model('Frasco');
    
    let costoPorUnidad = 0;
    
    // Calcular costo de la CERA
    if (this.cera && this.cera.material) {
      const ceraDoc = await Material.findById(this.cera.material);
      if (ceraDoc) {
        const gramosCera = Math.ceil((this.gramajeTotal * this.cera.porcentaje) / 100);
        costoPorUnidad += gramosCera * ceraDoc.precioPorGramo;
      }
    }
    
    // Calcular costo del ADITIVO (si existe)
    if (this.aditivo && this.aditivo.material && this.aditivo.porcentaje > 0) {
      const aditivoDoc = await Material.findById(this.aditivo.material);
      if (aditivoDoc) {
        const gramosAditivo = Math.ceil((this.gramajeTotal * this.aditivo.porcentaje) / 100);
        costoPorUnidad += gramosAditivo * aditivoDoc.precioPorGramo;
      }
    }
    
    // Calcular costo de la ESENCIA
    if (this.esencia && this.esencia.material) {
      const esenciaDoc = await Material.findById(this.esencia.material);
      if (esenciaDoc) {
        const gramosEsencia = Math.ceil((this.gramajeTotal * this.esencia.porcentaje) / 100);
        costoPorUnidad += gramosEsencia * esenciaDoc.precioPorGramo;
      }
    }
    
    // Agregar costo del FRASCO
    if (this.frasco) {
      const frasco = await Frasco.findById(this.frasco);
      if (frasco) {
        costoPorUnidad += frasco.precio;
      }
    }
    
    // Calcular suma de costos fijos
    const costosFijosSum = (this.costosFijos?.pabiloChapeta || 500) +
                           (this.costosFijos?.trabajo || 2500) +
                           (this.costosFijos?.servicios || 400) +
                           (this.costosFijos?.servilletas || 200) +
                           (this.costosFijos?.anilina || 50) +
                           (this.costosFijos?.stickers || 100) +
                           (this.costosFijos?.empaque || 1000);
    
    this.costosFijosTotales = costosFijosSum;
    
    // Costo por unidad SIN costos fijos (solo materiales + frasco)
    const costoMaterialesPorUnidad = Math.ceil(costoPorUnidad);
    
    // Costo por unidad CON costos fijos
    const costoCompletoPorUnidad = costoMaterialesPorUnidad + costosFijosSum;
    
    // Calcular precio de venta con porcentaje de ganancia
    const porcentaje = this.porcentajeGanancia || 20;
    const precioVenta = Math.ceil(costoCompletoPorUnidad * (1 + porcentaje / 100) / 500) * 500;
    
    // Asignar valores
    this.costoPorUnidad = costoMaterialesPorUnidad; // Costo solo de materiales
    this.costoTotal = Math.ceil(costoMaterialesPorUnidad * (this.unidadesProducir || 1));
    this.precioVentaSugerido = precioVenta;
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Receta', recetaSchema);

