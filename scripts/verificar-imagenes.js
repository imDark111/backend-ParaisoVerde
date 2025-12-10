require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

const departamentoSchema = new mongoose.Schema({}, { strict: false });
const Departamento = mongoose.model('departamentos', departamentoSchema);

async function verificarImagenes() {
  try {
    const departamentos = await Departamento.find({});
    
    console.log(`\n📦 Total de departamentos: ${departamentos.length}\n`);
    
    departamentos.forEach((depto, index) => {
      console.log(`${index + 1}. ${depto.nombre}`);
      console.log(`   Código: ${depto.codigo}`);
      
      if (depto.imagenes && depto.imagenes.length > 0) {
        console.log(`   Imágenes (${depto.imagenes.length}):`);
        depto.imagenes.forEach((img, i) => {
          console.log(`     [${i}] ${img.url}`);
        });
      } else {
        console.log(`   ⚠️ Sin imágenes`);
      }
      console.log('');
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verificarImagenes();
