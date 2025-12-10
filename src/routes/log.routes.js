const express = require('express');
const router = express.Router();
const {
  obtenerLogs,
  obtenerEstadisticasLogs,
  obtenerLog
} = require('../controllers/log.controller');
const { protect, authorize } = require('../middleware/auth');

// Aplicar middleware - solo admin
router.use(protect);
router.use(authorize('admin'));

router.get('/', obtenerLogs);
router.get('/estadisticas', obtenerEstadisticasLogs);
router.get('/:id', obtenerLog);

module.exports = router;
