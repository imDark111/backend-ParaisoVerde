const express = require('express');
const router = express.Router();
const {
  crearReserva,
  obtenerReservas,
  obtenerReserva,
  actualizarReserva,
  cancelarReserva,
  checkIn,
  checkOut
} = require('../controllers/reserva.controller');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

router.use(protect);
router.use(logger);

router.route('/')
  .get(obtenerReservas)
  .post(crearReserva);

router.get('/mis-reservas', obtenerReservas);

router.route('/:id')
  .get(obtenerReserva)
  .put(actualizarReserva);

router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/checkin', authorize('admin'), checkIn);
router.put('/:id/checkout', authorize('admin'), checkOut);

module.exports = router;
