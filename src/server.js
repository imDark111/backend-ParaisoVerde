require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Sistema de Reservas Hotelero - Paraíso Verde
const app = express();

// Confiar en el proxy de Railway
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS configurado con variables de entorno
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:8100',
  'http://192.168.0.11:4200',
  'http://192.168.0.11:8100'
];

// Agregar URLs de producción desde variables de entorno
if (process.env.FRONTEND_CLIENTE_URL) {
  allowedOrigins.push(process.env.FRONTEND_CLIENTE_URL);
}
if (process.env.FRONTEND_ADMIN_URL) {
  allowedOrigins.push(process.env.FRONTEND_ADMIN_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Servir archivos estáticos con CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const clienteRoutes = require('./routes/cliente.routes');
const departamentoRoutes = require('./routes/departamento.routes');
const reservaRoutes = require('./routes/reserva.routes');
const facturaRoutes = require('./routes/factura.routes');
const pagoRoutes = require('./routes/pago.routes');
const logRoutes = require('./routes/log.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reporteRoutes = require('./routes/reporte.routes');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/departamentos', departamentoRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reporteRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🏨 API de Paraíso Verde Hotel' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Error interno del servidor',
      status: err.status || 500
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚀 Servidor corriendo en Railway en puerto ${PORT}`);
    console.log(`🌐 URL: ${process.env.BASE_URL || 'Configurar BASE_URL'}`);
  } else {
    console.log(`🚀 Servidor corriendo en http://192.168.0.11:${PORT}`);
    console.log(`📱 Accesible desde tu celular en la red local`);
  }
});

module.exports = app;
