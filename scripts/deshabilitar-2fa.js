require('dotenv').config();
const mongoose = require('mongoose');

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

async function deshabilitarDobleAutenticacion() {
  try {
    // Deshabilitar 2FA para el usuario john@gmail.com
    const resultado = await Usuario.updateOne(
      { email: 'john@gmail.com' },
      { 
        $set: { 
          twoFactorEnabled: false
        },
        $unset: {
          twoFactorSecret: ""
        }
      }
    );

    if (resultado.modifiedCount > 0) {
      console.log('✅ Doble autenticación deshabilitada para john@gmail.com');
    } else {
      console.log('⚠️ Usuario no encontrado o 2FA ya estaba deshabilitado');
    }

    // También para el admin si existe
    const resultadoAdmin = await Usuario.updateOne(
      { email: 'admin@paraisoverde.com' },
      { 
        $set: { 
          twoFactorEnabled: false
        },
        $unset: {
          twoFactorSecret: ""
        }
      }
    );

    if (resultadoAdmin.modifiedCount > 0) {
      console.log('✅ Doble autenticación deshabilitada para admin@paraisoverde.com');
    } else {
      console.log('⚠️ Admin no encontrado o 2FA ya estaba deshabilitado');
    }

    // Mostrar usuarios con 2FA habilitado
    const usuariosCon2FA = await Usuario.find({ twoFactorEnabled: true }, 'email nombreUsuario twoFactorEnabled');
    
    if (usuariosCon2FA.length > 0) {
      console.log('\n⚠️ Usuarios que aún tienen 2FA habilitado:');
      usuariosCon2FA.forEach(u => {
        console.log(`  - ${u.email} (${u.nombreUsuario})`);
      });
    } else {
      console.log('\n✅ No hay usuarios con 2FA habilitado');
    }

    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deshabilitarDobleAutenticacion();
