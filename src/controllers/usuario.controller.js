const Usuario = require('../models/Usuario');
const fs = require('fs').promises;
const path = require('path');

// @desc    Obtener todos los usuarios
// @route   GET /api/usuarios
// @access  Private/Admin
exports.obtenerUsuarios = async (req, res) => {
  try {
    const { rol, activo } = req.query;
    
    let filtro = {};
    if (rol) filtro.rol = rol;
    if (activo !== undefined) filtro.activo = activo === 'true';

    const usuarios = await Usuario.find(filtro)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// @desc    Obtener un usuario
// @route   GET /api/usuarios/:id
// @access  Private
exports.obtenerUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

// @desc    Actualizar perfil de usuario
// @route   PUT /api/usuarios/perfil
// @access  Private
exports.actualizarPerfil = async (req, res) => {
  try {
    const camposPermitidos = {
      nombreUsuario: req.body.nombreUsuario,
      nombres: req.body.nombres,
      apellidos: req.body.apellidos,
      telefono: req.body.telefono,
      direccion: req.body.direccion,
      email: req.body.email
    };

    // Remover campos undefined
    Object.keys(camposPermitidos).forEach(key => 
      camposPermitidos[key] === undefined && delete camposPermitidos[key]
    );

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      camposPermitidos,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

// @desc    Cambiar foto de perfil
// @route   PUT /api/usuarios/foto-perfil
// @access  Private
exports.cambiarFotoPerfil = async (req, res) => {
  try {
    console.log('Petición de cambio de foto recibida');
    console.log('Usuario ID:', req.usuario._id);
    console.log('Archivo recibido:', req.file);
    
    if (!req.file) {
      console.log('No se recibió archivo');
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    const usuario = await Usuario.findById(req.usuario._id);
    console.log('Usuario encontrado:', usuario.nombreUsuario);

    // Eliminar foto anterior de Cloudinary si existe
    if (usuario.fotoPerfil && usuario.fotoPerfil !== 'default-avatar.jpg') {
      try {
        // Extraer public_id de la URL de Cloudinary
        const urlParts = usuario.fotoPerfil.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = `paraiso-verde/avatars/${filename.split('.')[0]}`;
        
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(publicId);
        console.log('Foto anterior eliminada de Cloudinary');
      } catch (error) {
        console.log('No se pudo eliminar la foto anterior:', error.message);
      }
    }

    // La URL ya viene de Cloudinary en req.file.path
    const fotoUrl = req.file.path;
    
    usuario.fotoPerfil = fotoUrl;
    await usuario.save();
    
    console.log('Foto actualizada:', usuario.fotoPerfil);

    res.json({
      success: true,
      message: 'Foto de perfil actualizada',
      data: {
        fotoPerfil: usuario.fotoPerfil
      }
    });
  } catch (error) {
    console.error('Error al cambiar foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar foto de perfil',
      error: error.message
    });
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/usuarios/cambiar-password
// @access  Private
exports.cambiarPassword = async (req, res) => {
  try {
    console.log('Cambiar contraseña - Usuario ID:', req.usuario?._id);
    console.log('Body recibido:', { passwordActual: '***', passwordNuevo: '***' });

    // Aceptar tanto passwordNuevo como passwordNueva (frontend usa passwordNueva)
    const { passwordActual, passwordNuevo, passwordNueva } = req.body;
    const nuevaPassword = passwordNuevo || passwordNueva;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione la contraseña actual y la nueva'
      });
    }

    if (!req.usuario || !req.usuario._id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const usuario = await Usuario.findById(req.usuario._id).select('+password');

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const passwordCorrecto = await usuario.compararPassword(passwordActual);
    if (!passwordCorrecto) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    usuario.password = nuevaPassword;
    await usuario.save();

    console.log('Contraseña actualizada exitosamente');

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message,
      detalles: error.stack
    });
  }
};

// @desc    Actualizar usuario (Admin)
// @route   PUT /api/usuarios/:id
// @access  Private/Admin
exports.actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/usuarios/:id
// @access  Private/Admin
exports.eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};
