const Reserva = require('../models/Reserva');
const Factura = require('../models/Factura');
const Usuario = require('../models/Usuario');
const Departamento = require('../models/Departamento');
const Cliente = require('../models/Cliente');

// Helper function: Generar array con los últimos 6 meses
const generateLast6Months = () => {
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      año: date.getFullYear(),
      mes: date.getMonth() + 1
    });
  }
  
  return months;
};

// Helper function: Crear mapa de datos por mes para búsqueda O(1)
const createMonthMap = (data) => {
  const map = new Map();
  data.forEach(item => {
    const key = `${item._id.año}-${item._id.mes}`;
    map.set(key, item);
  });
  return map;
};

// @desc    Obtener estadísticas del dashboard
// @route   GET /api/dashboard/estadisticas
// @access  Private/Admin
exports.obtenerEstadisticas = async (req, res) => {
  try {
    // Estadísticas de reservas
    const totalReservas = await Reserva.countDocuments();
    const reservasActivas = await Reserva.countDocuments({ 
      estado: { $in: ['confirmada', 'en-curso'] } 
    });
    const reservasHoy = await Reserva.countDocuments({
      fechaInicio: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    // Estadísticas de departamentos
    const totalDepartamentos = await Departamento.countDocuments();
    const departamentosDisponibles = await Departamento.countDocuments({ 
      estado: 'disponible'
    });
    const departamentosOcupados = await Departamento.countDocuments({ 
      estado: 'ocupado'
    });
    const departamentosMantenimiento = await Departamento.countDocuments({ 
      estado: 'mantenimiento'
    });

    // Estadísticas financieras
    const ingresosTotales = await Factura.aggregate([
      { $match: { estadoPago: 'pagada' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const ingresosMes = await Factura.aggregate([
      {
        $match: {
          estadoPago: 'pagada',
          fechaEmision: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Estadísticas de usuarios
    const totalUsuarios = await Usuario.countDocuments();
    const totalClientes = await Cliente.countDocuments();
    const clientesFrecuentes = await Cliente.countDocuments({ esFrecuente: true });

    const last6Months = generateLast6Months();

    // Reservas por mes (últimos 6 meses)
    const reservasPorMesData = await Reserva.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$createdAt' },
            mes: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          ingresos: { $sum: '$total' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } }
    ]);

    // Crear mapa para búsqueda eficiente O(1)
    const reservasMap = createMonthMap(reservasPorMesData);

    // Llenar meses faltantes con valores en cero
    const reservasPorMes = last6Months.map(month => {
      const key = `${month.año}-${month.mes}`;
      const found = reservasMap.get(key);
      
      return found || {
        _id: { año: month.año, mes: month.mes },
        total: 0,
        ingresos: 0
      };
    });

    // Ingresos por mes (últimos 6 meses)
    const ingresosPorMesData = await Factura.aggregate([
      {
        $match: {
          estadoPago: 'pagada',
          fechaEmision: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fechaEmision' },
            mes: { $month: '$fechaEmision' }
          },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } }
    ]);

    // Crear mapa para búsqueda eficiente O(1)
    const ingresosMap = createMonthMap(ingresosPorMesData);

    // Llenar meses faltantes con valores en cero
    const ingresosPorMes = last6Months.map(month => {
      const key = `${month.año}-${month.mes}`;
      const found = ingresosMap.get(key);
      
      return found || {
        _id: { año: month.año, mes: month.mes },
        total: 0
      };
    });

    // Tasa de ocupación
    const diasEnMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const capacidadTotal = totalDepartamentos * diasEnMes;
    const diasOcupados = await Reserva.aggregate([
      {
        $match: {
          fechaInicio: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          },
          estado: { $in: ['confirmada', 'en-curso', 'completada'] }
        }
      },
      {
        $project: {
          dias: {
            $divide: [
              { $subtract: ['$fechaFin', '$fechaInicio'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$dias' }
        }
      }
    ]);

    const tasaOcupacion = diasOcupados.length > 0 
      ? ((diasOcupados[0].total / capacidadTotal) * 100).toFixed(2)
      : 0;

    // Top departamentos más reservados
    const topDepartamentos = await Reserva.aggregate([
      {
        $group: {
          _id: '$departamento',
          totalReservas: { $sum: 1 },
          ingresoTotal: { $sum: '$total' }
        }
      },
      { $sort: { totalReservas: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'departamentos',
          localField: '_id',
          foreignField: '_id',
          as: 'departamento'
        }
      },
      { $unwind: '$departamento' }
    ]);

    // Top clientes más frecuentes
    const topClientes = await Reserva.aggregate([
      {
        $group: {
          _id: '$cliente',
          totalReservas: { $sum: 1 }
        }
      },
      { $sort: { totalReservas: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'clientes',
          localField: '_id',
          foreignField: '_id',
          as: 'cliente'
        }
      },
      { $unwind: '$cliente' },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'cliente.usuarioAsociado',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $project: {
          totalReservas: 1,
          nombre: '$usuario.nombre',
          email: '$usuario.email'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        reservas: {
          total: totalReservas,
          activas: reservasActivas,
          hoy: reservasHoy
        },
        departamentos: {
          total: totalDepartamentos,
          disponibles: departamentosDisponibles,
          ocupados: departamentosOcupados,
          mantenimiento: departamentosMantenimiento
        },
        finanzas: {
          ingresosTotales: ingresosTotales[0]?.total || 0,
          ingresosMes: ingresosMes[0]?.total || 0
        },
        usuarios: {
          total: totalUsuarios,
          clientes: totalClientes,
          frecuentes: clientesFrecuentes
        },
        tasaOcupacion,
        reservasPorMes,
        ingresosPorMes,
        topDepartamentos,
        topClientes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// @desc    Obtener reservas próximas
// @route   GET /api/dashboard/reservas-proximas
// @access  Private/Admin
exports.obtenerReservasProximas = async (req, res) => {
  try {
    const hoy = new Date();
    const proximosDias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

    const reservas = await Reserva.find({
      fechaInicio: {
        $gte: hoy,
        $lte: proximosDias
      },
      estado: { $in: ['confirmada', 'en-curso'] }
    })
      .populate('usuario', 'nombreUsuario email')
      .populate('cliente')
      .populate('departamento')
      .sort({ fechaInicio: 1 })
      .limit(10);

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas próximas',
      error: error.message
    });
  }
};

// @desc    Obtener check-ins de hoy
// @route   GET /api/dashboard/checkins-hoy
// @access  Private/Admin
exports.obtenerCheckInsHoy = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const reservas = await Reserva.find({
      fechaInicio: {
        $gte: hoy,
        $lt: manana
      },
      estado: { $in: ['confirmada', 'en-curso'] }
    })
      .populate('cliente')
      .populate('departamento')
      .sort({ fechaInicio: 1 });

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener check-ins',
      error: error.message
    });
  }
};

// @desc    Obtener check-outs de hoy
// @route   GET /api/dashboard/checkouts-hoy
// @access  Private/Admin
exports.obtenerCheckOutsHoy = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const reservas = await Reserva.find({
      fechaFin: {
        $gte: hoy,
        $lt: manana
      },
      estado: 'en-curso'
    })
      .populate('cliente')
      .populate('departamento')
      .sort({ fechaFin: 1 });

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener check-outs',
      error: error.message
    });
  }
};

// @desc    Obtener todos los check-ins (confirmadas y en curso)
// @route   GET /api/dashboard/checkins-todos
// @access  Private/Admin
exports.obtenerTodosCheckIns = async (req, res) => {
  try {
    const reservas = await Reserva.find({
      estado: { $in: ['confirmada', 'en-curso'] }
    })
      .populate('cliente')
      .populate('departamento')
      .sort({ fechaInicio: 1 })
      .limit(50);

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener check-ins',
      error: error.message
    });
  }
};

// @desc    Obtener todos los check-outs (en curso y completadas)
// @route   GET /api/dashboard/checkouts-todos
// @access  Private/Admin
exports.obtenerTodosCheckOuts = async (req, res) => {
  try {
    const reservas = await Reserva.find({
      estado: { $in: ['en-curso', 'completada'] }
    })
      .populate('cliente')
      .populate('departamento')
      .sort({ fechaFin: 1 })
      .limit(50);

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener check-outs',
      error: error.message
    });
  }
};

// @desc    Obtener años disponibles de reservas
// @route   GET /api/dashboard/anios-disponibles
// @access  Private/Admin
exports.obtenerAniosDisponibles = async (req, res) => {
  try {
    const anios = await Reserva.aggregate([
      {
        $group: {
          _id: { $year: '$createdAt' }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    const aniosDisponibles = anios.map(item => item._id);

    res.json({
      success: true,
      data: aniosDisponibles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener años disponibles',
      error: error.message
    });
  }
};
