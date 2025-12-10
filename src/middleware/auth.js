const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Proteger rutas - verificar token
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token no proporcionado'
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuario
      req.usuario = await Usuario.findById(decoded.id).select('-password');
      
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (!req.usuario.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario inactivo'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en autenticación',
      error: error.message
    });
  }
};

// Autorizar por roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol '${req.usuario.rol}' no tiene permiso para realizar esta acción`
      });
    }
    next();
  };
};

// Generar token JWT
exports.generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};
