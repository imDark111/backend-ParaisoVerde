require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// Definir esquema de Usuario
const usuarioSchema = new mongoose.Schema({}, { strict: false });
const Usuario = mongoose.model('usuarios', usuarioSchema);

async function crearUsuarioPrueba() {
  try {
    // Contraseña: "test123456"
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('test123456', salt);

    // Verificar si ya existe
    const existe = await Usuario.findOne({ email: 'prueba@test.com' });
    if (existe) {
      console.log('⚠️ Usuario de prueba ya existe');
      
      // Actualizar contraseña
      await Usuario.updateOne(
        { email: 'prueba@test.com' },
        { 
          $set: { 
            password: passwordHash,
            twoFactorEnabled: false
          },
          $unset: { twoFactorSecret: "" }
        }
      );
      console.log('✅ Contraseña actualizada a: test123456');
    } else {
      // Crear nuevo usuario
      await Usuario.create({
        nombreUsuario: 'prueba',
        email: 'prueba@test.com',
        password: passwordHash,
        nombres: 'Usuario',
        apellidos: 'Prueba',
        cedula: '9999999999',
        fechaNacimiento: new Date('1990-01-01'),
        telefono: '0999999999',
        direccion: 'Dirección de prueba',
        rol: 'cliente',
        fotoPerfil: 'default-avatar.jpg',
        twoFactorEnabled: false,
        activo: true,
        reservasRealizadas: 0,
        esFrecuente: false
      });
      console.log('✅ Usuario de prueba creado');
    }

    console.log('\n📋 Credenciales de prueba:');
    console.log('   Email: prueba@test.com');
    console.log('   Contraseña: test123456');

    // También actualizar contraseña del usuario john@gmail.com
    const john = await Usuario.findOne({ email: 'john@gmail.com' });
    if (john) {
      await Usuario.updateOne(
        { email: 'john@gmail.com' },
        { 
          $set: { 
            password: passwordHash,
            twoFactorEnabled: false
          },
          $unset: { twoFactorSecret: "" }
        }
      );
      console.log('\n✅ Contraseña de john@gmail.com también actualizada a: test123456');
    }

    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

crearUsuarioPrueba();
