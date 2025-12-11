require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

const facturaSchema = new mongoose.Schema({}, { strict: false });
const Factura = mongoose.model('facturas', facturaSchema);

const reservaSchema = new mongoose.Schema({}, { strict: false });
const Reserva = mongoose.model('reservas', reservaSchema);

const usuarioSchema = new mongoose.Schema({}, { strict: false });
const Usuario = mongoose.model('usuarios', usuarioSchema);

async function diagnosticarFacturas() {
  try {
    const facturas = await Factura.find({});
    const reservas = await Reserva.find({});
    const usuarios = await Usuario.find({ rol: 'cliente' });
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Total facturas: ${facturas.length}`);
    console.log(`   Total reservas: ${reservas.length}`);
    console.log(`   Total usuarios cliente: ${usuarios.length}`);
    
    console.log(`\n📋 Facturas y sus relaciones:\n`);
    
    for (const factura of facturas) {
      console.log(`Factura ID: ${factura._id}`);
      console.log(`  - Reserva ID: ${factura.reserva}`);
      console.log(`  - Cliente ID: ${factura.cliente}`);
      console.log(`  - Total: $${factura.total}`);
      console.log(`  - Estado: ${factura.estadoPago}`);
      
      // Buscar la reserva asociada
      const reserva = await Reserva.findById(factura.reserva);
      if (reserva) {
        console.log(`  ✅ Reserva encontrada:`);
        console.log(`     - Usuario ID: ${reserva.usuario}`);
        console.log(`     - Cliente ID: ${reserva.cliente}`);
        console.log(`     - Departamento: ${reserva.departamento}`);
        
        // Buscar el usuario
        const usuario = await Usuario.findById(reserva.usuario);
        if (usuario) {
          console.log(`     - Usuario email: ${usuario.email}`);
          console.log(`     - Usuario nombre: ${usuario.nombres} ${usuario.apellidos}`);
        } else {
          console.log(`     ⚠️ Usuario no encontrado`);
        }
      } else {
        console.log(`  ❌ Reserva NO encontrada`);
      }
      console.log('');
    }
    
    console.log(`\n👤 Usuarios y sus reservas:\n`);
    for (const usuario of usuarios) {
      const reservasUsuario = await Reserva.find({ usuario: usuario._id });
      console.log(`Usuario: ${usuario.email} (${usuario.nombres} ${usuario.apellidos})`);
      console.log(`  - ID: ${usuario._id}`);
      console.log(`  - Reservas: ${reservasUsuario.length}`);
      
      if (reservasUsuario.length > 0) {
        const reservaIds = reservasUsuario.map(r => r._id.toString());
        const facturasUsuario = await Factura.find({ 
          reserva: { $in: reservasUsuario.map(r => r._id) } 
        });
        console.log(`  - Facturas: ${facturasUsuario.length}`);
        console.log(`  - Reserva IDs: ${reservaIds.join(', ')}`);
      }
      console.log('');
    }
    
    await mongoose.connection.close();
    console.log('🎉 Diagnóstico completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

diagnosticarFacturas();
