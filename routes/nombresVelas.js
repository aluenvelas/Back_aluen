const express = require('express');
const router = express.Router();
const NombreVela = require('../models/NombreVela');
const { body, validationResult } = require('express-validator');

// GET /api/nombres-velas - Obtener todos los nombres de velas
router.get('/', async (req, res) => {
  try {
    const { activo } = req.query;
    let filtros = {};
    
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    const nombresVelas = await NombreVela.find(filtros)
      .populate('frasco', 'nombre capacidad material imagenUrl')
      .populate('esencia', 'nombre tipo')
      .sort({ fechaCreacion: -1 });
    
    res.json(nombresVelas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/nombres-velas/:id - Obtener un nombre de vela por ID
router.get('/:id', async (req, res) => {
  try {
    const nombreVela = await NombreVela.findById(req.params.id)
      .populate('frasco', 'nombre capacidad material imagenUrl')
      .populate('esencia', 'nombre tipo');
    
    if (!nombreVela) {
      return res.status(404).json({ error: 'Nombre de vela no encontrado' });
    }
    
    res.json(nombreVela);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/nombres-velas - Crear nuevo nombre de vela
router.post('/', [
  body('frasco').notEmpty().withMessage('El frasco es requerido'),
  body('esencia').notEmpty().withMessage('La esencia es requerida'),
  body('color').notEmpty().withMessage('El color es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('Datos recibidos:', req.body);

    const nombreVela = new NombreVela(req.body);
    
    console.log('NombreVela antes de guardar:', {
      frasco: nombreVela.frasco,
      esencia: nombreVela.esencia,
      color: nombreVela.color
    });
    
    await nombreVela.save();
    
    console.log('NombreVela después de guardar:', {
      nombre: nombreVela.nombre,
      frasco: nombreVela.frasco,
      esencia: nombreVela.esencia,
      color: nombreVela.color
    });
    
    await nombreVela.populate('frasco esencia');
    
    res.status(201).json(nombreVela);
  } catch (error) {
    console.error('Error completo:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un nombre de vela con esta combinación' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/nombres-velas/:id - Actualizar nombre de vela
router.put('/:id', async (req, res) => {
  try {
    const nombreVela = await NombreVela.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('frasco esencia');
    
    if (!nombreVela) {
      return res.status(404).json({ error: 'Nombre de vela no encontrado' });
    }
    
    res.json(nombreVela);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/nombres-velas/:id - Desactivar nombre de vela
router.delete('/:id', async (req, res) => {
  try {
    const nombreVela = await NombreVela.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!nombreVela) {
      return res.status(404).json({ error: 'Nombre de vela no encontrado' });
    }
    
    res.json({ message: 'Nombre de vela desactivado exitosamente', nombreVela });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

