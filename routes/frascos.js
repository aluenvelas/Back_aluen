const express = require('express');
const router = express.Router();
const Frasco = require('../models/Frasco');
const { body, validationResult } = require('express-validator');

// GET /api/frascos - Obtener todos los frascos
router.get('/', async (req, res) => {
  try {
    const { activo } = req.query;
    let filtros = {};
    
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    const frascos = await Frasco.find(filtros).sort({ fechaCreacion: -1 });
    res.json(frascos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/frascos/:id - Obtener un frasco por ID
router.get('/:id', async (req, res) => {
  try {
    const frasco = await Frasco.findById(req.params.id);
    if (!frasco) {
      return res.status(404).json({ error: 'Frasco no encontrado' });
    }
    res.json(frasco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/frascos - Crear nuevo frasco
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('capacidad').isNumeric().withMessage('La capacidad debe ser numérica'),
  body('material').notEmpty().withMessage('El material es requerido'),
  body('precio').isNumeric().withMessage('El precio debe ser numérico'),
  body('proveedor').notEmpty().withMessage('El proveedor es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const frasco = new Frasco(req.body);
    await frasco.save();
    res.status(201).json(frasco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/frascos/:id - Actualizar frasco
router.put('/:id', async (req, res) => {
  try {
    const frasco = await Frasco.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!frasco) {
      return res.status(404).json({ error: 'Frasco no encontrado' });
    }
    
    res.json(frasco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/frascos/:id - Eliminar frasco (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const frasco = await Frasco.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!frasco) {
      return res.status(404).json({ error: 'Frasco no encontrado' });
    }
    
    res.json({ message: 'Frasco desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


