const Factura = require('../models/Factura');
const Reserva = require('../models/Reserva');

// @desc    Crear factura
// @route   POST /api/facturas
// @access  Private/Admin
exports.crearFactura = async (req, res) => {
  try {
    const { reservaId } = req.body;

    const reserva = await Reserva.findById(reservaId).populate('cliente');

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (!['confirmada', 'en-curso', 'completada'].includes(reserva.estado)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden facturar reservas confirmadas, en curso o completadas'
      });
    }

    // Verificar si ya existe factura
    const facturaExistente = await Factura.findOne({ reserva: reservaId });
    if (facturaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una factura para esta reserva'
      });
    }

    const factura = await Factura.create({
      reserva: reservaId,
      cliente: reserva.cliente._id,
      subtotal: reserva.subtotal,
      descuentos: {
        clienteFrecuente: reserva.descuentoClienteFrecuente
      },
      iva: reserva.iva,
      recargos: {
        feriado: reserva.recargoFeriado
      },
      total: reserva.total
    });

    await factura.populate(['reserva', 'cliente']);

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: factura
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear factura',
      error: error.message
    });
  }
};

// @desc    Agregar daños a factura
// @route   PUT /api/facturas/:id/danos
// @access  Private/Admin
exports.agregarDanos = async (req, res) => {
  try {
    const { danos } = req.body;

    const factura = await Factura.findById(req.params.id);

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    factura.danos.push(...danos);
    factura.calcularTotalDanos();
    factura.recalcularTotal();
    await factura.save();

    res.json({
      success: true,
      message: 'Daños agregados a la factura',
      data: factura
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al agregar daños',
      error: error.message
    });
  }
};

// @desc    Obtener facturas
// @route   GET /api/facturas
// @access  Private
exports.obtenerFacturas = async (req, res) => {
  try {
    const { estadoPago } = req.query;
    
    let filtro = {};
    
    if (req.usuario.rol === 'cliente') {
      // Buscar facturas del cliente
      const Cliente = require('../models/Cliente');
      const cliente = await Cliente.findOne({ usuarioAsociado: req.usuario._id });
      if (cliente) {
        filtro.cliente = cliente._id;
      }
    }

    if (estadoPago) filtro.estadoPago = estadoPago;

    const facturas = await Factura.find(filtro)
      .populate({
        path: 'reserva',
        populate: { path: 'departamento' }
      })
      .populate('cliente')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: facturas.length,
      data: facturas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener facturas',
      error: error.message
    });
  }
};

// @desc    Obtener una factura
// @route   GET /api/facturas/:id
// @access  Private
exports.obtenerFactura = async (req, res) => {
  try {
    console.log('🔍 Buscando factura:', req.params.id);
    
    let factura = await Factura.findById(req.params.id)
      .populate('cliente')
      .populate({
        path: 'reserva',
        populate: [
          { path: 'departamento' },
          { path: 'usuario' },
          { path: 'cliente' }
        ]
      });

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    console.log('📄 Factura encontrada (antes):', {
      _id: factura._id,
      numeroFactura: factura.numeroFactura,
      clienteId: factura.cliente?._id || factura.cliente,
      clienteNombres: factura.cliente?.nombres,
      clienteApellidos: factura.cliente?.apellidos,
      clienteType: typeof factura.cliente,
      reservaClienteId: factura.reserva?.cliente?._id || factura.reserva?.cliente,
      reservaClienteNombres: factura.reserva?.cliente?.nombres,
      reservaClienteType: typeof factura.reserva?.cliente
    });

    // Si el cliente no está poblado, intentar poblar manualmente
    if (typeof factura.cliente === 'string' || (factura.cliente && !factura.cliente.nombres)) {
      console.log('⚠️ Cliente no está poblado, intentando populate manual');
      const Cliente = require('../models/Cliente');
      const clienteId = factura.cliente._id || factura.cliente;
      const clienteData = await Cliente.findById(clienteId);
      if (clienteData) {
        factura.cliente = clienteData;
        console.log('✅ Cliente poblado manualmente:', clienteData.nombres, clienteData.apellidos);
      }
    }

    res.json({
      success: true,
      data: factura
    });
  } catch (error) {
    console.error('❌ Error en obtenerFactura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener factura',
      error: error.message
    });
  }
};

// @desc    Registrar pago
// @route   PUT /api/facturas/:id/pago
// @access  Private/Admin
exports.registrarPago = async (req, res) => {
  try {
    const { monto, metodo, referencia } = req.body;

    const factura = await Factura.findById(req.params.id);

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    factura.pagos.push({
      monto,
      metodo,
      referencia
    });

    // Calcular total pagado
    const totalPagado = factura.pagos.reduce((sum, pago) => sum + pago.monto, 0);

    if (totalPagado >= factura.total) {
      factura.estadoPago = 'pagada';
    } else if (totalPagado > 0) {
      factura.estadoPago = 'parcial';
    }

    factura.metodoPago = metodo;
    await factura.save();

    res.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: factura
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al registrar pago',
      error: error.message
    });
  }
};

