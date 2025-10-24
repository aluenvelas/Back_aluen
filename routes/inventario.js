const express = require('express');
const router = express.Router();
const InventarioVela = require('../models/InventarioVela');
const Receta = require('../models/Receta');

// GET /api/inventario - Obtener todo el inventario de velas
router.get('/', async (req, res) => {
  try {
    const { activo } = req.query;
    let filtros = {};
    
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    console.log('📦 Buscando inventario con filtros:', filtros);
    
    const inventario = await InventarioVela.find(filtros)
      .populate({
        path: 'receta',
        select: 'codigo nombre imagenUrl precioVentaSugerido',
        populate: [
          { path: 'frasco', select: 'nombre capacidad imagenUrl' }
        ]
      })
      .sort({ nombreVela: 1 });
    
    console.log(`✅ Inventario encontrado: ${inventario.length} items`);
    
    res.json(inventario);
  } catch (error) {
    console.error('❌ Error en GET /api/inventario:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET /api/inventario/:id - Obtener un item específico del inventario
router.get('/:id', async (req, res) => {
  try {
    const item = await InventarioVela.findById(req.params.id)
      .populate({
        path: 'receta',
        select: 'codigo nombre imagenUrl precioVentaSugerido costoPorUnidad costosFijosTotales',
        populate: [
          { path: 'frasco', select: 'nombre capacidad imagenUrl' }
        ]
      });
    
    if (!item) {
      return res.status(404).json({ error: 'Item de inventario no encontrado' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventario/:id - Actualizar stock
router.put('/:id', async (req, res) => {
  try {
    const { stockMinimo, stockActual, ajuste, motivo } = req.body;
    
    const item = await InventarioVela.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item de inventario no encontrado' });
    }
    
    const stockAnterior = item.stockActual;
    
    // Actualizar campos según lo que se envíe
    if (stockMinimo !== undefined) {
      item.stockMinimo = stockMinimo;
    }
    
    if (stockActual !== undefined) {
      item.stockActual = stockActual;
    } else if (ajuste !== undefined) {
      // Permitir ajuste incremental (positivo o negativo)
      item.stockActual += ajuste;
      
      // No permitir stock negativo
      if (item.stockActual < 0) {
        return res.status(400).json({ 
          error: 'El ajuste resultaría en stock negativo',
          stockActual: stockAnterior,
          ajusteSolicitado: ajuste
        });
      }
    }
    
    await item.save();
    
    await item.populate({
      path: 'receta',
      select: 'codigo nombre imagenUrl precioVentaSugerido'
    });
    
    // Log del cambio
    console.log(`📦 Inventario actualizado: ${item.nombreVela}`);
    console.log(`   Stock anterior: ${stockAnterior}`);
    console.log(`   Stock nuevo: ${item.stockActual}`);
    if (motivo) console.log(`   Motivo: ${motivo}`);
    
    res.json({
      ...item.toObject(),
      cambio: {
        stockAnterior,
        stockNuevo: item.stockActual,
        diferencia: item.stockActual - stockAnterior,
        motivo: motivo || 'Ajuste manual'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inventario/:id - Eliminar item del inventario (solo si stock = 0)
router.delete('/:id', async (req, res) => {
  try {
    const item = await InventarioVela.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item de inventario no encontrado' });
    }
    
    // Validar que el stock sea 0
    if (item.stockActual > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un producto con stock disponible',
        stockActual: item.stockActual,
        mensaje: 'Primero debes ajustar el stock a 0 o vender todas las unidades'
      });
    }
    
    const nombreVela = item.nombreVela;
    const recetaCodigo = item.receta?.codigo || 'N/A';
    
    // Eliminar el item del inventario
    await InventarioVela.findByIdAndDelete(req.params.id);
    
    console.log(`🗑️ Item eliminado del inventario: ${nombreVela} (${recetaCodigo})`);
    
    res.json({
      mensaje: 'Producto eliminado del inventario exitosamente',
      nombreVela,
      codigo: recetaCodigo,
      eliminado: true
    });
  } catch (error) {
    console.error('❌ Error al eliminar del inventario:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventario/bajo-stock - Obtener items con stock bajo
router.get('/alerta/bajo-stock', async (req, res) => {
  try {
    const inventario = await InventarioVela.find({ activo: true })
      .populate({
        path: 'receta',
        select: 'codigo nombre imagenUrl precioVentaSugerido'
      });
    
    // Filtrar items con stock bajo
    const bajoStock = inventario.filter(item => item.esBajoStock());
    
    res.json(bajoStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

