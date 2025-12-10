const express = require('express');
const router = express.Router();
const {
  obtenerClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/cliente.controller');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// Aplicar middleware
router.use(protect);
router.use(logger);

router.route('/')
  .get(authorize('admin'), obtenerClientes)
  .post(crearCliente);

router.route('/:id')
  .get(obtenerCliente)
  .put(actualizarCliente)
  .delete(authorize('admin'), eliminarCliente);

module.exports = router;
