// Inicializar Stripe solo si hay clave configurada
let stripe;
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey.startsWith('sk_')) {
    stripe = require('stripe')(stripeKey);
  } else {
    console.warn('⚠️ Stripe no configurado correctamente. Usando modo simulación.');
  }
} catch (error) {
  console.error('Error al inicializar Stripe:', error);
}

const Factura = require('../models/Factura');
const Reserva = require('../models/Reserva');

// @desc    Crear intención de pago con Stripe
// @route   POST /api/pagos/crear-intencion
// @access  Private/Cliente
exports.crearIntencionPago = async (req, res) => {
  try {
    const { facturaId } = req.body;

    const factura = await Factura.findById(facturaId)
      .populate('reserva')
      .populate('cliente');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Verificar que la factura pertenece al usuario autenticado
    if (req.user && factura.cliente._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para pagar esta factura'
      });
    }

    if (factura.estadoPago === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya está pagada'
      });
    }

    if (factura.estadoPago === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'Esta factura está anulada'
      });
    }

    // Calcular monto pendiente
    const totalPagado = factura.pagos.reduce((sum, pago) => sum + pago.monto, 0);
    const montoPendiente = factura.total - totalPagado;

    if (montoPendiente <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta factura no tiene saldo pendiente'
      });
    }

    // MODO SIMULACIÓN para proyecto universitario (sin Stripe real)
    let paymentIntent;
    
    if (stripe) {
      // Crear Payment Intent en Stripe (modo prueba)
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(montoPendiente * 100), // Stripe usa centavos
          currency: 'usd',
          description: `Pago factura ${factura.numeroFactura} - Reserva ${factura.reserva.codigoReserva}`,
          metadata: {
            facturaId: factura._id.toString(),
            clienteId: factura.cliente._id.toString(),
            numeroFactura: factura.numeroFactura,
            proyecto: 'UNIVERSITARIO - PRUEBA'
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });
      } catch (stripeError) {
        console.error('Error de Stripe:', stripeError);
        // Si falla Stripe, usar modo simulación
        paymentIntent = null;
      }
    }
    
    // Si no hay Stripe o falló, crear intención simulada
    if (!paymentIntent) {
      const randomId = 'pi_test_' + Math.random().toString(36).substring(7);
      paymentIntent = {
        id: randomId,
        client_secret: randomId + '_secret_' + Math.random().toString(36).substring(7),
        amount: Math.round(montoPendiente * 100),
        currency: 'usd',
        status: 'requires_payment_method'
      };
      console.log('💳 Usando modo simulación de pago (sin Stripe real)');
    }

    res.json({
      success: true,
      message: 'Intención de pago creada',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: montoPendiente,
        factura: {
          id: factura._id,
          numeroFactura: factura.numeroFactura,
          total: factura.total,
          montoPendiente: montoPendiente
        }
      }
    });
  } catch (error) {
    console.error('Error al crear intención de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear intención de pago',
      error: error.message
    });
  }
};

// @desc    Confirmar pago exitoso
// @route   POST /api/pagos/confirmar
// @access  Private/Cliente
exports.confirmarPago = async (req, res) => {
  try {
    const { paymentIntentId, facturaId } = req.body;

    let paymentIntent;
    let monto;

    // Verificar el pago en Stripe o modo simulación
    if (stripe && !paymentIntentId.startsWith('pi_test_')) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            success: false,
            message: 'El pago no ha sido completado'
          });
        }
        
        monto = paymentIntent.amount / 100; // Convertir de centavos a dólares
      } catch (stripeError) {
        console.error('Error al verificar pago en Stripe:', stripeError);
        paymentIntent = null;
      }
    }

    // Modo simulación para proyecto universitario
    if (!paymentIntent || paymentIntentId.startsWith('pi_test_')) {
      console.log('💳 Confirmando pago en modo simulación');
      const factura = await Factura.findById(facturaId);
      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }
      
      const totalPagado = factura.pagos.reduce((sum, pago) => sum + pago.monto, 0);
      monto = factura.total - totalPagado; // Monto pendiente
      
      paymentIntent = {
        id: paymentIntentId,
        amount: Math.round(monto * 100),
        status: 'succeeded'
      };
    }

    const factura = await Factura.findById(facturaId).populate('reserva');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Registrar el pago en la factura
    
    factura.pagos.push({
      monto: monto,
      metodo: 'tarjeta',
      referencia: `STRIPE-${paymentIntentId}`,
      fecha: new Date()
    });

    // Calcular total pagado
    const totalPagado = factura.pagos.reduce((sum, pago) => sum + pago.monto, 0);

    if (totalPagado >= factura.total) {
      factura.estadoPago = 'pagada';
    } else if (totalPagado > 0) {
      factura.estadoPago = 'parcial';
    }

    factura.metodoPago = 'tarjeta';
    await factura.save();

    res.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: {
        factura,
        paymentIntent: {
          id: paymentIntent.id,
          amount: monto,
          status: paymentIntent.status
        }
      }
    });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar pago',
      error: error.message
    });
  }
};

// @desc    Obtener tarjetas de prueba de Stripe
// @route   GET /api/pagos/tarjetas-prueba
// @access  Public
exports.obtenerTarjetasPrueba = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Tarjetas de prueba para entorno universitario',
      data: {
        nota: '⚠️ SOLO PARA PRUEBAS - PROYECTO UNIVERSITARIO',
        tarjetas: [
          {
            tipo: 'Visa',
            numero: '4242 4242 4242 4242',
            cvv: 'Cualquier 3 dígitos',
            fecha: 'Cualquier fecha futura',
            resultado: 'Pago exitoso'
          },
          {
            tipo: 'Visa (Requiere autenticación)',
            numero: '4000 0027 6000 3184',
            cvv: 'Cualquier 3 dígitos',
            fecha: 'Cualquier fecha futura',
            resultado: 'Pago exitoso con 3D Secure'
          },
          {
            tipo: 'Visa (Rechazada)',
            numero: '4000 0000 0000 0002',
            cvv: 'Cualquier 3 dígitos',
            fecha: 'Cualquier fecha futura',
            resultado: 'Tarjeta rechazada'
          },
          {
            tipo: 'Mastercard',
            numero: '5555 5555 5555 4444',
            cvv: 'Cualquier 3 dígitos',
            fecha: 'Cualquier fecha futura',
            resultado: 'Pago exitoso'
          }
        ],
        documentacion: 'https://stripe.com/docs/testing'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener tarjetas de prueba',
      error: error.message
    });
  }
};

// @desc    Webhook de Stripe para eventos de pago
// @route   POST /api/pagos/webhook
// @access  Public (verificado por Stripe)
exports.webhookStripe = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💰 Pago exitoso:', paymentIntent.id);
      // Aquí podrías actualizar la factura automáticamente
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Pago fallido:', failedPayment.id);
      break;
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  res.json({ received: true });
};
