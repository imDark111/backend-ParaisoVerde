require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');
const Cliente = require('../src/models/Cliente');

async function sincronizarUsuariosClientes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    // Obtener todos los usuarios con rol 'cliente'
    const usuarios = await Usuario.find({ rol: 'cliente' });
    console.log(`Encontrados ${usuarios.length} usuarios con rol 'cliente'`);

    let creados = 0;
    let existentes = 0;
    let errores = 0;

    for (const usuario of usuarios) {
      try {
        // Verificar si ya existe un cliente asociado
        const clienteExiste = await Cliente.findOne({ usuarioAsociado: usuario._id });
        
        if (clienteExiste) {
          console.log(`Cliente ya existe para usuario: ${usuario.nombreUsuario}`);
          existentes++;
          continue;
        }

        // Crear cliente
        await Cliente.create({
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          cedula: usuario.cedula,
          fechaNacimiento: usuario.fechaNacimiento,
          email: usuario.email,
          telefono: usuario.telefono || '',
          direccion: usuario.direccion || '',
          nacionalidad: 'No especificada',
          usuarioAsociado: usuario._id,
          reservasRealizadas: usuario.reservasRealizadas || 0,
          esFrecuente: usuario.esFrecuente || false
        });

        console.log(`Cliente creado para usuario: ${usuario.nombreUsuario}`);
        creados++;
      } catch (error) {
        console.error(`Error al crear cliente para ${usuario.nombreUsuario}:`, error.message);
        errores++;
      }
    }

    console.log('\nResumen:');
    console.log(`   Clientes creados: ${creados}`);
    console.log(`   Clientes existentes: ${existentes}`);
    console.log(`   Errores: ${errores}`);

    await mongoose.connection.close();
    console.log('\nProceso completado');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

sincronizarUsuariosClientes();
