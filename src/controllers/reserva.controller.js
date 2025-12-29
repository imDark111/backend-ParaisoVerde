const Reserva = require('../models/Reserva');
const Departamento = require('../models/Departamento');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const Factura = require('../models/Factura');

// @desc    Crear reserva
// @route   POST /api/reservas
// @access  Private
exports.crearReserva = async (req, res) => {
  try {
    const {
      clienteId,
      departamentoId,
      fechaInicio,
      fechaFin,
      numeroHuespedes,
      esFeriado,
      solicitudesEspeciales,
      clienteNuevo
    } = req.body;

    // Validar fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (inicio < hoy) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio no puede ser anterior a hoy'
      });
    }

    if (fin <= inicio) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Verificar disponibilidad del departamento
    const departamento = await Departamento.findById(departamentoId);
    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    if (departamento.estado !== 'disponible') {
      return res.status(400).json({
        success: false,
        message: 'Departamento no disponible'
      });
    }

    // Verificar capacidad
    if (numeroHuespedes > departamento.capacidadPersonas) {
      return res.status(400).json({
        success: false,
        message: `El departamento solo tiene capacidad para ${departamento.capacidadPersonas} personas`
      });
    }

    // Verificar conflictos de reservas
    const conflicto = await Reserva.findOne({
      departamento: departamentoId,
      estado: { $in: ['confirmada', 'en-curso'] },
      $or: [
        { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }
      ]
    });

    if (conflicto) {
      return res.status(400).json({
        success: false,
        message: 'El departamento ya tiene una reserva para estas fechas'
      });
    }

    // Obtener o crear cliente
    let cliente;
    if (clienteId) {
      cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }
    } else if (clienteNuevo) {
      // Verificar que no sea menor de edad
      const edad = calcularEdad(new Date(clienteNuevo.fechaNacimiento));
      if (edad < 18) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden realizar reservas para menores de edad'
        });
      }

      cliente = await Cliente.create({
        ...clienteNuevo,
        usuarioAsociado: req.usuario._id
      });
    } else {
      // Usar datos del usuario logueado
      const usuario = await Usuario.findById(req.usuario._id);
      
      if (usuario.esMenorDeEdad()) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden realizar reservas para menores de edad'
        });
      }

      // Buscar o crear cliente asociado al usuario
      cliente = await Cliente.findOne({ usuarioAsociado: req.usuario._id });
      
      if (!cliente) {
        cliente = await Cliente.create({
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          cedula: usuario.cedula,
          fechaNacimiento: usuario.fechaNacimiento,
          email: usuario.email,
          telefono: usuario.telefono,
          direccion: usuario.direccion,
          usuarioAsociado: usuario._id
        });
      }
    }

    // Calcular número de noches
    const numeroNoches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    // Crear reserva
    const reserva = new Reserva({
      usuario: req.usuario._id,
      cliente: cliente._id,
      departamento: departamentoId,
      fechaInicio: inicio,
      fechaFin: fin,
      numeroNoches,
      numeroHuespedes,
      precioNoche: departamento.precioNoche,
      esFeriado: esFeriado || false,
      solicitudesEspeciales,
      estado: 'confirmada'
    });

    // Calcular precios
    const esTerceraEdad = cliente.esTerceraEdad();
    const esFrecuente = cliente.esFrecuente;
    reserva.calcularPrecios(esTerceraEdad, esFrecuente);

    await reserva.save();

    // Actualizar estado del departamento
    departamento.estado = 'reservado';
    await departamento.save();

    // Actualizar contador de reservas del cliente
    cliente.reservasRealizadas += 1;
    cliente.actualizarClienteFrecuente();
    await cliente.save();

    // Actualizar contador del usuario
    const usuario = await Usuario.findById(req.usuario._id);
    usuario.reservasRealizadas += 1;
    usuario.actualizarClienteFrecuente();
    await usuario.save();

    // Poblar datos
    await reserva.populate(['usuario', 'cliente', 'departamento']);

    // Crear factura automáticamente
    let factura = null;
    try {
      factura = await Factura.create({
        reserva: reserva._id,
        cliente: cliente._id,
        subtotal: reserva.subtotal,
        descuentos: {
          clienteFrecuente: reserva.descuentoClienteFrecuente || 0
        },
        iva: reserva.iva || 0,
        recargos: {
          feriado: reserva.recargoFeriado || 0
        },
        total: reserva.total
      });

      await factura.populate(['reserva', 'cliente']);
    } catch (facturaError) {
      console.error('Error al crear factura automáticamente:', facturaError);
      // No fallar la reserva si falla la factura, pero registrar el error
    }

    res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      data: reserva,
      factura: factura ? {
        id: factura._id,
        numeroFactura: factura.numeroFactura,
        total: factura.total,
        estadoPago: factura.estadoPago
      } : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear reserva',
      error: error.message
    });
  }
};

