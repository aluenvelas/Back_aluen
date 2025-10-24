const express = require('express');
const router = express.Router();
const PuntoVenta = require('../models/PuntoVenta');
const { body, validationResult } = require('express-validator');

// GET /api/puntos-venta - Obtener todos los puntos de venta
router.get('/', async (req, res) => {
  try {
    const { activo } = req.query;
    const filtros = {};
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    
    const puntosVenta = await PuntoVenta.find(filtros).sort({ nombre: 1 });
    
    console.log(`📍 Puntos de venta encontrados: ${puntosVenta.length}`);
    
    res.json(puntosVenta);
  } catch (error) {
    console.error('❌ Error al obtener puntos de venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/puntos-venta/:id - Obtener un punto de venta por ID
router.get('/:id', async (req, res) => {
  try {
    const puntoVenta = await PuntoVenta.findById(req.params.id);
    
    if (!puntoVenta) {
      return res.status(404).json({ error: 'Punto de venta no encontrado' });
    }
    
    res.json(puntoVenta);
  } catch (error) {
    console.error('❌ Error al obtener punto de venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/puntos-venta - Crear un nuevo punto de venta
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const puntoVenta = new PuntoVenta(req.body);
    await puntoVenta.save();
    
    console.log(`✅ Punto de venta creado: ${puntoVenta.nombre}`);
    
    res.status(201).json(puntoVenta);
  } catch (error) {
    console.error('❌ Error al crear punto de venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/puntos-venta/:id - Actualizar un punto de venta
router.put('/:id', async (req, res) => {
  try {
    const puntoVenta = await PuntoVenta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!puntoVenta) {
      return res.status(404).json({ error: 'Punto de venta no encontrado' });
    }
    
    console.log(`✅ Punto de venta actualizado: ${puntoVenta.nombre}`);
    
    res.json(puntoVenta);
  } catch (error) {
    console.error('❌ Error al actualizar punto de venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/puntos-venta/:id - Eliminar (desactivar) un punto de venta
router.delete('/:id', async (req, res) => {
  try {
    const puntoVenta = await PuntoVenta.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!puntoVenta) {
      return res.status(404).json({ error: 'Punto de venta no encontrado' });
    }
    
    console.log(`🗑️ Punto de venta desactivado: ${puntoVenta.nombre}`);
    
    res.json({ 
      mensaje: 'Punto de venta desactivado exitosamente',
      puntoVenta
    });
  } catch (error) {
    console.error('❌ Error al eliminar punto de venta:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

