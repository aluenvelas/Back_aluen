const express = require('express');
const router = express.Router();
const Venta = require('../models/Venta');
const InventarioVela = require('../models/InventarioVela');
const Receta = require('../models/Receta');
const { body, validationResult } = require('express-validator');

// GET /api/ventas - Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const { 
      estado, 
      fechaInicio, 
      fechaFin, 
      cliente, 
      metodoPago,
      page = 1,
      limit = 50
    } = req.query;
    
    const query = {};
    
    if (estado) query.estado = estado;
    if (metodoPago) query.metodoPago = metodoPago;
    if (cliente) query['cliente.nombre'] = new RegExp(cliente, 'i');
    
    if (fechaInicio || fechaFin) {
      query.fecha = {};
      if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) query.fecha.$lte = new Date(fechaFin);
    }
    
    const ventas = await Venta.find(query)
      .populate('items.receta', 'nombre')
      .populate('items.frasco', 'nombre capacidad')
      .populate('creadoPor', 'nombre email')
      .sort({ fecha: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Venta.countDocuments(query);
    
    res.json({
      ventas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ventas/estadisticas - Estadísticas de ventas
router.get('/estadisticas', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const query = {};
    if (fechaInicio || fechaFin) {
      query.fecha = {};
      if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) query.fecha.$lte = new Date(fechaFin);
    }
    
    // Total de ventas
    const totalVentas = await Venta.countDocuments({ ...query, estado: 'completada' });
    
    // Ingresos totales
    const ingresosTotales = await Venta.aggregate([
      { $match: { ...query, estado: 'completada' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Ventas por método de pago
    const ventasPorMetodo = await Venta.aggregate([
      { $match: { ...query, estado: 'completada' } },
      { $group: { _id: '$metodoPago', total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);
    
    // Productos más vendidos
    const productosMasVendidos = await Venta.aggregate([
      { $match: { ...query, estado: 'completada' } },
      { $unwind: '$items' },
      { $group: { 
          _id: '$items.receta', 
          cantidad: { $sum: '$items.cantidad' },
          ingresos: { $sum: '$items.subtotal' }
        } 
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: 'recetas',
          localField: '_id',
          foreignField: '_id',
          as: 'receta'
        }
      },
      { $unwind: '$receta' },
      { $project: {
          nombre: '$receta.nombre',
          cantidad: 1,
          ingresos: 1
        }
      }
    ]);
    
    // Ventas por día (últimos 30 días)
    const ventasPorDia = await Venta.aggregate([
      { $match: { 
          fecha: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          estado: 'completada'
        } 
      },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      totalVentas,
      ingresosTotales: ingresosTotales[0]?.total || 0,
      ventasPorMetodo,
      productosMasVendidos,
      ventasPorDia
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ventas/:id - Obtener una venta
router.get('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('items.receta', 'nombre descripcion')
      .populate('items.frasco', 'nombre capacidad')
      .populate('creadoPor', 'nombre email');
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ventas - Crear venta y descontar inventario de velas
router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.receta').notEmpty().withMessage('La receta es requerida'),
  body('items.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0'),
  body('items.*.precioUnitario').isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // PASO 1: VERIFICAR inventario ANTES de hacer cambios
    const itemsInventario = [];
    for (const item of req.body.items) {
      const receta = await Receta.findById(item.receta);
      if (!receta) {
        return res.status(400).json({ 
          error: `Receta no encontrada con ID: ${item.receta}`
        });
      }
      
      const inventarioVela = await InventarioVela.findOne({ nombreVela: receta.nombre, activo: true });
      
      if (!inventarioVela) {
        return res.status(400).json({ 
          error: `No hay inventario registrado para "${receta.nombre}". Produce velas antes de vender.`
        });
      }
      
      if (inventarioVela.stockActual < item.cantidad) {
        return res.status(400).json({ 
          error: `Stock insuficiente de "${inventarioVela.nombreVela}". Disponible: ${inventarioVela.stockActual}, Solicitado: ${item.cantidad}`
        });
      }
      
      itemsInventario.push({
        inventarioVela,
        cantidad: item.cantidad
      });
    }
    
    // PASO 2: Generar número de venta y crear la venta
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    
    const ultimaVenta = await Venta.findOne({ 
      numeroVenta: new RegExp(`^V-${year}${month}`) 
    }).sort({ numeroVenta: -1 });
    
    let secuencia = 1;
    if (ultimaVenta) {
      const partes = ultimaVenta.numeroVenta.split('-');
      secuencia = parseInt(partes[2]) + 1;
    }
    
    const numeroVenta = `V-${year}${month}-${String(secuencia).padStart(4, '0')}`;
    
    // Asegurar que cliente tenga un nombre (por defecto "Cliente")
    const clienteData = {
      ...req.body.cliente,
      nombre: req.body.cliente?.nombre || 'Cliente'
    };
    
    // Obtener nombre del punto de venta si se proporcionó
    let puntoVentaNombre = null;
    if (req.body.puntoVenta) {
      const PuntoVenta = require('../models/PuntoVenta');
      const puntoVenta = await PuntoVenta.findById(req.body.puntoVenta);
      if (puntoVenta) {
        puntoVentaNombre = puntoVenta.nombre;
      }
    }
    
    const ventaData = {
      ...req.body,
      cliente: clienteData,
      puntoVentaNombre: puntoVentaNombre,
      numeroVenta: numeroVenta,
      creadoPor: req.usuario?._id
    };
    
    const venta = new Venta(ventaData);
    await venta.save();
    
    // PASO 3: SOLO AHORA descontar inventario (después de que la venta se guardó exitosamente)
    const descontados = [];
    for (const itemInv of itemsInventario) {
      await itemInv.inventarioVela.descontarStock(itemInv.cantidad);
      descontados.push({
        nombre: itemInv.inventarioVela.nombreVela,
        cantidad: itemInv.cantidad,
        stockRestante: itemInv.inventarioVela.stockActual
      });
      
      console.log(`✅ Inventario de vela descontado: ${itemInv.inventarioVela.nombreVela} (-${itemInv.cantidad} unidades, quedan: ${itemInv.inventarioVela.stockActual})`);
    }
    
    await venta.populate('items.receta items.frasco creadoPor');
    
    res.status(201).json({
      venta,
      mensaje: `Venta registrada exitosamente. Se descontó el inventario de velas.`,
      inventarioDescontado: descontados
    });
  } catch (error) {
    console.error('❌ Error al crear venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ventas/:id - Actualizar venta
router.put('/:id', async (req, res) => {
  try {
    const venta = await Venta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('items.receta items.molde items.frasco creadoPor');
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ventas/:id - Eliminar venta
router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findByIdAndDelete(req.params.id);
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json({ message: 'Venta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/ventas/:id/estado - Cambiar estado de venta
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    
    if (!['pendiente', 'completada', 'cancelada', 'reembolsada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const venta = await Venta.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    ).populate('items.receta items.molde items.frasco');
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
