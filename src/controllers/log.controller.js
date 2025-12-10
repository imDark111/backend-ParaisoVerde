const Log = require('../models/Log');

// @desc    Obtener todos los logs
// @route   GET /api/logs
// @access  Private/Admin
exports.obtenerLogs = async (req, res) => {
  try {
    const { accion, entidad, usuario, fechaInicio, fechaFin, ip } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let filtro = {};

    if (accion) filtro.accion = accion;
    if (entidad) filtro.entidad = entidad;
    if (usuario) filtro.usuario = usuario;
    if (ip) filtro.ip = new RegExp(ip, 'i');
    
    if (fechaInicio && fechaFin) {
      filtro.createdAt = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    const total = await Log.countDocuments(filtro);
    const logs = await Log.find(filtro)
      .populate('usuario', 'nombreUsuario email rol')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs',
      error: error.message
    });
  }
};

// @desc    Obtener estadísticas de logs
// @route   GET /api/logs/estadisticas
// @access  Private/Admin
exports.obtenerEstadisticasLogs = async (req, res) => {
  try {
    // Logs por acción
    const logsPorAccion = await Log.aggregate([
      {
        $group: {
          _id: '$accion',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Logs por entidad
    const logsPorEntidad = await Log.aggregate([
      {
        $group: {
          _id: '$entidad',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Usuarios más activos
    const usuariosMasActivos = await Log.aggregate([
      { $match: { usuario: { $ne: null } } },
      {
        $group: {
          _id: '$usuario',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' }
    ]);

    // Logs por día (últimos 7 días)
    const logsPorDia = await Log.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // IPs más frecuentes
    const ipsMasFrecuentes = await Log.aggregate([
      { $match: { ip: { $ne: null } } },
      {
        $group: {
          _id: '$ip',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        logsPorAccion,
        logsPorEntidad,
        usuariosMasActivos,
        logsPorDia,
        ipsMasFrecuentes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de logs',
      error: error.message
    });
  }
};

// @desc    Obtener un log específico
// @route   GET /api/logs/:id
// @access  Private/Admin
exports.obtenerLog = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id)
      .populate('usuario', 'nombreUsuario email rol');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log no encontrado'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener log',
      error: error.message
    });
  }
};
