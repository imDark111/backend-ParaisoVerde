require('dotenv').config();
const mongoose = require('mongoose');
const Reserva = require('../src/models/Reserva');
const Cliente = require('../src/models/Cliente');
const Usuario = require('../src/models/Usuario');

async function actualizarReservasAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener el ID del usuario admin
    const admin = await Usuario.findOne({ email: 'admin@paraisoverde.com' });
    if (!admin) {
      console.log('⚠️  No se encontró usuario admin');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Admin encontrado: ${admin.email} (${admin._id})`);

    // Buscar todas las reservas creadas por el admin
    const reservasAdmin = await Reserva.find({ usuario: admin._id }).populate('cliente');
    console.log(`📊 Encontradas ${reservasAdmin.length} reservas creadas por admin`);

    let actualizadas = 0;
    let sinUsuarioAsociado = 0;
    let errores = 0;

    for (const reserva of reservasAdmin) {
      try {
        const cliente = reserva.cliente;
        
        if (!cliente) {
          console.log(`⚠️  Reserva ${reserva._id} no tiene cliente asociado`);
          errores++;
          continue;
        }

        if (!cliente.usuarioAsociado) {
          console.log(`⚠️  Cliente ${cliente.nombres} ${cliente.apellidos} no tiene usuarioAsociado`);
          sinUsuarioAsociado++;
          continue;
        }

        // Verificar que el usuario asociado existe
        const usuarioCliente = await Usuario.findById(cliente.usuarioAsociado);
        if (!usuarioCliente) {
          console.log(`⚠️  Usuario asociado ${cliente.usuarioAsociado} no existe`);
          errores++;
          continue;
        }

        // Actualizar la reserva para que apunte al usuario del cliente
        reserva.usuario = cliente.usuarioAsociado;
        await reserva.save();

        console.log(`✅ Reserva ${reserva._id} actualizada: ${admin.email} → ${usuarioCliente.email}`);
        actualizadas++;
      } catch (error) {
        console.error(`❌ Error al procesar reserva ${reserva._id}:`, error.message);
        errores++;
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`   ✅ Reservas actualizadas: ${actualizadas}`);
    console.log(`   ⚠️  Clientes sin usuario asociado: ${sinUsuarioAsociado}`);
    console.log(`   ❌ Errores: ${errores}`);

    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

actualizarReservasAdmin();
