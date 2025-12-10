const mongoose = require('mongoose');

const facturaSchema = new mongoose.Schema({
  numeroFactura: {
    type: String,
    unique: true
  },
  reserva: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reserva',
    required: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  fechaEmision: {
    type: Date,
    default: Date.now
  },
  subtotal: {
    type: Number,
    required: true
  },
  descuentos: {
    clienteFrecuente: { type: Number, default: 0 },
    otros: { type: Number, default: 0 }
  },
  iva: {
    type: Number,
    default: 0
  },
  recargos: {
    feriado: { type: Number, default: 0 },
    otros: { type: Number, default: 0 }
  },
  danos: [{
    descripcion: String,
    monto: Number,
    fecha: { type: Date, default: Date.now }
  }],
  totalDanos: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'pagada', 'parcial', 'anulada'],
    default: 'pendiente'
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'mixto'],
    trim: true
  },
  pagos: [{
    fecha: { type: Date, default: Date.now },
    monto: Number,
    metodo: String,
    referencia: String
  }],
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
facturaSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Middleware para generar número de factura
facturaSchema.pre('save', function(next) {
  if (!this.numeroFactura) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroFactura = `FACT-${timestamp}-${random}`;
  }
  next();
});

// Método para calcular total de daños
facturaSchema.methods.calcularTotalDanos = function() {
  this.totalDanos = this.danos.reduce((sum, dano) => sum + dano.monto, 0);
};

// Método para recalcular total
facturaSchema.methods.recalcularTotal = function() {
  const totalDescuentos = this.descuentos.clienteFrecuente + this.descuentos.otros;
  const totalRecargos = this.recargos.feriado + this.recargos.otros;
  
  this.total = this.subtotal 
    - totalDescuentos 
    + this.iva 
    + totalRecargos 
    + this.totalDanos;
};

module.exports = mongoose.model('Factura', facturaSchema);
