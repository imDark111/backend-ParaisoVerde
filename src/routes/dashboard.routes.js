const express = require('express');
const router = express.Router();
const {
  obtenerEstadisticas,
  obtenerReservasProximas,
  obtenerCheckInsHoy,
  obtenerCheckOutsHoy,
  obtenerTodosCheckIns,
  obtenerTodosCheckOuts
} = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middleware/auth');

// Aplicar middleware - solo admin
router.use(protect);
router.use(authorize('admin'));

router.get('/estadisticas', obtenerEstadisticas);
router.get('/reservas-proximas', obtenerReservasProximas);
router.get('/checkins-hoy', obtenerCheckInsHoy);
router.get('/checkouts-hoy', obtenerCheckOutsHoy);
router.get('/checkins-todos', obtenerTodosCheckIns);
router.get('/checkouts-todos', obtenerTodosCheckOuts);

module.exports = router;
