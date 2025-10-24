const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { generarToken, protegerRuta } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// POST /api/auth/registro - Registrar nuevo usuario (DESHABILITADO - Solo admins pueden crear usuarios)
router.post('/registro', async (req, res) => {
  return res.status(403).json({ 
    error: 'El registro público está deshabilitado. Contacte al administrador para crear una cuenta.' 
  });
});

// POST /api/auth/registro-admin - Solo administradores pueden registrar usuarios (futuro)
// router.post('/registro-admin', protegerRuta, verificarAdmin, async (req, res) => {
//   // Código para que admins creen usuarios
// });

// POST /api/auth/login - Iniciar sesión
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const usuario = await Usuario.findOne({ email });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }

    // Verificar password
    const passwordValido = await usuario.compararPassword(password);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    usuario.ultimoAcceso = Date.now();
    await usuario.save();

    // Generar token
    const token = generarToken(usuario._id);

    res.json({
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', protegerRuta, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select('-password');
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/perfil - Actualizar perfil del usuario
router.put('/perfil', protegerRuta, async (req, res) => {
  try {
    const { nombre, email } = req.body;

    const usuario = await Usuario.findById(req.usuario._id);

    if (usuario) {
      usuario.nombre = nombre || usuario.nombre;
      usuario.email = email || usuario.email;

      const usuarioActualizado = await usuario.save();

      res.json({
        _id: usuarioActualizado._id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol
      });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/cambiar-password - Cambiar contraseña
router.put('/cambiar-password', protegerRuta, [
  body('passwordActual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('passwordNueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { passwordActual, passwordNueva } = req.body;

    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar password actual
    const passwordValido = await usuario.compararPassword(passwordActual);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Actualizar password
    usuario.password = passwordNueva;
    await usuario.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
