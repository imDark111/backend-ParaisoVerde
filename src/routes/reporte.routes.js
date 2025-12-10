const express = require('express');
const router = express.Router();
const {
  reporteReservas,
  reporteFinanciero,
  reporteOcupacion,
  reporteClientes
} = require('../controllers/reporte.controller');
const { protect, authorize } = require('../middleware/auth');

// Aplicar middleware - solo admin
router.use(protect);
router.use(authorize('admin'));

router.get('/reservas', reporteReservas);
router.get('/financiero', reporteFinanciero);
router.get('/ocupacion', reporteOcupacion);
router.get('/clientes', reporteClientes);

module.exports = router;
