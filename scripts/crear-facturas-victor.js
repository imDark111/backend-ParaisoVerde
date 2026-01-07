require('dotenv').config();
const mongoose = require('mongoose');
const Reserva = require('../src/models/Reserva');
const Factura = require('../src/models/Factura');
const Cliente = require('../src/models/Cliente');
const Usuario = require('../src/models/Usuario');
const Departamento = require('../src/models/Departamento');

async function crearFacturasUsuario() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuario por email
    const usuario = await Usuario.findOne({ email: 'victorjose@gmail.com' });
    
    if (!usuario) {
      console.log('❌ No se encontró usuario con email: victorjose@gmail.com');
      await mongoose.connection.close();
      return;
    }

    console.log(`👤 Usuario encontrado: ${usuario.nombres} ${usuario.apellidos}`);
    console.log(`   ID: ${usuario._id}`);
    console.log(`   Email: ${usuario.email}\n`);

    // Buscar cliente asociado
    const cliente = await Cliente.findOne({ usuarioAsociado: usuario._id });
    
    if (!cliente) {
      console.log('❌ No se encontró cliente asociado a este usuario');
      await mongoose.connection.close();
      return;
    }

    console.log(`💼 Cliente asociado: ${cliente.nombres} ${cliente.apellidos}`);
    console.log(`   ID: ${cliente._id}\n`);

    // Buscar todas las reservas del usuario o del cliente
    const reservas = await Reserva.find({
      $or: [
        { usuario: usuario._id },
        { cliente: cliente._id }
      ]
    }).populate('departamento');

    console.log(`📋 Encontradas ${reservas.length} reservas\n`);

    let facturasCreadas = 0;
    let facturasExistentes = 0;
    let errores = 0;

    for (const reserva of reservas) {
      console.log(`\n🔍 Verificando reserva: ${reserva.codigoReserva}`);
      console.log(`   ID: ${reserva._id}`);
      console.log(`   Estado: ${reserva.estado}`);
      console.log(`   Departamento: ${reserva.departamento?.numero}`);
      console.log(`   Total: $${reserva.total}`);

      // Buscar factura existente
      const facturaExistente = await Factura.findOne({ reserva: reserva._id });

      if (facturaExistente) {
        console.log(`   ✅ Factura ya existe: ${facturaExistente.numeroFactura}`);
        facturasExistentes++;
      } else {
        console.log(`   ⚠️  Factura NO existe - Creando...`);
        
        try {
          const nuevaFactura = await Factura.create({
            reserva: reserva._id,
            cliente: cliente._id,
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

          console.log(`   ✅ Factura creada: ${nuevaFactura.numeroFactura}`);
          facturasCreadas++;
        } catch (error) {
          console.error(`   ❌ Error al crear factura:`, error.message);
          errores++;
        }
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`   📋 Total reservas: ${reservas.length}`);
    console.log(`   ✅ Facturas ya existentes: ${facturasExistentes}`);
    console.log(`   🆕 Facturas creadas: ${facturasCreadas}`);
    console.log(`   ❌ Errores: ${errores}`);

    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

crearFacturasUsuario();
