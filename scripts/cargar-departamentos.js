require('dotenv').config();
const mongoose = require('mongoose');
const Departamento = require('../src/models/Departamento');

const departamentosEjemplo = [
  {
    numero: '101',
    tipo: 'individual',
    descripcion: 'Habitación individual acogedora en el primer piso',
    piso: 1,
    precioNoche: 45.00,
    capacidadPersonas: 1,
    numeroCamas: 1,
    tipoCamas: 'individual',
    caracteristicas: {
      televisor: true,
      wifi: true,
      aireAcondicionado: true,
      banoPrivado: true,
      escritorio: true
    },
    estado: 'disponible'
  },
  {
    numero: '201',
    tipo: 'doble',
    descripcion: 'Habitación doble con vista a los jardines',
    piso: 2,
    precioNoche: 75.00,
    capacidadPersonas: 2,
    numeroCamas: 2,
    tipoCamas: 'individual',
    caracteristicas: {
      televisor: true,
      wifi: true,
      aireAcondicionado: true,
      minibar: true,
      cajaFuerte: true,
      balcon: true,
      banoPrivado: true
    },
    estado: 'disponible'
  },
  {
    numero: '301',
    tipo: 'matrimonial',
    descripcion: 'Habitación matrimonial con cama king size',
    piso: 3,
    precioNoche: 95.00,
    capacidadPersonas: 2,
    numeroCamas: 1,
    tipoCamas: 'king',
    caracteristicas: {
      televisor: true,
      wifi: true,
      aireAcondicionado: true,
      calefaccion: true,
      minibar: true,
      cajaFuerte: true,
      balcon: true,
      vistaAlMar: false,
      banoPrivado: true,
      jacuzzi: false
    },
    estado: 'disponible'
  },
  {
    numero: '401',
    tipo: 'suite',
    descripcion: 'Suite familiar con sala de estar separada',
    piso: 4,
    precioNoche: 150.00,
    capacidadPersonas: 4,
    numeroCamas: 2,
    tipoCamas: 'mixta',
    caracteristicas: {
      televisor: true,
      wifi: true,
      aireAcondicionado: true,
      calefaccion: true,
      minibar: true,
      cajaFuerte: true,
      balcon: true,
      vistaAlMar: true,
      banoPrivado: true,
      jacuzzi: true,
      cocina: true,
      escritorio: true,
      secadorPelo: true,
      plancha: true,
      telefono: true
    },
    estado: 'disponible'
  },
  {
    numero: '501',
    tipo: 'presidencial',
    descripcion: 'Suite presidencial de lujo con todas las comodidades',
    piso: 5,
    precioNoche: 300.00,
    capacidadPersonas: 6,
    numeroCamas: 3,
    tipoCamas: 'mixta',
    caracteristicas: {
      televisor: true,
      wifi: true,
      aireAcondicionado: true,
      calefaccion: true,
      minibar: true,
      cajaFuerte: true,
      balcon: true,
      vistaAlMar: true,
      banoPrivado: true,
      jacuzzi: true,
      cocina: true,
      escritorio: true,
      secadorPelo: true,
      plancha: true,
      telefono: true
    },
    estado: 'disponible'
  }
];

async function cargarDepartamentos() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar colección
    await Departamento.deleteMany({});
    console.log('🗑️  Departamentos anteriores eliminados');

    // Insertar departamentos de ejemplo
    await Departamento.insertMany(departamentosEjemplo);
    console.log(`✅ ${departamentosEjemplo.length} departamentos cargados exitosamente`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cargarDepartamentos();
