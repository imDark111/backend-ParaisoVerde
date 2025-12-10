const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  crearIntencionPago,
  confirmarPago,
  obtenerTarjetasPrueba,
  webhookStripe
} = require('../controllers/pago.controller');

// Ruta pública - Tarjetas de prueba
router.get('/tarjetas-prueba', obtenerTarjetasPrueba);

// Webhook de Stripe (debe ir antes del middleware protect)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookStripe);

// Rutas protegidas
router.post('/crear-intencion', protect, crearIntencionPago);
router.post('/confirmar', protect, confirmarPago);

module.exports = router;
