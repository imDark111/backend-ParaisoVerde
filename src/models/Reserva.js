const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  codigoReserva: {
    type: String,
    unique: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  departamento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Departamento',
    required: true
  },
  fechaInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  fechaFin: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  numeroNoches: {
    type: Number,
    required: true,
    min: 1
  },
  numeroHuespedes: {
    type: Number,
    required: true,
    min: 1
  },
  precioNoche: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  descuentoClienteFrecuente: {
    type: Number,
    default: 0
  },
  aplicaIVA: {
    type: Boolean,
    default: true
  },
  iva: {
    type: Number,
    default: 0
  },
  esFeriado: {
    type: Boolean,
    default: false
  },
  recargoPorcentaje: {
    type: Number,
    default: 0
  },
  recargoFeriado: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'en-curso', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  checkIn: {
    realizado: { type: Boolean, default: false },
    fecha: Date,
    realizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
  },
  checkOut: {
    realizado: { type: Boolean, default: false },
    fecha: Date,
    realizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
  },
  observaciones: {
    type: String,
    trim: true
  },
  solicitudesEspeciales: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para obtener id desde _id
reservaSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Middleware para generar código de reserva
reservaSchema.pre('save', function(next) {
  if (!this.codigoReserva) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.codigoReserva = `PV-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Método para calcular precios
reservaSchema.methods.calcularPrecios = function(esTerceraEdad, esFrecuente) {
  // Subtotal base
  this.subtotal = this.precioNoche * this.numeroNoches;
  
  // Descuento cliente frecuente (10%)
  if (esFrecuente) {
    this.descuentoClienteFrecuente = this.subtotal * 0.10;
    this.subtotal -= this.descuentoClienteFrecuente;
  }
  
  // IVA (15%) - no aplica para tercera edad
  this.aplicaIVA = !esTerceraEdad;
  if (this.aplicaIVA && !this.esFeriado) {
    this.iva = this.subtotal * 0.15;
  } else {
    this.iva = 0;
  }
  
  // Recargo por feriado (10%) - solo si no es tercera edad
  if (this.esFeriado && !esTerceraEdad) {
    this.recargoPorcentaje = 10;
    this.recargoFeriado = this.subtotal * 0.10;
  } else {
    this.recargoFeriado = 0;
  }
  
  // Total
  this.total = this.subtotal + this.iva + this.recargoFeriado;
};

// Índices para búsquedas
reservaSchema.index({ estado: 1, fechaInicio: 1 });
reservaSchema.index({ usuario: 1, estado: 1 });
reservaSchema.index({ departamento: 1, fechaInicio: 1, fechaFin: 1 });

module.exports = mongoose.model('Reserva', reservaSchema);
