require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

const reservaSchema = new mongoose.Schema({}, { strict: false });
const Reserva = mongoose.model('reservas', reservaSchema);

const facturaSchema = new mongoose.Schema({}, { strict: false });
const Factura = mongoose.model('facturas', facturaSchema);

async function limpiarReservasYFacturas() {
  try {
    // Contar antes de eliminar
    const countReservas = await Reserva.countDocuments();
    const countFacturas = await Factura.countDocuments();
    
    console.log(`\n📊 Estado actual:`);
    console.log(`   Reservas: ${countReservas}`);
    console.log(`   Facturas: ${countFacturas}`);
    
    console.log(`\n🗑️  Eliminando todas las reservas...`);
    const resultadoReservas = await Reserva.deleteMany({});
    console.log(`✅ ${resultadoReservas.deletedCount} reservas eliminadas`);
    
    console.log(`\n🗑️  Eliminando todas las facturas...`);
    const resultadoFacturas = await Factura.deleteMany({});
    console.log(`✅ ${resultadoFacturas.deletedCount} facturas eliminadas`);
    
    console.log(`\n📊 Estado final:`);
    console.log(`   Reservas: 0`);
    console.log(`   Facturas: 0`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Base de datos limpia - Listo para crear nuevas reservas y facturas desde el frontend');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

limpiarReservasYFacturas();
