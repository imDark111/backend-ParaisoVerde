require('dotenv').config();
const mongoose = require('mongoose');
const Cliente = require('../src/models/Cliente');

async function eliminarClientes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');

    // Contar clientes actuales
    const countAntes = await Cliente.countDocuments();
    console.log(`\nClientes actuales: ${countAntes}`);

    // Eliminar todos los clientes
    const result = await Cliente.deleteMany({});
    console.log(`✅ ${result.deletedCount} clientes eliminados`);

    // Verificar estado final
    const countDespues = await Cliente.countDocuments();
    console.log(`Estado final: ${countDespues} clientes en la base de datos\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

eliminarClientes();
