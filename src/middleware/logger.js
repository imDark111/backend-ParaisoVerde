const Log = require('../models/Log');

// Middleware para registrar logs de auditoría
const logger = async (req, res, next) => {
  // Guardar el método original de res.json
  const originalJson = res.json.bind(res);

  // Sobrescribir res.json para capturar la respuesta
  res.json = function(data) {
    // Crear log después de la respuesta
    crearLog(req, res, data);
    return originalJson(data);
  };

  next();
};

// Función para crear el log
const crearLog = async (req, res, data) => {
  try {
    // Determinar la acción basada en el método HTTP
    let accion;
    switch (req.method) {
      case 'GET':
        accion = 'READ';
        break;
      case 'POST':
        accion = 'CREATE';
        break;
      case 'PUT':
      case 'PATCH':
        accion = 'UPDATE';
        break;
      case 'DELETE':
        accion = 'DELETE';
        break;
      default:
        accion = 'READ';
    }

    // Extraer entidad de la ruta
    const rutaParts = req.path.split('/').filter(p => p);
    const entidad = rutaParts[1] || 'sistema';

    // Obtener IP del cliente
    const ip = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                req.connection.socket?.remoteAddress;

    // Validar que entidadId sea un ObjectId válido o undefined
    let entidadId = req.params.id || data?.data?._id;
    if (entidadId && typeof entidadId === 'string' && !entidadId.match(/^[0-9a-fA-F]{24}$/)) {
      entidadId = undefined; // No es un ObjectId válido, no incluirlo
    }

    const logData = {
      usuario: req.usuario?._id,
      accion,
      entidad,
      entidadId,
      ip: Array.isArray(ip) ? ip[0] : ip?.split(',')[0],
      userAgent: req.headers['user-agent'],
      metodo: req.method,
      ruta: req.originalUrl,
      descripcion: `${req.method} ${req.originalUrl}`,
      exitoso: res.statusCode < 400,
      detalles: {
        body: req.method !== 'GET' ? req.body : undefined,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        statusCode: res.statusCode
      }
    };

    // Si hay error, guardar mensaje
    if (res.statusCode >= 400 && data?.message) {
      logData.errorMensaje = data.message;
    }

    await Log.create(logData);
  } catch (error) {
    console.error('Error al crear log:', error);
  }
};

// Función helper para crear logs específicos
const crearLogEspecifico = async (usuario, accion, entidad, descripcion, detalles = {}) => {
  try {
    await Log.create({
      usuario,
      accion,
      entidad,
      descripcion,
      detalles,
      exitoso: true
    });
  } catch (error) {
    console.error('Error al crear log específico:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};

module.exports = { logger, crearLogEspecifico };
