const express = require('express');
const router = express.Router();
const {
  obtenerDepartamentos,
  obtenerDepartamento,
  crearDepartamento,
  actualizarDepartamento,
  eliminarDepartamento,
  subirImagenes,
  verificarDisponibilidad
} = require('../controllers/departamento.controller');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logger } = require('../middleware/logger');

// Rutas públicas
router.get('/', obtenerDepartamentos);
router.get('/:id', obtenerDepartamento);
router.get('/:id/disponibilidad', verificarDisponibilidad);

// Rutas protegidas
router.use(protect);
router.use(authorize('admin'));
router.use(logger);

router.post('/', crearDepartamento);
router.put('/:id', actualizarDepartamento);
router.delete('/:id', eliminarDepartamento);
router.post('/:id/imagenes', upload.array('imagenes', 10), subirImagenes);

module.exports = router;
