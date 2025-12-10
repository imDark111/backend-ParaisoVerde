const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  accion: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'REGISTER']
  },
  entidad: {
    type: String,
    required: true,
    trim: true
  },
  entidadId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ip: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metodo: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    trim: true,
    required: false
  },
  ruta: {
    type: String,
    trim: true,
    required: false
  },
  descripcion: {
    type: String,
    trim: true
  },
  detalles: {
    type: mongoose.Schema.Types.Mixed
  },
  exitoso: {
    type: Boolean,
    default: true
  },
  errorMensaje: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
logSchema.index({ usuario: 1, createdAt: -1 });
logSchema.index({ accion: 1, createdAt: -1 });
logSchema.index({ entidad: 1, createdAt: -1 });
logSchema.index({ ip: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
