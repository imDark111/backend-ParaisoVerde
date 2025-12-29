const express = require('express');
const router = express.Router();
const {
  crearFactura,
  agregarDanos,
  obtenerFacturas,
  obtenerFactura,
  registrarPago,
  generarPDF,
  obtenerFacturasRecientes
} = require('../controllers/factura.controller');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// Aplicar middleware
router.use(protect);
router.use(logger);

router.route('/')
  .get(obtenerFacturas)
  .post(authorize('admin'), crearFactura);

// Endpoint temporal para auto-generar facturas
router.post('/auto-generar', authorize('admin'), async (req, res) => {
  try {
    const Reserva = require('../models/Reserva');
    const Factura = require('../models/Factura');
    
    // Obtener reservas confirmadas sin factura
    const reservas = await Reserva.find({ 
      estado: { $in: ['confirmada', 'en-curso', 'completada'] }
    });
    
    const facturasCreadas = [];
    
    for (const reserva of reservas) {
      // Verificar si ya tiene factura
      const facturaExistente = await Factura.findOne({ reserva: reserva._id });
      if (!facturaExistente) {
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
        facturasCreadas.push(factura);
      }
    }
    
    res.json({
      success: true,
      message: `${facturasCreadas.length} facturas creadas`,
      data: facturasCreadas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al auto-generar facturas',
      error: error.message
    });
  }
});

// Obtener facturas recientes (para notificaciones)
router.get('/recientes', authorize('admin'), obtenerFacturasRecientes);

router.get('/:id/pdf', generarPDF);
router.get('/:id', obtenerFactura);
router.put('/:id/danos', authorize('admin'), agregarDanos);
router.put('/:id/pago', authorize('admin'), registrarPago);

module.exports = router;
