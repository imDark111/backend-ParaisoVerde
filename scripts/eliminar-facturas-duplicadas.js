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

async function eliminarFacturasDuplicadas() {
  try {
    const facturas = await Factura.find({}).sort({ createdAt: 1 }); // Ordenar por fecha de creación
    
    const reservasVistas = new Map();
    const duplicados = [];
    
    console.log(`\n🔍 Buscando duplicados en ${facturas.length} facturas...\n`);
    
    for (const factura of facturas) {
      const reservaId = factura.reserva.toString();
      
      if (reservasVistas.has(reservaId)) {
        // Es un duplicado, marcar para eliminar
        console.log(`❌ Duplicado encontrado:`);
        console.log(`   Factura ID: ${factura._id}`);
        console.log(`   Reserva: ${reservaId}`);
        console.log(`   Fecha: ${factura.createdAt}`);
        console.log(`   Original: ${reservasVistas.get(reservaId)}`);
        duplicados.push(factura._id);
      } else {
        // Es la primera factura para esta reserva
        reservasVistas.set(reservaId, factura._id);
      }
    }
    
    if (duplicados.length > 0) {
      console.log(`\n⚠️  Se encontraron ${duplicados.length} facturas duplicadas.`);
      console.log(`\n🗑️  Eliminando duplicados (manteniendo las más antiguas)...`);
      
      const resultado = await Factura.deleteMany({ 
        _id: { $in: duplicados } 
      });
      
      console.log(`✅ ${resultado.deletedCount} facturas duplicadas eliminadas`);
    } else {
      console.log(`\n✅ No se encontraron facturas duplicadas`);
    }
    
    // Mostrar resumen final
    const facturasRestantes = await Factura.find({});
    console.log(`\n📊 Resumen final:`);
    console.log(`   Total facturas únicas: ${facturasRestantes.length}`);
    
    // Agrupar por reserva para verificar
    const porReserva = {};
    for (const f of facturasRestantes) {
      const rid = f.reserva.toString();
      porReserva[rid] = (porReserva[rid] || 0) + 1;
    }
    
    console.log(`   Reservas con factura: ${Object.keys(porReserva).length}`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

eliminarFacturasDuplicadas();
