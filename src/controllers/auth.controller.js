const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');
const { generarToken } = require('../middleware/auth');
const { crearLogEspecifico } = require('../middleware/logger');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { nombreUsuario, email, password, nombres, apellidos, cedula, fechaNacimiento, telefono, direccion, nacionalidad } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExiste = await Usuario.findOne({ 
      $or: [{ email }, { nombreUsuario }, { cedula }] 
    });

    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'El usuario, email o cédula ya están registrados'
      });
    }

    // Verificar edad
    const edad = calcularEdad(new Date(fechaNacimiento));
    if (edad < 18) {
      return res.status(400).json({
        success: false,
        message: 'Debe ser mayor de 18 años para registrarse'
      });
    }

    // Crear usuario
    const usuario = await Usuario.create({
      nombreUsuario,
      email,
      password,
      nombres,
      apellidos,
      cedula,
      fechaNacimiento,
      telefono,
      direccion,
      rol: 'cliente'
    });

    // Crear cliente automáticamente para usuarios con rol 'cliente'
    if (usuario.rol === 'cliente') {
      await Cliente.create({
        nombres,
        apellidos,
        cedula,
        fechaNacimiento,
        email,
        telefono,
        direccion,
        nacionalidad: nacionalidad || 'No especificada',
        usuarioAsociado: usuario._id
      });
    }

    // Crear log
    await crearLogEspecifico(
      usuario._id,
      'REGISTER',
      'usuario',
      `Usuario ${nombreUsuario} registrado`,
      { email, rol: 'cliente' }
    );

    // Generar token
    const token = generarToken(usuario._id);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario: {
          id: usuario._id,
          nombreUsuario: usuario.nombreUsuario,
          email: usuario.email,
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          rol: usuario.rol,
          fotoPerfil: usuario.fotoPerfil
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message,
      detalles: error.stack
    });
  }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar
    if (!email || !password) {
      await crearLogEspecifico(
        null,
        'LOGIN_FAILED',
        'usuario',
        'Intento de login sin credenciales completas',
        { email }
      );

      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      });
    }

    // Buscar usuario con password
    const usuario = await Usuario.findOne({ email }).select('+password +twoFactorSecret');

    if (!usuario) {
      await crearLogEspecifico(
        null,
        'LOGIN_FAILED',
        'usuario',
        'Intento de login con email no existente',
        { email }
      );

      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const passwordCorrecto = await usuario.compararPassword(password);

    if (!passwordCorrecto) {
      await crearLogEspecifico(
        usuario._id,
        'LOGIN_FAILED',
        'usuario',
        'Intento de login con contraseña incorrecta',
        { email }
      );

      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Si tiene 2FA habilitado, requerir código
    if (usuario.twoFactorEnabled) {
      return res.json({
        success: true,
        requiresTwoFactor: true,
        userId: usuario._id
      });
    }

    // Crear log de login exitoso
    await crearLogEspecifico(
      usuario._id,
      'LOGIN',
      'usuario',
      `Login exitoso de ${usuario.nombreUsuario}`,
      { email, rol: usuario.rol }
    );

    // Generar token
    const token = generarToken(usuario._id);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        usuario: {
          id: usuario._id,
          nombreUsuario: usuario.nombreUsuario,
          email: usuario.email,
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          rol: usuario.rol,
          fotoPerfil: usuario.fotoPerfil,
          twoFactorEnabled: usuario.twoFactorEnabled,
          esFrecuente: usuario.esFrecuente
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message,
      detalles: error.stack
    });
  }
};

// @desc    Verificar código 2FA
// @route   POST /api/auth/verify-2fa
// @access  Public
exports.verify2FA = async (req, res) => {
  try {
    const { userId, token: code } = req.body;

    const usuario = await Usuario.findById(userId).select('+twoFactorSecret');

    if (!usuario || !usuario.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no válido o 2FA no habilitado'
      });
    }

    // Verificar código
    const verified = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Código 2FA inválido'
      });
    }

    // Crear log
    await crearLogEspecifico(
      usuario._id,
      'LOGIN',
      'usuario',
      `Login exitoso con 2FA de ${usuario.nombreUsuario}`
    );

    // Generar token
    const token = generarToken(usuario._id);

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        usuario: {
          id: usuario._id,
          nombreUsuario: usuario.nombreUsuario,
          email: usuario.email,
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          rol: usuario.rol,
          fotoPerfil: usuario.fotoPerfil,
          twoFactorEnabled: usuario.twoFactorEnabled
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar 2FA',
      error: error.message
    });
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario',
      error: error.message
    });
  }
};

// @desc    Habilitar 2FA
// @route   POST /api/auth/enable-2fa
// @access  Private
exports.enable2FA = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);

    // Generar secreto
    const secret = speakeasy.generateSecret({
      name: `Paraíso Verde (${usuario.email})`
    });

    // Generar QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Guardar secreto temporal (se confirmará después)
    usuario.twoFactorSecret = secret.base32;
    await usuario.save();

    res.json({
      success: true,
      message: 'Escanee el código QR con su aplicación de autenticación',
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al habilitar 2FA',
      error: error.message
    });
  }
};

// @desc    Confirmar 2FA
// @route   POST /api/auth/confirm-2fa
// @access  Private
exports.confirm2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const usuario = await Usuario.findById(req.usuario._id).select('+twoFactorSecret');

    // Verificar código
    const verified = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido'
      });
    }

    // Activar 2FA
    usuario.twoFactorEnabled = true;
    await usuario.save();

    await crearLogEspecifico(
      usuario._id,
      'UPDATE',
      'usuario',
      '2FA habilitado'
    );

    res.json({
      success: true,
      message: '2FA habilitado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al confirmar 2FA',
      error: error.message
    });
  }
};

// @desc    Deshabilitar 2FA
// @route   POST /api/auth/disable-2fa
// @access  Private
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const usuario = await Usuario.findById(req.usuario._id).select('+password');

    // Verificar contraseña
    const passwordCorrecto = await usuario.compararPassword(password);
    if (!passwordCorrecto) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Deshabilitar 2FA
    usuario.twoFactorEnabled = false;
    usuario.twoFactorSecret = undefined;
    await usuario.save();

    await crearLogEspecifico(
      usuario._id,
      'UPDATE',
      'usuario',
      '2FA deshabilitado'
    );

    res.json({
      success: true,
      message: '2FA deshabilitado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al deshabilitar 2FA',
      error: error.message
    });
  }
};

// Helper function
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
}
