const express = require('express');
const router = express.Router();
const Activo = require('../models/Activo');
const { body, validationResult } = require('express-validator');

// GET /api/activos - Obtener todos los activos
router.get('/', async (req, res) => {
  try {
    const { tipo, estado, activo } = req.query;
    let filtros = {};
    
    if (tipo) filtros.tipo = tipo;
    if (estado) filtros.estado = estado;
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    const activos = await Activo.find(filtros).sort({ fechaCreacion: -1 });
    res.json(activos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activos/:id - Obtener un activo por ID
router.get('/:id', async (req, res) => {
  try {
    const activo = await Activo.findById(req.params.id);
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    res.json(activo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/activos - Crear nuevo activo
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('tipo').isIn(['equipo', 'herramienta', 'mueble', 'tecnologia', 'otro']).withMessage('Tipo inválido'),
  body('valor').isNumeric().withMessage('El valor debe ser numérico'),
  body('fechaAdquisicion').isISO8601().withMessage('Fecha de adquisición inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const activo = new Activo(req.body);
    await activo.save();
    res.status(201).json(activo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/activos/:id - Actualizar activo
router.put('/:id', async (req, res) => {
  try {
    const activo = await Activo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    
    res.json(activo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/activos/:id - Eliminar activo (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const activo = await Activo.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    
    res.json({ message: 'Activo desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


