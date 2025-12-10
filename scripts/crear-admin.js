require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');

async function crearAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const adminExiste = await Usuario.findOne({ email: 'admin@paraisoverde.com' });
    
    if (adminExiste) {
      console.log('⚠️  Ya existe un usuario administrador');
      process.exit(0);
    }

    // Crear usuario admin
    const admin = await Usuario.create({
      nombreUsuario: 'admin',
      email: 'admin@paraisoverde.com',
      password: 'Admin123!',
      nombres: 'Administrador',
      apellidos: 'Sistema',
      cedula: '0000000000',
      fechaNacimiento: new Date('1990-01-01'),
      telefono: '0999999999',
      direccion: 'Hotel Paraíso Verde',
      rol: 'admin'
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@paraisoverde.com');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  Por favor cambie la contraseña después del primer login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearAdmin();
