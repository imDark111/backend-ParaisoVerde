require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');
const Cliente = require('../src/models/Cliente');
const Reserva = require('../src/models/Reserva');
const Factura = require('../src/models/Factura');
const Departamento = require('../src/models/Departamento');

async function debugFacturasCliente() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    const email = 'victorjose@gmail.com';
    
    // Buscar usuario
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      await mongoose.connection.close();
      return;
    }

    console.log(`👤 Usuario: ${usuario.nombres} ${usuario.apellidos}`);
    console.log(`   ID: ${usuario._id}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Rol: ${usuario.rol}\n`);

    // Buscar cliente asociado
    const clienteAsociado = await Cliente.findOne({ usuarioAsociado: usuario._id });
    console.log(`💼 Cliente asociado: ${clienteAsociado ? 'SÍ' : 'NO'}`);
    if (clienteAsociado) {
      console.log(`   ID Cliente: ${clienteAsociado._id}`);
      console.log(`   Nombre: ${clienteAsociado.nombres} ${clienteAsociado.apellidos}\n`);
    }

    // Buscar reservas (simulando lo que hace el backend)
    console.log('🔍 Buscando reservas del usuario...');
    const reservasUsuario = await Reserva.find({ 
      $or: [
        { usuario: usuario._id },
        { cliente: clienteAsociado?._id }
      ]
    }).select('_id codigoReserva estado total');

    console.log(`   Encontradas ${reservasUsuario.length} reservas:`);
    reservasUsuario.forEach(r => {
      console.log(`   - ${r.codigoReserva} (${r.estado}) - $${r.total}`);
    });

    const reservaIds = reservasUsuario.map(r => r._id);
    console.log(`\n📋 IDs de reservas: ${reservaIds.join(', ')}\n`);

    // Buscar facturas (simulando lo que hace el backend)
    console.log('🔍 Buscando facturas...');
    const filtro = { reserva: { $in: reservaIds } };
    console.log(`   Filtro: ${JSON.stringify(filtro)}\n`);

    const facturas = await Factura.find(filtro)
      .populate({
        path: 'reserva',
        populate: { path: 'departamento' }
      })
      .populate('cliente')
      .sort({ createdAt: -1 });

    console.log(`✅ Facturas encontradas: ${facturas.length}\n`);
    
    facturas.forEach(f => {
      console.log(`📄 Factura: ${f.numeroFactura}`);
      console.log(`   ID: ${f._id}`);
      console.log(`   Reserva: ${f.reserva?.codigoReserva}`);
      console.log(`   Cliente: ${f.cliente?.nombres} ${f.cliente?.apellidos}`);
      console.log(`   Total: $${f.total}`);
      console.log(`   Estado: ${f.estadoPago}`);
      console.log('');
    });

    // Verificar qué devolvería el endpoint
    console.log('📦 Respuesta simulada del endpoint:');
    console.log(JSON.stringify({
      success: true,
      count: facturas.length,
      data: facturas.map(f => ({
        id: f._id,
        numeroFactura: f.numeroFactura,
        total: f.total,
        estadoPago: f.estadoPago,
        reserva: f.reserva?.codigoReserva
      }))
    }, null, 2));

    await mongoose.connection.close();
    console.log('\n🎉 Diagnóstico completado');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

debugFacturasCliente();
