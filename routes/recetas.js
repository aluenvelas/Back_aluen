const express = require('express');
const router = express.Router();
const Receta = require('../models/Receta');
const Material = require('../models/Material');
const Frasco = require('../models/Frasco');
const InventarioVela = require('../models/InventarioVela');
const { body, validationResult } = require('express-validator');

// GET /api/recetas - Obtener todas las recetas
router.get('/', async (req, res) => {
  try {
    const { activo } = req.query;
    let filtros = {};
    
    if (activo !== undefined) filtros.activo = activo === 'true';
    
    const recetas = await Receta.find(filtros)
      .populate('cera.material', 'nombre tipo precioPorGramo')
      .populate('aditivo.material', 'nombre tipo precioPorGramo')
      .populate('esencia.material', 'nombre tipo precioPorGramo')
      .populate('frasco', 'nombre capacidad precio material imagenUrl')
      .sort({ fechaCreacion: -1 });
    
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recetas/:id - Obtener una receta por ID
router.get('/:id', async (req, res) => {
  try {
    const receta = await Receta.findById(req.params.id)
      .populate('cera.material', 'nombre tipo precioPorGramo')
      .populate('aditivo.material', 'nombre tipo precioPorGramo')
      .populate('esencia.material', 'nombre tipo precioPorGramo')
      .populate('frasco', 'nombre capacidad precio material imagenUrl');
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    res.json(receta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recetas - Crear nueva receta y descontar inventario
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('cera.material').isMongoId().withMessage('ID de cera inválido'),
  body('cera.porcentaje').isNumeric().withMessage('Porcentaje de cera debe ser numérico'),
  body('esencia.material').isMongoId().withMessage('ID de esencia inválido'),
  body('esencia.porcentaje').isNumeric().withMessage('Porcentaje de esencia debe ser numérico'),
  body('frasco').isMongoId().withMessage('ID de frasco inválido'),
  body('gramajeTotal').isNumeric().withMessage('El gramaje total debe ser numérico'),
  body('unidadesProducir').isNumeric().withMessage('Las unidades a producir deben ser numéricas')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gramajeTotal, unidadesProducir } = req.body;
    const totalGramosProduccion = gramajeTotal * unidadesProducir;

    // Calcular gramos necesarios de cada material
    const gramosCera = (totalGramosProduccion * req.body.cera.porcentaje) / 100;
    const gramosEsencia = (totalGramosProduccion * req.body.esencia.porcentaje) / 100;
    const gramosAditivo = req.body.aditivo?.material ? 
      (totalGramosProduccion * req.body.aditivo.porcentaje) / 100 : 0;

    // Verificar que la cera exista y tenga stock suficiente
    const cera = await Material.findById(req.body.cera.material);
    if (!cera) {
      return res.status(400).json({ error: 'Cera no encontrada' });
    }
    if (cera.stock < gramosCera) {
      return res.status(400).json({ 
        error: `Stock insuficiente de ${cera.nombre}. Necesitas ${gramosCera.toFixed(2)}g pero solo hay ${cera.stock}g disponibles` 
      });
    }

    // Verificar que el aditivo exista y tenga stock suficiente (si se proporciona)
    let aditivo = null;
    if (req.body.aditivo?.material) {
      aditivo = await Material.findById(req.body.aditivo.material);
      if (!aditivo) {
        return res.status(400).json({ error: 'Aditivo no encontrado' });
      }
      if (aditivo.stock < gramosAditivo) {
        return res.status(400).json({ 
          error: `Stock insuficiente de ${aditivo.nombre}. Necesitas ${gramosAditivo.toFixed(2)}g pero solo hay ${aditivo.stock}g disponibles` 
        });
      }
    }

    // Verificar que la esencia exista y tenga stock suficiente
    const esencia = await Material.findById(req.body.esencia.material);
    if (!esencia) {
      return res.status(400).json({ error: 'Esencia no encontrada' });
    }
    if (esencia.stock < gramosEsencia) {
      return res.status(400).json({ 
        error: `Stock insuficiente de ${esencia.nombre}. Necesitas ${gramosEsencia.toFixed(2)}g pero solo hay ${esencia.stock}g disponibles` 
      });
    }

    // Verificar que el frasco exista y tenga stock suficiente
    const frasco = await Frasco.findById(req.body.frasco);
    if (!frasco) {
      return res.status(400).json({ error: 'Frasco no encontrado' });
    }
    if (frasco.stock < unidadesProducir) {
      return res.status(400).json({ 
        error: `Stock insuficiente de ${frasco.nombre}. Necesitas ${unidadesProducir} unidades pero solo hay ${frasco.stock} disponibles` 
      });
    }


    // Verificar que los porcentajes sumen 100%
    const totalPorcentaje = req.body.cera.porcentaje + 
                            req.body.esencia.porcentaje + 
                            (req.body.aditivo?.porcentaje || 0);
    if (Math.abs(totalPorcentaje - 100) > 0.01) {
      return res.status(400).json({ 
        error: `Los porcentajes deben sumar 100%. Actualmente suman ${totalPorcentaje}%` 
      });
    }

    // VERIFICAR SI EXISTE UNA RECETA DUPLICADA (mismas características)
    const criteriosBusqueda = {
      'cera.material': req.body.cera.material,
      'cera.porcentaje': req.body.cera.porcentaje,
      'esencia.material': req.body.esencia.material,
      'esencia.porcentaje': req.body.esencia.porcentaje,
      'frasco': req.body.frasco,
      'gramajeTotal': gramajeTotal,
      'activo': true
    };

    // Incluir aditivo en la búsqueda si existe
    if (req.body.aditivo?.material) {
      criteriosBusqueda['aditivo.material'] = req.body.aditivo.material;
      criteriosBusqueda['aditivo.porcentaje'] = req.body.aditivo.porcentaje;
    } else {
      // Si no hay aditivo, buscar recetas que tampoco tengan aditivo
      criteriosBusqueda.$or = [
        { 'aditivo.material': null },
        { 'aditivo.material': { $exists: false } }
      ];
    }

    const recetaExistente = await Receta.findOne(criteriosBusqueda);

    let receta;
    let esRecetaDuplicada = false;

    if (recetaExistente) {
      // RECETA DUPLICADA ENCONTRADA - Solo sumar al inventario
      esRecetaDuplicada = true;
      receta = recetaExistente;
      console.log(`🔄 Receta duplicada detectada: ${receta.codigo} - ${receta.nombre}`);
      console.log(`   Sumando ${unidadesProducir} unidades al inventario existente`);
    } else {
      // RECETA NUEVA - Crear normalmente
      receta = new Receta(req.body);
      await receta.save();
      console.log(`✨ Nueva receta creada: ${receta.codigo} - ${receta.nombre}`);
    }

    // DESCONTAR DEL INVENTARIO
    cera.stock -= gramosCera;
    await cera.save();

    if (aditivo) {
      aditivo.stock -= gramosAditivo;
      await aditivo.save();
    }

    esencia.stock -= gramosEsencia;
    await esencia.save();

    frasco.stock -= unidadesProducir;
    await frasco.save();

    // Marcar inventario como descontado solo si es receta nueva
    if (!esRecetaDuplicada) {
      receta.inventarioDescontado = true;
      await receta.save();
    }
    
    // AGREGAR O ACTUALIZAR INVENTARIO DE VELAS TERMINADAS
    // Buscar por nombre de vela en lugar de ID de receta (porque pueden haber múltiples recetas con el mismo nombre)
    let inventarioVela = await InventarioVela.findOne({ nombreVela: receta.nombre });
    
    if (inventarioVela) {
      // Si ya existe, agregar stock
      await inventarioVela.agregarStock(unidadesProducir);
      console.log(`✅ Inventario de vela actualizado: ${receta.nombre} (+${unidadesProducir} unidades, total: ${inventarioVela.stockActual})`);
    } else {
      // Si no existe, crear nuevo registro de inventario
      inventarioVela = new InventarioVela({
        receta: receta._id,
        nombreVela: receta.nombre,
        stockActual: unidadesProducir,
        stockMinimo: 10, // Mínimo por defecto
        ultimaProduccion: {
          fecha: new Date(),
          cantidad: unidadesProducir
        }
      });
      await inventarioVela.save();
      console.log(`✅ Nuevo inventario de vela creado: ${receta.nombre} (${unidadesProducir} unidades)`);
    }
    
    // Poblar los datos para la respuesta
    await receta.populate([
      { path: 'cera.material', select: 'nombre tipo precioPorGramo stock' },
      { path: 'aditivo.material', select: 'nombre tipo precioPorGramo stock' },
      { path: 'esencia.material', select: 'nombre tipo precioPorGramo stock' },
      { path: 'frasco', select: 'nombre capacidad precio stock' }
    ]);
    
    res.status(201).json({
      receta,
      esRecetaDuplicada,
      mensaje: esRecetaDuplicada 
        ? `Receta duplicada detectada (${receta.codigo}). Se produjeron ${unidadesProducir} unidades adicionales y se sumaron al inventario existente.`
        : `Receta creada exitosamente (${receta.codigo}). Se produjeron ${unidadesProducir} unidades y se agregaron al inventario de velas.`,
      inventarioDescontado: {
        cera: `${cera.nombre}: -${gramosCera.toFixed(2)}g`,
        esencia: `${esencia.nombre}: -${gramosEsencia.toFixed(2)}g`,
        aditivo: aditivo ? `${aditivo.nombre}: -${gramosAditivo.toFixed(2)}g` : 'N/A',
        frasco: `${frasco.nombre}: -${unidadesProducir} unidades`
      },
      inventarioVelas: {
        nombre: inventarioVela.nombreVela,
        stockActual: inventarioVela.stockActual,
        stockMinimo: inventarioVela.stockMinimo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/recetas/:id - Actualizar receta
router.put('/:id', async (req, res) => {
  try {
    const receta = await Receta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    // Poblar los datos para la respuesta
    await receta.populate([
      { path: 'cera.material', select: 'nombre tipo precioPorGramo' },
      { path: 'aditivo.material', select: 'nombre tipo precioPorGramo' },
      { path: 'esencia.material', select: 'nombre tipo precioPorGramo' },
      { path: 'frasco', select: 'nombre capacidad precio' }
    ]);
    
    res.json(receta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/recetas/:id/toggle-visibilidad - Cambiar visibilidad en Dashboard
router.patch('/:id/toggle-visibilidad', async (req, res) => {
  try {
    const receta = await Receta.findById(req.params.id);
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    // Alternar el estado activo
    receta.activo = !receta.activo;
    await receta.save();
    
    res.json({ 
      _id: receta._id,
      codigo: receta.codigo,
      nombre: receta.nombre,
      activo: receta.activo,
      mensaje: receta.activo 
        ? 'Receta visible en Dashboard' 
        : 'Receta oculta en Dashboard'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/recetas/:id - Eliminar receta (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const receta = await Receta.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    res.json({ message: 'Receta desactivada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recetas/:id/gramajes - Obtener gramajes detallados
router.get('/:id/gramajes', async (req, res) => {
  try {
    const receta = await Receta.findById(req.params.id)
      .populate('cera.material', 'nombre tipo precioPorGramo')
      .populate('aditivo.material', 'nombre tipo precioPorGramo')
      .populate('esencia.material', 'nombre tipo precioPorGramo')
      .populate('molde', 'nombre capacidad forma')
      .populate('frasco', 'nombre capacidad');
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const gramosCera = (receta.gramajeTotal * receta.cera.porcentaje) / 100;
    const gramosEsencia = (receta.gramajeTotal * receta.esencia.porcentaje) / 100;
    const gramosAditivo = receta.aditivo?.porcentaje ? 
      (receta.gramajeTotal * receta.aditivo.porcentaje) / 100 : 0;

    const gramajes = [
      {
        material: receta.cera?.material?.nombre || 'N/A',
        tipo: 'Cera',
        porcentaje: receta.cera.porcentaje,
        gramos: gramosCera,
        gramosTotales: gramosCera * receta.unidadesProducir,
        costo: gramosCera * (receta.cera?.material?.precioPorGramo || 0)
      }
    ];

    if (receta.esencia && receta.esencia.material) {
      gramajes.push({
        material: receta.esencia.material.nombre,
        tipo: 'Esencia',
        porcentaje: receta.esencia.porcentaje,
        gramos: gramosEsencia,
        gramosTotales: gramosEsencia * receta.unidadesProducir,
        costo: gramosEsencia * receta.esencia.material.precioPorGramo
      });
    }

    if (receta.aditivo?.material) {
      gramajes.push({
        material: receta.aditivo.material.nombre,
        tipo: 'Aditivo',
        porcentaje: receta.aditivo.porcentaje,
        gramos: gramosAditivo,
        gramosTotales: gramosAditivo * receta.unidadesProducir,
        costo: gramosAditivo * receta.aditivo.material.precioPorGramo
      });
    }

    res.json({
      receta: receta.nombre,
      molde: receta.molde?.nombre || 'Sin molde',
      frasco: receta.frasco?.nombre || 'Sin frasco',
      gramajeTotal: receta.gramajeTotal,
      unidadesProducir: receta.unidadesProducir,
      gramajes: gramajes,
      costoPorUnidad: receta.costoPorUnidad,
      costoTotal: receta.costoTotal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

