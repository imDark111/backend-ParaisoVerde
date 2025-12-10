const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombreUsuario: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: 6,
    select: false
  },
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  cedula: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fechaNacimiento: {
    type: Date,
    required: true
  },
  telefono: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  fotoPerfil: {
    type: String,
    default: 'default-avatar.jpg'
  },
  rol: {
    type: String,
    enum: ['cliente', 'admin'],
    default: 'cliente'
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  activo: {
    type: Boolean,
    default: true
  },
  reservasRealizadas: {
    type: Number,
    default: 0
  },
  esFrecuente: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para obtener id desde _id
usuarioSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Middleware para encriptar contraseña
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas
usuarioSchema.methods.compararPassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

// Método para verificar si es cliente frecuente (más de 5 reservas)
usuarioSchema.methods.actualizarClienteFrecuente = function() {
  this.esFrecuente = this.reservasRealizadas >= 5;
};

// Método para calcular edad
usuarioSchema.methods.calcularEdad = function() {
  const hoy = new Date();
  const nacimiento = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

// Método para verificar si es tercera edad (65+)
usuarioSchema.methods.esTerceraEdad = function() {
  return this.calcularEdad() >= 65;
};

// Método para verificar si es menor de edad
usuarioSchema.methods.esMenorDeEdad = function() {
  return this.calcularEdad() < 18;
};

module.exports = mongoose.model('Usuario', usuarioSchema);
