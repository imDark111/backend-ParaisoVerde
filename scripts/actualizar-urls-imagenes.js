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

// Definir esquema
const departamentoSchema = new mongoose.Schema({}, { strict: false });
const Departamento = mongoose.model('departamentos', departamentoSchema);

const usuarioSchema = new mongoose.Schema({}, { strict: false });
const Usuario = mongoose.model('usuarios', usuarioSchema);

async function actualizarURLsImagenes() {
  try {
    const BASE_URL_RAILWAY = 'https://backend-paraisoverde-dashboard.up.railway.app';
    
    // Actualizar departamentos
    const departamentos = await Departamento.find({});
    let departamentosActualizados = 0;
    
    for (const depto of departamentos) {
      let actualizado = false;
      
      if (depto.imagenes && Array.isArray(depto.imagenes)) {
        depto.imagenes = depto.imagenes.map(img => {
          if (img.url && img.url.includes('192.168.0.11:3000')) {
            actualizado = true;
            return {
              ...img,
              url: img.url.replace('http://192.168.0.11:3000', BASE_URL_RAILWAY)
            };
          }
          return img;
        });
      }
      
      if (actualizado) {
        await Departamento.updateOne(
          { _id: depto._id },
          { $set: { imagenes: depto.imagenes } }
        );
        departamentosActualizados++;
        console.log(`✅ Departamento actualizado: ${depto.nombre}`);
      }
    }
    
    // Actualizar fotos de perfil de usuarios
    const usuarios = await Usuario.find({
      fotoPerfil: { $regex: '192.168.0.11:3000' }
    });
    
    let usuariosActualizados = 0;
    for (const usuario of usuarios) {
      if (usuario.fotoPerfil && usuario.fotoPerfil.includes('192.168.0.11:3000')) {
        const nuevaURL = usuario.fotoPerfil.replace('http://192.168.0.11:3000', BASE_URL_RAILWAY);
        await Usuario.updateOne(
          { _id: usuario._id },
          { $set: { fotoPerfil: nuevaURL } }
        );
        usuariosActualizados++;
        console.log(`✅ Usuario actualizado: ${usuario.email}`);
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   - ${departamentosActualizados} departamentos actualizados`);
    console.log(`   - ${usuariosActualizados} usuarios actualizados`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

actualizarURLsImagenes();
