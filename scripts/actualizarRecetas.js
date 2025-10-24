const mongoose = require('mongoose');
const Receta = require('../models/Receta');
const Material = require('../models/Material');
const Frasco = require('../models/Frasco');

// Conectar a MongoDB
mongoose.connect('mongodb+srv://aluenvelas_db_user:u2RGRUonprWD1egd@aluen.1mecgp9.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function actualizarRecetas() {
  try {
    console.log('🔄 Iniciando actualización de recetas...');
    
    // Obtener todas las recetas
    const recetas = await Receta.find();
    
    console.log(`📊 Total de recetas encontradas: ${recetas.length}`);
    
    let actualizadas = 0;
    
    for (const receta of recetas) {
      try {
        // Verificar si ya tiene los campos nuevos
        if (receta.precioVentaSugerido && receta.precioVentaSugerido > 0) {
          console.log(`⏭️  Saltando ${receta.nombre} - Ya tiene precio de venta`);
          continue;
        }
        
        console.log(`\n🔧 Procesando: ${receta.nombre}`);
        
        // Recalcular costos
        let costoPorUnidad = 0;
        
        // Calcular costo de la CERA
        if (receta.cera && receta.cera.material) {
          const ceraDoc = await Material.findById(receta.cera.material);
          if (ceraDoc) {
            const gramosCera = Math.ceil((receta.gramajeTotal * receta.cera.porcentaje) / 100);
            costoPorUnidad += gramosCera * ceraDoc.precioPorGramo;
            console.log(`  • Cera: ${gramosCera}g × $${ceraDoc.precioPorGramo} = $${(gramosCera * ceraDoc.precioPorGramo).toFixed(2)}`);
          }
        }
        
        // Calcular costo del ADITIVO (si existe)
        if (receta.aditivo && receta.aditivo.material && receta.aditivo.porcentaje > 0) {
          const aditivoDoc = await Material.findById(receta.aditivo.material);
          if (aditivoDoc) {
            const gramosAditivo = Math.ceil((receta.gramajeTotal * receta.aditivo.porcentaje) / 100);
            costoPorUnidad += gramosAditivo * aditivoDoc.precioPorGramo;
            console.log(`  • Aditivo: ${gramosAditivo}g × $${aditivoDoc.precioPorGramo} = $${(gramosAditivo * aditivoDoc.precioPorGramo).toFixed(2)}`);
          }
        }
        
        // Calcular costo de la ESENCIA
        if (receta.esencia && receta.esencia.material) {
          const esenciaDoc = await Material.findById(receta.esencia.material);
          if (esenciaDoc) {
            const gramosEsencia = Math.ceil((receta.gramajeTotal * receta.esencia.porcentaje) / 100);
            costoPorUnidad += gramosEsencia * esenciaDoc.precioPorGramo;
            console.log(`  • Esencia: ${gramosEsencia}g × $${esenciaDoc.precioPorGramo} = $${(gramosEsencia * esenciaDoc.precioPorGramo).toFixed(2)}`);
          }
        }
        
        // Agregar costo del FRASCO
        if (receta.frasco) {
          const frasco = await Frasco.findById(receta.frasco);
          if (frasco) {
            costoPorUnidad += frasco.precio;
            console.log(`  • Frasco: $${frasco.precio.toFixed(2)}`);
          }
        }
        
        // Calcular suma de costos fijos
        const costosFijosSum = 500 + 2500 + 400 + 200 + 50 + 100 + 1000;
        
        // Costo por unidad SIN costos fijos (solo materiales + frasco)
        const costoMaterialesPorUnidad = Math.ceil(costoPorUnidad);
        
        // Costo por unidad CON costos fijos
        const costoCompletoPorUnidad = costoMaterialesPorUnidad + costosFijosSum;
        
        // Calcular precio de venta con porcentaje de ganancia
        const porcentaje = 20;
        const precioVenta = Math.ceil(costoCompletoPorUnidad * (1 + porcentaje / 100) / 500) * 500;
        
        // Asignar campos si no existen
        if (!receta.costosFijos) {
          receta.costosFijos = {
            pabiloChapeta: 500,
            trabajo: 2500,
            servicios: 400,
            servilletas: 200,
            anilina: 50,
            stickers: 100,
            empaque: 1000
          };
        }
        
        receta.costosFijosTotales = costosFijosSum;
        receta.porcentajeGanancia = porcentaje;
        receta.costoPorUnidad = costoMaterialesPorUnidad;
        receta.costoTotal = Math.ceil(costoMaterialesPorUnidad * (receta.unidadesProducir || 1));
        receta.precioVentaSugerido = precioVenta;
        
        // Guardar sin disparar el middleware pre-save
        await Receta.updateOne(
          { _id: receta._id },
          {
            $set: {
              costoPorUnidad: costoMaterialesPorUnidad,
              costoTotal: Math.ceil(costoMaterialesPorUnidad * (receta.unidadesProducir || 1)),
              costosFijos: receta.costosFijos,
              costosFijosTotales: costosFijosSum,
              porcentajeGanancia: porcentaje,
              precioVentaSugerido: precioVenta
            }
          }
        );
        
        console.log(`  ✅ Actualizada:`);
        console.log(`     - Costo Materiales: $${costoMaterialesPorUnidad.toFixed(2)}`);
        console.log(`     - Costos Fijos: $${costosFijosSum.toFixed(2)}`);
        console.log(`     - Costo Total: $${costoCompletoPorUnidad.toFixed(2)}`);
        console.log(`     - Precio Venta: $${precioVenta.toFixed(2)}`);
        
        actualizadas++;
        
      } catch (error) {
        console.error(`❌ Error procesando ${receta.nombre}:`, error.message);
      }
    }
    
    console.log(`\n✅ Proceso completado!`);
    console.log(`📊 Recetas actualizadas: ${actualizadas} de ${recetas.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

actualizarRecetas();


