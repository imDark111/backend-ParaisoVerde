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

async function mostrarTodasReservas() {
  try {
    const reservas = await Reserva.find({});
    
    console.log(`\n📋 TODAS las reservas en la base de datos (${reservas.length}):\n`);
    
    for (const reserva of reservas) {
      console.log(`Reserva ID: ${reserva._id}`);
      console.log(`  - Código: ${reserva.codigoReserva}`);
      console.log(`  - Usuario ID: ${reserva.usuario}`);
      console.log(`  - Cliente ID: ${reserva.cliente}`);
      console.log(`  - Departamento: ${reserva.departamento}`);
      console.log(`  - Estado: ${reserva.estado}`);
      console.log(`  - Fecha inicio: ${reserva.fechaInicio}`);
      console.log(`  - Fecha fin: ${reserva.fechaFin}`);
      
      // Buscar si tiene factura
      const factura = await Factura.findOne({ reserva: reserva._id });
      if (factura) {
        console.log(`  ✅ Tiene factura: ${factura._id}`);
      } else {
        console.log(`  ❌ NO tiene factura`);
      }
      console.log('');
    }
    
    await mongoose.connection.close();
    console.log('🎉 Listado completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

mostrarTodasReservas();
