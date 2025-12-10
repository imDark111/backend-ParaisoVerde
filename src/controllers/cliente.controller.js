const Cliente = require('../models/Cliente');

// @desc    Obtener todos los clientes
// @route   GET /api/clientes
// @access  Private/Admin
exports.obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
      .populate('usuarioAsociado', 'nombreUsuario email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clientes.length,
      data: clientes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
};

// @desc    Obtener un cliente
// @route   GET /api/clientes/:id
// @access  Private
exports.obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
      .populate('usuarioAsociado', 'nombreUsuario email');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente',
      error: error.message
    });
  }
};

// @desc    Crear cliente
// @route   POST /api/clientes
// @access  Private
exports.crearCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create({
      ...req.body,
      usuarioAsociado: req.usuario._id
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente',
      error: error.message
    });
  }
};

// @desc    Actualizar cliente
// @route   PUT /api/clientes/:id
// @access  Private
exports.actualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cliente',
      error: error.message
    });
  }
};

// @desc    Eliminar cliente
// @route   DELETE /api/clientes/:id
// @access  Private/Admin
exports.eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cliente',
      error: error.message
    });
  }
};