// @desc    Generar PDF de factura
// @route   GET /api/facturas/:id/pdf
// @access  Private
exports.generarPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    
    const factura = await Factura.findById(req.params.id)
      .populate({
        path: 'reserva',
        populate: { path: 'departamento' }
      })
      .populate('cliente');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Verificar permisos
    if (req.usuario.rol === 'cliente') {
      const Cliente = require('../models/Cliente');
      const cliente = await Cliente.findOne({ usuarioAsociado: req.usuario._id });
      if (!cliente || factura.cliente._id.toString() !== cliente._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver esta factura'
        });
      }
    }

    // Crear documento PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numeroFactura}.pdf`);
    
    // Pipe del PDF a la respuesta
    doc.pipe(res);

    // Encabezado
    doc.fontSize(24).fillColor('#1b5e20').text('🏨 Hotel Paraíso Verde', 50, 50);
    doc.fontSize(10).fillColor('#666666')
      .text('Av. Principal #123, Ciudad', 50, 80)
      .text('Teléfono: (02) 123-4567', 50, 95)
      .text('Email: info@paraisoverde.com', 50, 110);

    // Información de factura
    doc.fontSize(20).fillColor('#1b5e20').text('FACTURA', 400, 50);
    doc.fontSize(10).fillColor('#333333')
      .text(`N°: ${factura.numeroFactura}`, 400, 80)
      .text(`Fecha: ${factura.fechaEmision.toLocaleDateString('es-EC')}`, 400, 95)
      .text(`Estado: ${factura.estadoPago.toUpperCase()}`, 400, 110);

    // Línea divisoria
    doc.moveTo(50, 140).lineTo(550, 140).stroke('#2e7d32');

    // Información del cliente
    doc.fontSize(14).fillColor('#1b5e20').text('Información del Cliente', 50, 160);
    doc.fontSize(10).fillColor('#333333')
      .text(`Nombre: ${factura.cliente.nombres} ${factura.cliente.apellidos}`, 50, 185)
      .text(`Cédula: ${factura.cliente.cedula}`, 50, 200)
      .text(`Email: ${factura.cliente.email}`, 50, 215)
      .text(`Teléfono: ${factura.cliente.telefono}`, 50, 230);

    // Información de la reserva
    if (factura.reserva) {
      doc.fontSize(14).fillColor('#1b5e20').text('Información de la Reserva', 300, 160);
      doc.fontSize(10).fillColor('#333333')
        .text(`Código: ${factura.reserva.codigoReserva}`, 300, 185)
        .text(`Habitación: ${factura.reserva.departamento?.numero || 'N/A'}`, 300, 200)
        .text(`Check-in: ${new Date(factura.reserva.fechaInicio).toLocaleDateString('es-EC')}`, 300, 215)
        .text(`Check-out: ${new Date(factura.reserva.fechaFin).toLocaleDateString('es-EC')}`, 300, 230);
    }

    // Línea divisoria
    doc.moveTo(50, 260).lineTo(550, 260).stroke('#2e7d32');

    // Desglose de costos
    doc.fontSize(14).fillColor('#1b5e20').text('Desglose de Costos', 50, 280);
    
    let y = 305;
    const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

    // Tabla de costos
    doc.fontSize(10).fillColor('#333333');
    doc.text('Subtotal de Estadía', 50, y);
    doc.text(formatCurrency(factura.subtotal), 450, y, { align: 'right', width: 100 });
    y += 20;

    if (factura.descuentos.clienteFrecuente > 0) {
      doc.fillColor('#2e7d32');
      doc.text('Descuento Cliente Frecuente', 50, y);
      doc.text(`-${formatCurrency(factura.descuentos.clienteFrecuente)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }

    if (factura.descuentos.otros > 0) {
      doc.fillColor('#2e7d32');
      doc.text('Otros Descuentos', 50, y);
      doc.text(`-${formatCurrency(factura.descuentos.otros)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }

    if (factura.iva > 0) {
      doc.fillColor('#333333');
      doc.text('IVA (12%)', 50, y);
      doc.text(formatCurrency(factura.iva), 450, y, { align: 'right', width: 100 });
      y += 20;
    }

    if (factura.recargos.feriado > 0) {
      doc.fillColor('#f57c00');
      doc.text('Recargo por Feriado', 50, y);
      doc.text(`+${formatCurrency(factura.recargos.feriado)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }

    if (factura.totalDanos > 0) {
      doc.fillColor('#c62828');
      doc.text('Daños', 50, y);
      doc.text(`+${formatCurrency(factura.totalDanos)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }

    // Línea antes del total
    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke('#2e7d32');
    y += 20;

    // Total
    doc.fontSize(16).fillColor('#1b5e20');
    doc.text('TOTAL A PAGAR:', 50, y);
    doc.text(formatCurrency(factura.total), 450, y, { align: 'right', width: 100 });

    // Observaciones
    if (factura.observaciones) {
      y += 40;
      doc.fontSize(12).fillColor('#1b5e20').text('Observaciones:', 50, y);
      y += 20;
      doc.fontSize(10).fillColor('#666666').text(factura.observaciones, 50, y, { width: 500 });
    }

    // Pie de página
    const footerY = 700;
    doc.fontSize(10).fillColor('#666666')
      .text('¡Gracias por su preferencia!', 50, footerY, { align: 'center', width: 500 })
      .fontSize(8)
      .text('Este documento es una representación impresa de la factura electrónica', 50, footerY + 20, { align: 'center', width: 500 });

    // Finalizar documento
    doc.end();

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: error.message
    });
  }
};
