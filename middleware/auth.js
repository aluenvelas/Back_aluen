const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Middleware para verificar token JWT
exports.protegerRuta = async (req, res, next) => {
  let token;

  // Verificar si el token viene en los headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui');

      // Obtener usuario del token (sin password)
      req.usuario = await Usuario.findById(decoded.id).select('-password');

      if (!req.usuario || !req.usuario.activo) {
        return res.status(401).json({ error: 'Usuario no autorizado o inactivo' });
      }

      next();
    } catch (error) {
      console.error('Error en autenticación:', error);
      return res.status(401).json({ error: 'Token no válido o expirado' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No autorizado, token no encontrado' });
  }
};

// Middleware para verificar rol de administrador
exports.verificarAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }
};

// Generar token JWT
exports.generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui', {
    expiresIn: '30d' // Token válido por 30 días
  });
};

