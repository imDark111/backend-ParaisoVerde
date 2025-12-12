const Reserva = require('../models/Reserva');
const Factura = require('../models/Factura');
const Departamento = require('../models/Departamento');

// @desc    Generar reporte de reservas
// @route   GET /api/reportes/reservas
// @access  Private/Admin
exports.reporteReservas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, departamento } = req.query;

    console.log('Generando reporte de reservas:', { fechaInicio, fechaFin, estado, departamento });

    let filtro = {};

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      filtro.$or = [
        { createdAt: { $gte: inicio, $lte: fin } },
        { fechaInicio: { $gte: inicio, $lte: fin } },
        { fechaFin: { $gte: inicio, $lte: fin } }
      ];
    }

    if (estado) filtro.estado = estado;
    if (departamento) filtro.departamento = departamento;

    console.log('Filtro aplicado:', JSON.stringify(filtro));

    const reservas = await Reserva.find(filtro)
      .populate('usuario', 'nombreUsuario email')
      .populate('cliente')
      .populate('departamento')
      .sort({ createdAt: -1 });

    console.log(`Encontradas ${reservas.length} reservas`);

    // Estadísticas del reporte
    const totalReservas = reservas.length;
    const totalIngresos = reservas.reduce((sum, r) => sum + r.total, 0);
    const promedioIngreso = totalReservas > 0 ? totalIngresos / totalReservas : 0;

    const reservasPorEstado = await Reserva.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Reservas por estado:', reservasPorEstado);

    res.json({
      success: true,
      data: {
        reservas,
        estadisticas: {
          totalReservas,
          totalIngresos,
          promedioIngreso,
          reservasPorEstado
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de reservas',
      error: error.message
    });
  }
};

// @desc    Generar reporte financiero
// @route   GET /api/reportes/financiero
// @access  Private/Admin
exports.reporteFinanciero = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    console.log('Generando reporte financiero:', { fechaInicio, fechaFin });

    let filtro = {};

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      filtro.fechaEmision = {
        $gte: inicio,
        $lte: fin
      };
    }

    console.log('Filtro financiero:', JSON.stringify(filtro));

    const facturas = await Factura.find(filtro)
      .populate({
        path: 'reserva',
        populate: { path: 'departamento' }
      })
      .populate('cliente')
      .sort({ fechaEmision: -1 });

    console.log(`Encontradas ${facturas.length} facturas`);

    // Estadísticas
    const totalFacturas = facturas.length;
    const totalIngresos = facturas
      .filter(f => f.estadoPago === 'pagada')
      .reduce((sum, f) => sum + f.total, 0);
    
    const totalPendiente = facturas
      .filter(f => f.estadoPago === 'pendiente')
      .reduce((sum, f) => sum + f.total, 0);

    const totalIVA = facturas.reduce((sum, f) => sum + f.iva, 0);
    const totalDescuentos = facturas.reduce((sum, f) => 
      sum + f.descuentos.clienteFrecuente + f.descuentos.otros, 0);
    const totalDanos = facturas.reduce((sum, f) => sum + f.totalDanos, 0);

    const facturasPorEstado = await Factura.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: '$estadoPago',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        facturas,
        estadisticas: {
          totalFacturas,
          totalIngresos,
          totalPendiente,
          totalIVA,
          totalDescuentos,
          totalDanos,
          facturasPorEstado
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte financiero',
      error: error.message
    });
  }
};

// @desc    Generar reporte de ocupación
// @route   GET /api/reportes/ocupacion
// @access  Private/Admin
exports.reporteOcupacion = async (req, res) => {
  try {
    const { mes, año } = req.query;
    
    const mesActual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const añoActual = año ? parseInt(año) : new Date().getFullYear();

    const fechaInicio = new Date(añoActual, mesActual - 1, 1);
    const fechaFin = new Date(añoActual, mesActual, 0);

    // Obtener todos los departamentos
    const departamentos = await Departamento.find();

    // Obtener reservas del período
    const reservas = await Reserva.find({
      $or: [
        {
          fechaInicio: { $gte: fechaInicio, $lte: fechaFin }
        },
        {
          fechaFin: { $gte: fechaInicio, $lte: fechaFin }
        },
        {
          fechaInicio: { $lte: fechaInicio },
          fechaFin: { $gte: fechaFin }
        }
      ],
      estado: { $in: ['confirmada', 'en-curso', 'completada'] }
    }).populate('departamento');

    // Calcular ocupación por departamento
    const diasEnMes = fechaFin.getDate();
    const ocupacionPorDepartamento = departamentos.map(dept => {
      const reservasDept = reservas.filter(r => 
        r.departamento._id.toString() === dept._id.toString()
      );

      let diasOcupados = 0;
      reservasDept.forEach(reserva => {
        const inicio = new Date(Math.max(reserva.fechaInicio, fechaInicio));
        const fin = new Date(Math.min(reserva.fechaFin, fechaFin));
        const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        diasOcupados += dias;
      });

      const tasaOcupacion = ((diasOcupados / diasEnMes) * 100).toFixed(2);

      return {
        departamento: dept,
        diasOcupados,
        diasDisponibles: diasEnMes - diasOcupados,
        tasaOcupacion: parseFloat(tasaOcupacion)
      };
    });

    // Tasa de ocupación general
    const totalDiasDisponibles = departamentos.length * diasEnMes;
    const totalDiasOcupados = ocupacionPorDepartamento.reduce(
      (sum, o) => sum + o.diasOcupados, 0
    );
    const tasaOcupacionGeneral = ((totalDiasOcupados / totalDiasDisponibles) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        periodo: {
          mes: mesActual,
          año: añoActual,
          fechaInicio,
          fechaFin
        },
        tasaOcupacionGeneral: parseFloat(tasaOcupacionGeneral),
        totalDiasDisponibles,
        totalDiasOcupados,
        ocupacionPorDepartamento
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de ocupación',
      error: error.message
    });
  }
};

// @desc    Generar reporte de clientes
// @route   GET /api/reportes/clientes
// @access  Private/Admin
exports.reporteClientes = async (req, res) => {
  try {
    const Cliente = require('../models/Cliente');

    const clientes = await Cliente.find().sort({ reservasRealizadas: -1 });

    const clientesFrecuentes = clientes.filter(c => c.esFrecuente);
    const clientesNuevos = clientes.filter(c => c.reservasRealizadas === 1);

    // Top clientes
    const topClientes = clientes.slice(0, 10);

    res.json({
      success: true,
      data: {
        totalClientes: clientes.length,
        clientesFrecuentes: clientesFrecuentes.length,
        clientesNuevos: clientesNuevos.length,
        topClientes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de clientes',
      error: error.message
    });
  }
};
