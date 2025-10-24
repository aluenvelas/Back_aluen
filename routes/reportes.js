const express = require('express');
const router = express.Router();
const Receta = require('../models/Receta');
const Material = require('../models/Material');
const Frasco = require('../models/Frasco');
const Activo = require('../models/Activo');
const Venta = require('../models/Venta');
const InventarioVela = require('../models/InventarioVela');

// GET /api/reportes/dashboard - Dashboard principal con estadísticas
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalMateriales,
      totalRecetas,
      totalFrascos,
      totalActivos,
      totalVentas,
      ingresosMes,
      materialesPorTipo,
      recetasActivas,
      activosPorTipo
    ] = await Promise.all([
      Material.countDocuments({ activo: true }),
      Receta.countDocuments({ activo: true }),
      Frasco.countDocuments({ activo: true }),
      Activo.countDocuments({ activo: true }),
      Venta.countDocuments({ estado: 'completada' }),
      Venta.aggregate([
        {
          $match: {
            estado: 'completada',
            fecha: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Material.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$tipo', count: { $sum: 1 } } }
      ]),
      Receta.find({ activo: true })
        .populate('cera.material', 'nombre tipo precioPorGramo')
        .populate('aditivo.material', 'nombre tipo precioPorGramo')
        .populate('esencia.material', 'nombre tipo precioPorGramo')
        .populate('frasco', 'nombre precio'),
      Activo.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$tipo', count: { $sum: 1 }, valorTotal: { $sum: '$valor' } } }
      ])
    ]);

    // Calcular estadísticas de costos
    const costoPromedioRecetas = recetasActivas.length > 0 
      ? recetasActivas.reduce((sum, receta) => sum + receta.costoPorUnidad, 0) / recetasActivas.length
      : 0;

    const valorTotalActivos = activosPorTipo.reduce((sum, activo) => sum + activo.valorTotal, 0);

    res.json({
      resumen: {
        totalMateriales,
        totalRecetas,
        totalFrascos,
        totalActivos,
        totalVentas,
        ingresosMes: ingresosMes[0]?.total || 0
      },
      materialesPorTipo,
      activosPorTipo,
      estadisticas: {
        costoPromedioRecetas: Math.round(costoPromedioRecetas * 100) / 100,
        valorTotalActivos,
        recetasActivas: recetasActivas.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reportes/costos - Reporte de costos por receta
router.get('/costos', async (req, res) => {
  try {
    const recetas = await Receta.find({ activo: true })
      .populate('cera.material', 'nombre tipo precioPorGramo')
      .populate('aditivo.material', 'nombre tipo precioPorGramo')
      .populate('esencia.material', 'nombre tipo precioPorGramo')
      .populate('frasco', 'nombre precio')
      .sort({ costoPorUnidad: -1 });

    const reporteCostos = recetas.map(receta => {
      const gramosCera = (receta.gramajeTotal * receta.cera.porcentaje) / 100;
      const gramosEsencia = (receta.gramajeTotal * receta.esencia.porcentaje) / 100;
      const gramosAditivo = receta.aditivo?.porcentaje ? 
        (receta.gramajeTotal * receta.aditivo.porcentaje) / 100 : 0;
      
      const componentes = [
        {
          nombre: receta.cera?.material?.nombre || 'N/A',
          tipo: 'Cera',
          porcentaje: receta.cera.porcentaje,
          gramos: gramosCera,
          costo: gramosCera * (receta.cera?.material?.precioPorGramo || 0)
        }
      ];

      if (receta.esencia && receta.esencia.material) {
        componentes.push({
          nombre: receta.esencia.material.nombre,
          tipo: 'Esencia',
          porcentaje: receta.esencia.porcentaje,
          gramos: gramosEsencia,
          costo: gramosEsencia * receta.esencia.material.precioPorGramo
        });
      }

      if (receta.aditivo?.material) {
        componentes.push({
          nombre: receta.aditivo.material.nombre,
          tipo: 'Aditivo',
          porcentaje: receta.aditivo.porcentaje,
          gramos: gramosAditivo,
          costo: gramosAditivo * receta.aditivo.material.precioPorGramo
        });
      }

      return {
        id: receta._id,
        nombre: receta.nombre,
        costoPorUnidad: receta.costoPorUnidad,
        costoTotal: receta.costoTotal,
        unidadesProducir: receta.unidadesProducir,
        gramajeTotal: receta.gramajeTotal,
        costoPorGramo: receta.costoPorUnidad / receta.gramajeTotal,
        molde: receta.molde?.nombre || 'Sin molde',
        frasco: receta.frasco?.nombre || 'Sin frasco',
        componentes: componentes
      };
    });

    res.json(reporteCostos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reportes/gramajes - Reporte de gramajes por receta
router.get('/gramajes', async (req, res) => {
  try {
    let filtros = { activo: true };

    const recetas = await Receta.find(filtros)
      .populate('cera.material', 'nombre tipo precioPorGramo')
      .populate('aditivo.material', 'nombre tipo precioPorGramo')
      .populate('esencia.material', 'nombre tipo precioPorGramo')
      .populate('frasco', 'nombre capacidad')
      .sort({ nombre: 1 });

    const reporteGramajes = recetas.map(receta => {
      const gramosCera = (receta.gramajeTotal * receta.cera.porcentaje) / 100;
      const gramosEsencia = (receta.gramajeTotal * receta.esencia.porcentaje) / 100;
      const gramosAditivo = receta.aditivo?.porcentaje ? 
        (receta.gramajeTotal * receta.aditivo.porcentaje) / 100 : 0;
      
      const componentes = [
        {
          nombre: receta.cera?.material?.nombre || 'N/A',
          tipo: 'Cera',
          porcentaje: receta.cera.porcentaje,
          gramos: gramosCera,
          gramosTotales: gramosCera * receta.unidadesProducir
        }
      ];

      if (receta.esencia && receta.esencia.material) {
        componentes.push({
          nombre: receta.esencia.material.nombre,
          tipo: 'Esencia',
          porcentaje: receta.esencia.porcentaje,
          gramos: gramosEsencia,
          gramosTotales: gramosEsencia * receta.unidadesProducir
        });
      }

      if (receta.aditivo?.material) {
        componentes.push({
          nombre: receta.aditivo.material.nombre,
          tipo: 'Aditivo',
          porcentaje: receta.aditivo.porcentaje,
          gramos: gramosAditivo,
          gramosTotales: gramosAditivo * receta.unidadesProducir
        });
      }

      return {
        receta: receta.nombre,
        frasco: receta.frasco ? {
          nombre: receta.frasco.nombre,
          capacidad: receta.frasco.capacidad
        } : null,
        gramajeTotal: receta.gramajeTotal,
        unidadesProducir: receta.unidadesProducir,
        componentes: componentes
      };
    });

    res.json(reporteGramajes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reportes/inventario - Reporte de inventario con alertas
router.get('/inventario', async (req, res) => {
  try {
    const [materiales, frascos, velasTerminadas] = await Promise.all([
      Material.find({ activo: true }).sort({ tipo: 1, nombre: 1 }),
      Frasco.find({ activo: true }).sort({ nombre: 1 }),
      InventarioVela.find({ activo: true }).populate('receta', 'nombre costoPorUnidad').sort({ nombreVela: 1 })
    ]);

    // Definir niveles de alerta (puedes ajustarlos según tu necesidad)
    const STOCK_MINIMO_MATERIALES = 100; // gramos
    const STOCK_MINIMO_FRASCOS = 10;     // unidades
    const STOCK_MINIMO_VELAS = 10;       // unidades

    const inventario = {
      materiales: materiales.map(mat => {
        const valorTotal = mat.stock * mat.precioPorGramo;
        const nivelStock = mat.stock < STOCK_MINIMO_MATERIALES ? 'bajo' : 
                          mat.stock < STOCK_MINIMO_MATERIALES * 2 ? 'medio' : 'alto';
        
        return {
          id: mat._id,
          nombre: mat.nombre,
          tipo: mat.tipo,
          stock: mat.stock,
          unidad: mat.unidad,
          precioPorUnidad: mat.precioPorGramo,
          valorTotal: valorTotal,
          nivelStock: nivelStock,
          necesitaCompra: mat.stock < STOCK_MINIMO_MATERIALES,
          cantidadSugerida: mat.stock < STOCK_MINIMO_MATERIALES ? 
            Math.ceil((STOCK_MINIMO_MATERIALES * 3 - mat.stock) / 100) * 100 : 0
        };
      }),
      frascos: frascos.map(frasco => {
        const valorTotal = frasco.stock * frasco.precio;
        const nivelStock = frasco.stock < STOCK_MINIMO_FRASCOS ? 'bajo' : 
                          frasco.stock < STOCK_MINIMO_FRASCOS * 2 ? 'medio' : 'alto';
        
        return {
          id: frasco._id,
          nombre: frasco.nombre,
          capacidad: frasco.capacidad,
          stock: frasco.stock,
          precio: frasco.precio,
          valorTotal: valorTotal,
          nivelStock: nivelStock,
          necesitaCompra: frasco.stock < STOCK_MINIMO_FRASCOS,
          cantidadSugerida: frasco.stock < STOCK_MINIMO_FRASCOS ? 
            STOCK_MINIMO_FRASCOS * 3 - frasco.stock : 0
        };
      }),
      velasTerminadas: velasTerminadas.map(vela => {
        const costoPorUnidad = vela.receta?.costoPorUnidad || 0;
        const valorTotal = vela.stockActual * costoPorUnidad;
        const nivelStock = vela.stockActual <= vela.stockMinimo ? 'bajo' : 
                          vela.stockActual <= vela.stockMinimo * 2 ? 'medio' : 'alto';
        
        return {
          id: vela._id,
          nombreVela: vela.nombreVela,
          recetaId: vela.receta?._id,
          stockActual: vela.stockActual,
          stockMinimo: vela.stockMinimo,
          costoPorUnidad: costoPorUnidad,
          valorTotal: valorTotal,
          nivelStock: nivelStock,
          necesitaProduccion: vela.stockActual <= vela.stockMinimo,
          cantidadSugerida: vela.stockActual <= vela.stockMinimo ? 
            vela.stockMinimo * 3 - vela.stockActual : 0,
          ultimaProduccion: vela.ultimaProduccion,
          ultimaVenta: vela.ultimaVenta
        };
      })
    };

    // Resumen de alertas
    const alertas = {
      materialesBajos: inventario.materiales.filter(m => m.necesitaCompra),
      frascosBajos: inventario.frascos.filter(f => f.necesitaCompra),
      velasBajas: inventario.velasTerminadas.filter(v => v.necesitaProduccion),
      totalAlertas: 0
    };
    alertas.totalAlertas = alertas.materialesBajos.length + 
                           alertas.frascosBajos.length +
                           alertas.velasBajas.length;

    // Valor total del inventario
    const valorTotalMateriales = inventario.materiales.reduce((sum, m) => sum + m.valorTotal, 0);
    const valorTotalFrascos = inventario.frascos.reduce((sum, f) => sum + f.valorTotal, 0);
    const valorTotalVelas = inventario.velasTerminadas.reduce((sum, v) => sum + v.valorTotal, 0);

    res.json({
      inventario,
      alertas,
      resumen: {
        valorTotalMateriales,
        valorTotalFrascos,
        valorTotalVelas,
        valorTotal: valorTotalMateriales + valorTotalFrascos + valorTotalVelas,
        cantidadTiposMateriales: materiales.length,
        cantidadTiposFrascos: frascos.length,
        cantidadTiposVelas: velasTerminadas.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

