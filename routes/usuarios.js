const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select('-password') // No enviar la contraseña
      .sort({ fechaCreacion: -1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

// GET /api/usuarios/:id - Obtener un usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
});

// POST /api/usuarios - Crear un nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
    }
    
    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    
    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password,
      rol: rol || 'usuario',
      activo: true
    });
    
    await nuevoUsuario.save();
    
    // Retornar usuario sin contraseña
    const usuarioRespuesta = nuevoUsuario.toObject();
    delete usuarioRespuesta.password;
    
    res.status(201).json(usuarioRespuesta);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
});

// PUT /api/usuarios/:id - Actualizar un usuario
router.put('/:id', async (req, res) => {
  try {
    const { nombre, email, rol, activo } = req.body;
    
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar si el email ya existe en otro usuario
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ email });
      if (emailExistente) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
    }
    
    // Actualizar campos
    if (nombre) usuario.nombre = nombre;
    if (email) usuario.email = email;
    if (rol) usuario.rol = rol;
    if (activo !== undefined) usuario.activo = activo;
    
    await usuario.save();
    
    // Retornar usuario sin contraseña
    const usuarioRespuesta = usuario.toObject();
    delete usuarioRespuesta.password;
    
    res.json(usuarioRespuesta);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
});

// PUT /api/usuarios/:id/cambiar-password - Cambiar contraseña de un usuario
router.put('/:id/cambiar-password', async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    
    if (!passwordNueva || passwordNueva.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Si se proporciona la contraseña actual, verificarla
    if (passwordActual) {
      const passwordValida = await usuario.compararPassword(passwordActual);
      if (!passwordValida) {
        return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
      }
    }
    
    // Actualizar contraseña
    usuario.password = passwordNueva;
    await usuario.save();
    
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
  }
});

// PUT /api/usuarios/:id/resetear-password - Resetear contraseña (solo admin)
router.put('/:id/resetear-password', async (req, res) => {
  try {
    const { passwordNueva } = req.body;
    
    if (!passwordNueva || passwordNueva.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Actualizar contraseña sin verificar la actual (solo admin puede hacer esto)
    usuario.password = passwordNueva;
    await usuario.save();
    
    res.json({ message: 'Contraseña reseteada exitosamente' });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ message: 'Error al resetear contraseña', error: error.message });
  }
});

// DELETE /api/usuarios/:id - Desactivar usuario (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar que no sea el único admin activo
    if (usuario.rol === 'admin') {
      const adminsActivos = await Usuario.countDocuments({ rol: 'admin', activo: true });
      if (adminsActivos <= 1) {
        return res.status(400).json({ message: 'No se puede desactivar el único administrador del sistema' });
      }
    }
    
    usuario.activo = false;
    await usuario.save();
    
    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({ message: 'Error al desactivar usuario', error: error.message });
  }
});

module.exports = router;


