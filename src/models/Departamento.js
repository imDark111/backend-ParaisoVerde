const mongoose = require('mongoose');

const departamentoSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: [true, 'El número de departamento es requerido'],
    unique: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['individual', 'doble', 'matrimonial', 'suite', 'presidencial'],
    default: 'doble'
  },
  descripcion: {
    type: String,
    trim: true
  },
  piso: {
    type: Number,
    required: true
  },
  precioNoche: {
    type: Number,
    required: [true, 'El precio por noche es requerido'],
    min: 0
  },
  capacidadPersonas: {
    type: Number,
    required: [true, 'La capacidad de personas es requerida'],
    min: 1
  },
  numeroCamas: {
    type: Number,
    required: true,
    min: 1
  },
  tipoCamas: {
    type: String,
    enum: ['individual', 'matrimonial', 'queen', 'king', 'mixta'],
    default: 'matrimonial'
  },
  caracteristicas: {
    televisor: { type: Boolean, default: false },
    wifi: { type: Boolean, default: true },
    aireAcondicionado: { type: Boolean, default: false },
    calefaccion: { type: Boolean, default: false },
    minibar: { type: Boolean, default: false },
    cajaFuerte: { type: Boolean, default: false },
    balcon: { type: Boolean, default: false },
    vistaAlMar: { type: Boolean, default: false },
    banoPrivado: { type: Boolean, default: true },
    jacuzzi: { type: Boolean, default: false },
    cocina: { type: Boolean, default: false },
    escritorio: { type: Boolean, default: false },
    secadorPelo: { type: Boolean, default: false },
    plancha: { type: Boolean, default: false },
    telefono: { type: Boolean, default: false }
  },
  imagenes: [{
    url: String,
    descripcion: String
  }],
  estado: {
    type: String,
    enum: ['disponible', 'ocupado', 'mantenimiento', 'reservado'],
    default: 'disponible'
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para obtener id desde _id
departamentoSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Índice para búsquedas rápidas
departamentoSchema.index({ estado: 1, tipo: 1 });

module.exports = mongoose.model('Departamento', departamentoSchema);