// @desc    Obtener todas las reservas
// @route   GET /api/reservas
// @access  Private
exports.obtenerReservas = async (req, res) => {
  try {
    const { estado, fechaInicio, fechaFin, departamento } = req.query;
    
    let filtro = {};
    
    // Si es cliente, solo ver sus reservas
    if (req.usuario.rol === 'cliente') {
      filtro.usuario = req.usuario._id;
    }

    if (estado) filtro.estado = estado;
    if (departamento) filtro.departamento = departamento;
    if (fechaInicio && fechaFin) {
      filtro.fechaInicio = { $gte: new Date(fechaInicio) };
      filtro.fechaFin = { $lte: new Date(fechaFin) };
    }

    const reservas = await Reserva.find(filtro)
      .populate('usuario', 'nombreUsuario email')
      .populate('cliente')
      .populate('departamento')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reservas.length,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas',
      error: error.message
    });
  }
};

// @desc    Obtener una reserva
// @route   GET /api/reservas/:id
// @access  Private
exports.obtenerReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id)
      .populate('usuario', 'nombreUsuario email')
      .populate('cliente')
      .populate('departamento');

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar permisos
    if (req.usuario.rol === 'cliente' && reserva.usuario._id.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver esta reserva'
      });
    }

    res.json({
      success: true,
      data: reserva
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener reserva',
      error: error.message
    });
  }
};

// @desc    Actualizar reserva
// @route   PUT /api/reservas/:id
// @access  Private/Admin
exports.actualizarReserva = async (req, res) => {
  try {
    let reserva = await Reserva.findById(req.params.id);

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Solo admin o el usuario que hizo la reserva puede modificarla
    if (req.usuario.rol !== 'admin' && reserva.usuario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar esta reserva'
      });
    }

    reserva = await Reserva.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate(['usuario', 'cliente', 'departamento']);

    res.json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      data: reserva
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar reserva',
      error: error.message
    });
  }
};

// @desc    Cancelar reserva
// @route   PUT /api/reservas/:id/cancelar
// @access  Private
exports.cancelarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar permisos
    if (req.usuario.rol !== 'admin' && reserva.usuario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para cancelar esta reserva'
      });
    }

    if (reserva.estado === 'completada' || reserva.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una reserva completada o ya cancelada'
      });
    }

    reserva.estado = 'cancelada';
    await reserva.save();

    // Liberar departamento
    await Departamento.findByIdAndUpdate(reserva.departamento, {
      estado: 'disponible'
    });

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      data: reserva
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cancelar reserva',
      error: error.message
    });
  }
};

// @desc    Check-in
// @route   PUT /api/reservas/:id/checkin
// @access  Private/Admin
exports.checkIn = async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reserva.checkIn.realizado) {
      return res.status(400).json({
        success: false,
        message: 'Check-in ya realizado'
      });
    }

    reserva.checkIn = {
      realizado: true,
      fecha: new Date(),
      realizadoPor: req.usuario._id
    };
    reserva.estado = 'en-curso';
    await reserva.save();

    // Actualizar estado del departamento
    await Departamento.findByIdAndUpdate(reserva.departamento, {
      estado: 'ocupado'
    });

    res.json({
      success: true,
      message: 'Check-in realizado exitosamente',
      data: reserva
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al realizar check-in',
      error: error.message
    });
  }
};

// @desc    Check-out
// @route   PUT /api/reservas/:id/checkout
// @access  Private/Admin
exports.checkOut = async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (!reserva.checkIn.realizado) {
      return res.status(400).json({
        success: false,
        message: 'Debe realizar check-in primero'
      });
    }

    if (reserva.checkOut.realizado) {
      return res.status(400).json({
        success: false,
        message: 'Check-out ya realizado'
      });
    }

    reserva.checkOut = {
      realizado: true,
      fecha: new Date(),
      realizadoPor: req.usuario._id
    };
    reserva.estado = 'completada';
    await reserva.save();

    // Actualizar estado del departamento
    await Departamento.findByIdAndUpdate(reserva.departamento, {
      estado: 'disponible'
    });

    // Generar factura automáticamente
    const Factura = require('../models/Factura');
    try {
      // Verificar si ya existe factura
      const facturaExistente = await Factura.findOne({ reserva: reserva._id });
      if (!facturaExistente) {
        console.log('Generando factura automática con cliente:', reserva.cliente);
        
        const factura = await Factura.create({
          reserva: reserva._id,
          cliente: reserva.cliente,
          subtotal: reserva.subtotal,
          descuentos: {
            clienteFrecuente: reserva.descuentoClienteFrecuente || 0
          },
          iva: reserva.iva,
          recargos: {
            feriado: reserva.recargoFeriado || 0
          },
          total: reserva.total
        });
        
        console.log('Factura generada automáticamente:', {
          numeroFactura: factura.numeroFactura,
          clienteId: factura.cliente,
          total: factura.total
        });
      }
    } catch (facturaError) {
      console.error('Error al generar factura automática:', facturaError);
      // No fallar el checkout si hay error en la factura
    }

    res.json({
      success: true,
      message: 'Check-out realizado exitosamente',
      data: reserva
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al realizar check-out',
      error: error.message
    });
  }
};

// Helper function
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
}
