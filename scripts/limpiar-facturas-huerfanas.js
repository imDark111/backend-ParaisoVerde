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

async function limpiarFacturasHuerfanas() {
  try {
    const facturas = await Factura.find({});
    let eliminadas = 0;
    const facturasParaEliminar = [];
    
    console.log(`\n🔍 Verificando ${facturas.length} facturas...\n`);
    
    for (const factura of facturas) {
      const reserva = await Reserva.findById(factura.reserva);
      
      if (!reserva) {
        console.log(`❌ Factura huérfana encontrada:`);
        console.log(`   ID: ${factura._id}`);
        console.log(`   Reserva (no existe): ${factura.reserva}`);
        console.log(`   Total: $${factura.total}`);
        facturasParaEliminar.push(factura._id);
      }
    }
    
    if (facturasParaEliminar.length > 0) {
      console.log(`\n⚠️  Se encontraron ${facturasParaEliminar.length} facturas huérfanas.`);
      console.log(`\n🗑️  Eliminando facturas huérfanas...`);
      
      const resultado = await Factura.deleteMany({ 
        _id: { $in: facturasParaEliminar } 
      });
      
      console.log(`✅ ${resultado.deletedCount} facturas eliminadas`);
    } else {
      console.log(`\n✅ No se encontraron facturas huérfanas`);
    }
    
    // Mostrar resumen final
    const facturasRestantes = await Factura.find({});
    console.log(`\n📊 Resumen final:`);
    console.log(`   Total facturas: ${facturasRestantes.length}`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

limpiarFacturasHuerfanas();
