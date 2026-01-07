require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');

async function crearAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    // Verificar si ya existe un admin
    const adminExiste = await Usuario.findOne({ email: 'patrickcastillo@paraisoverde.com' });
    
    if (adminExiste) {
      console.log('Ya existe un usuario administrador con este email');
      process.exit(0);
    }

    // Crear usuario admin
    const admin = await Usuario.create({
      nombreUsuario: 'Patrick Castillo', //Actualizable
      email: 'patrickcastillo@paraisoverde.com', //Actualizable
      password: 'Admin123!', //Actualizable
      nombres: 'Patrick', //Actualizable
      apellidos: 'Castillo', //Actualizable
      cedula: '0707187865', //  Actualizable
      fechaNacimiento: new Date('1999-10-14'), // Actualizable
      telefono: '0999297777', // Actualizable
      direccion: 'Hotel Paraíso Verde', // Actualizable
      rol: 'admin' // No Actualizable
    });

    console.log('Usuario administrador creado exitosamente');
    console.log('Por favor cambie la contraseña después del primer login');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

crearAdmin();
