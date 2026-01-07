require('dotenv').config();
const mongoose = require('mongoose');
const Reserva = require('../src/models/Reserva');
const Factura = require('../src/models/Factura');
const Cliente = require('../src/models/Cliente');
const Usuario = require('../src/models/Usuario');
const Departamento = require('../src/models/Departamento');

async function verificarFacturaReserva() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    const codigoReserva = 'PV-MK3NPDDB-CY0EA';
    
    // Buscar la reserva por código
    const reserva = await Reserva.findOne({ codigoReserva })
      .populate('usuario')
      .populate('cliente')
      .populate('departamento');

    if (!reserva) {
      console.log(`❌ No se encontró la reserva con código: ${codigoReserva}`);
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Información de la Reserva:');
    console.log(`   ID: ${reserva._id}`);
    console.log(`   Código: ${reserva.codigoReserva}`);
    console.log(`   Estado: ${reserva.estado}`);
    console.log(`   Cliente: ${reserva.cliente?.nombres} ${reserva.cliente?.apellidos}`);
    console.log(`   Usuario: ${reserva.usuario?.email}`);
    console.log(`   Departamento: ${reserva.departamento?.numero}`);
    console.log(`   Fecha Inicio: ${reserva.fechaInicio}`);
    console.log(`   Fecha Fin: ${reserva.fechaFin}`);
    console.log(`   Total: $${reserva.total}`);
    console.log(`   Subtotal: $${reserva.subtotal}`);
    console.log(`   IVA: $${reserva.iva}`);

    // Buscar factura asociada
    const factura = await Factura.findOne({ reserva: reserva._id })
      .populate('cliente');

    if (factura) {
      console.log('\n✅ FACTURA ENCONTRADA:');
      console.log(`   ID: ${factura._id}`);
      console.log(`   Número: ${factura.numeroFactura}`);
      console.log(`   Total: $${factura.total}`);
      console.log(`   Estado: ${factura.estadoPago}`);
      console.log(`   Fecha Emisión: ${factura.fechaEmision}`);
    } else {
      console.log('\n❌ NO SE ENCONTRÓ FACTURA para esta reserva');
      console.log('\n🔧 Creando factura automáticamente...');
      
      try {
        const nuevaFactura = await Factura.create({
          reserva: reserva._id,
          cliente: reserva.cliente._id,
          subtotal: reserva.subtotal || 0,
          descuentos: {
            clienteFrecuente: reserva.descuentoClienteFrecuente || 0
          },
          iva: reserva.iva || 0,
          recargos: {
            feriado: reserva.recargoFeriado || 0
          },
          total: reserva.total
        });

        console.log('✅ Factura creada exitosamente:');
        console.log(`   ID: ${nuevaFactura._id}`);
        console.log(`   Número: ${nuevaFactura.numeroFactura}`);
        console.log(`   Total: $${nuevaFactura.total}`);
      } catch (error) {
        console.error('❌ Error al crear factura:', error.message);
      }
    }

    await mongoose.connection.close();
    console.log('\n🎉 Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verificarFacturaReserva();
