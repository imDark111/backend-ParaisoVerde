require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

const usuarioSchema = new mongoose.Schema({}, { strict: false });
const Usuario = mongoose.model('usuarios', usuarioSchema);

async function configurarAdmin() {
  try {
    // Contraseña: "admin123"
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    // Buscar admin existente
    const adminExistente = await Usuario.findOne({ rol: 'admin' });
    
    if (adminExistente) {
      // Actualizar admin existente
      await Usuario.updateOne(
        { _id: adminExistente._id },
        { 
          $set: { 
            password: passwordHash,
            twoFactorEnabled: false
          },
          $unset: { twoFactorSecret: "" }
        }
      );
      
      console.log('✅ Admin actualizado');
      console.log(`   Email: ${adminExistente.email}`);
      console.log('   Nueva contraseña: admin123');
    } else {
      // Crear nuevo admin
      await Usuario.create({
        nombreUsuario: 'admin',
        email: 'admin@paraisoverde.com',
        password: passwordHash,
        nombres: 'Administrador',
        apellidos: 'Sistema',
        cedula: '0000000000',
        fechaNacimiento: new Date('1990-01-01'),
        telefono: '0999999999',
        direccion: 'Oficina Central',
        rol: 'admin',
        fotoPerfil: 'default-avatar.jpg',
        twoFactorEnabled: false,
        activo: true,
        reservasRealizadas: 0,
        esFrecuente: false
      });
      
      console.log('✅ Admin creado');
      console.log('   Email: admin@paraisoverde.com');
      console.log('   Contraseña: admin123');
    }

    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

configurarAdmin();
