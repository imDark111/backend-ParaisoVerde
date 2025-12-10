const express = require('express');
const router = express.Router();
const {
  obtenerUsuarios,
  obtenerUsuario,
  actualizarPerfil,
  cambiarFotoPerfil,
  cambiarPassword,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/usuario.controller');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logger } = require('../middleware/logger');

// Aplicar middleware de autenticación a todas las rutas
router.use(protect);
router.use(logger);

// Rutas de usuario
router.get('/', authorize('admin'), obtenerUsuarios);
router.get('/:id', obtenerUsuario);
router.put('/perfil', actualizarPerfil);
router.put('/foto-perfil', upload.single('fotoPerfil'), cambiarFotoPerfil);
router.put('/cambiar-password', cambiarPassword);

// Rutas de admin
router.put('/:id', authorize('admin'), actualizarUsuario);
router.delete('/:id', authorize('admin'), eliminarUsuario);

module.exports = router;
