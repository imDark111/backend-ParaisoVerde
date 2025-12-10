require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://jchugchil1:cisco@clusterproyecto.xkwyvc4.mongodb.net/paraisoVerde?retryWrites=true&w=majority';

async function importarColecciones() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const db = mongoose.connection.db;
    const bdPath = path.join(__dirname, '..', '..', 'bd');

    // Leer y parsear cada CSV
    const colecciones = [
      { file: 'paraisoVerde.usuarios.csv', collection: 'usuarios' },
      { file: 'paraisoVerde.clientes.csv', collection: 'clientes' },
      { file: 'paraisoVerde.departamentos.csv', collection: 'departamentos' },
      { file: 'paraisoVerde.reservas.csv', collection: 'reservas' },
      { file: 'paraisoVerde.facturas.csv', collection: 'facturas' },
      { file: 'paraisoVerde.logs.csv', collection: 'logs' }
    ];

    for (const { file, collection } of colecciones) {
      const filePath = path.join(bdPath, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${file} no encontrado, saltando...`);
        continue;
      }

      const csvData = fs.readFileSync(filePath, 'utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        console.log(`⚠️ ${file} está vacío, saltando...`);
        continue;
      }

      const headers = lines[0].split(',');
      const documents = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const doc = {};

        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          
          // Manejar campos anidados (ej: caracteristicas.wifi)
          if (header.includes('.')) {
            const [parent, child] = header.split('.');
            if (!doc[parent]) doc[parent] = {};
            
            // Convertir booleanos
            if (value === 'true') doc[parent][child] = true;
            else if (value === 'false') doc[parent][child] = false;
            else if (value && value !== '') doc[parent][child] = value;
          } 
          // Manejar arrays (ej: imagenes[0].url)
          else if (header.includes('[')) {
            const match = header.match(/(.+)\[(\d+)\]\.(.+)/);
            if (match) {
              const [, arrayName, index, prop] = match;
              if (!doc[arrayName]) doc[arrayName] = [];
              if (!doc[arrayName][index]) doc[arrayName][index] = {};
              if (value && value !== '') doc[arrayName][index][prop] = value;
            }
          }
          // Campos normales
          else {
            // Convertir tipos
            if (value === 'true') doc[header] = true;
            else if (value === 'false') doc[header] = false;
            else if (value === '') doc[header] = null;
            else if (!isNaN(value) && value !== '') doc[header] = Number(value);
            else if (value?.includes('T') && value?.includes('Z')) doc[header] = new Date(value);
            else doc[header] = value;
          }
        });

        // Convertir _id a ObjectId
        if (doc._id && typeof doc._id === 'string') {
          try {
            doc._id = new mongoose.Types.ObjectId(doc._id);
          } catch (e) {
            console.log(`⚠️ Error convirtiendo _id en ${collection}: ${doc._id}`);
          }
        }

        documents.push(doc);
      }

      // Limpiar colección existente e insertar
      await db.collection(collection).deleteMany({});
      if (documents.length > 0) {
        try {
          await db.collection(collection).insertMany(documents, { ordered: false });
          console.log(`✅ ${collection}: ${documents.length} documentos importados`);
        } catch (error) {
          if (error.code === 11000) {
            const inserted = error.result?.insertedCount || 0;
            console.log(`⚠️ ${collection}: ${inserted} documentos importados (algunos duplicados ignorados)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 ¡Importación completa!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importarColecciones();
