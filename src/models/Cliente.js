const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombres: {
    type: String,
    required: [true, 'Los nombres son requeridos'],
    trim: true
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son requeridos'],
    trim: true
  },
  cedula: {
    type: String,
    required: [true, 'La cédula es requerida'],
    unique: true,
    trim: true
  },
  fechaNacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  nacionalidad: {
    type: String,
    trim: true
  },
  reservasRealizadas: {
    type: Number,
    default: 0
  },
  esFrecuente: {
    type: Boolean,
    default: false
  },
  usuarioAsociado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para obtener id desde _id
clienteSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Método para calcular edad
clienteSchema.methods.calcularEdad = function() {
  const hoy = new Date();
  const nacimiento = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

// Método para verificar si es tercera edad
clienteSchema.methods.esTerceraEdad = function() {
  return this.calcularEdad() >= 65;
};

// Método para verificar si es menor de edad
clienteSchema.methods.esMenorDeEdad = function() {
  return this.calcularEdad() < 18;
};

// Actualizar cliente frecuente
clienteSchema.methods.actualizarClienteFrecuente = function() {
  this.esFrecuente = this.reservasRealizadas >= 5;
};

module.exports = mongoose.model('Cliente', clienteSchema);
