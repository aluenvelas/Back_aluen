const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { body, validationResult } = require('express-validator');

// GET /api/materiales - Obtener todos los materiales
router.get('/', async (req, res) => {
  try {
    const { tipo, activo } = req.query;
    let filtros = {};
    
    if (tipo) filtros.tipo = tipo;
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    const materiales = await Material.find(filtros).sort({ fechaCreacion: -1 });
    res.json(materiales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/materiales/:id - Obtener un material por ID
router.get('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/materiales - Crear nuevo material
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('tipo').isIn(['cera', 'aditivo', 'esencia', 'otro']).withMessage('Tipo inválido'),
  body('precioPorGramo').isNumeric().withMessage('El precio debe ser numérico'),
  body('proveedor').notEmpty().withMessage('El proveedor es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const material = new Material(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/materiales/:id - Actualizar material
router.put('/:id', async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/materiales/:id - Eliminar material (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }
    
    res.json({ message: 'Material desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


