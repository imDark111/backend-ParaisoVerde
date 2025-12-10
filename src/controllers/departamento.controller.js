const Departamento = require('../models/Departamento');

// @desc    Obtener todos los departamentos
// @route   GET /api/departamentos
// @access  Public
exports.obtenerDepartamentos = async (req, res) => {
  try {
    const { tipo, estado, capacidad } = req.query;
    
    let filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    if (capacidad) filtro.capacidadPersonas = { $gte: parseInt(capacidad) };

    const departamentos = await Departamento.find(filtro).sort({ numero: 1 });

    res.json({
      success: true,
      count: departamentos.length,
      data: departamentos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener departamentos',
      error: error.message
    });
  }
};

// @desc    Obtener un departamento
// @route   GET /api/departamentos/:id
// @access  Public
exports.obtenerDepartamento = async (req, res) => {
  try {
    const departamento = await Departamento.findById(req.params.id);

    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    res.json({
      success: true,
      data: departamento
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener departamento',
      error: error.message
    });
  }
};

// @desc    Crear departamento
// @route   POST /api/departamentos
// @access  Private/Admin
exports.crearDepartamento = async (req, res) => {
  try {
    console.log('📦 Datos recibidos para crear departamento:', JSON.stringify(req.body, null, 2));
    console.log('🖼️ Imágenes recibidas:', req.body.imagenes);
    console.log('✨ Características recibidas:', req.body.caracteristicas);
    
    const departamento = await Departamento.create(req.body);

    console.log('✅ Departamento creado:', departamento._id);
    console.log('🖼️ Imágenes guardadas:', departamento.imagenes);

    res.status(201).json({
      success: true,
      message: 'Departamento creado exitosamente',
      data: departamento
    });
  } catch (error) {
    console.error('❌ Error al crear departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear departamento',
      error: error.message
    });
  }
};

// @desc    Actualizar departamento
// @route   PUT /api/departamentos/:id
// @access  Private/Admin
exports.actualizarDepartamento = async (req, res) => {
  try {
    console.log('📝 Actualizando departamento:', req.params.id);
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.log('🖼️ Imágenes recibidas:', req.body.imagenes);
    console.log('✨ Características recibidas:', req.body.caracteristicas);
    
    const departamento = await Departamento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    console.log('✅ Departamento actualizado');
    console.log('🖼️ Imágenes guardadas:', departamento.imagenes);

    res.json({
      success: true,
      message: 'Departamento actualizado exitosamente',
      data: departamento
    });
  } catch (error) {
    console.error('❌ Error al actualizar departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar departamento',
      error: error.message
    });
  }
};

// @desc    Eliminar departamento
// @route   DELETE /api/departamentos/:id
// @access  Private/Admin
exports.eliminarDepartamento = async (req, res) => {
  try {
    const departamento = await Departamento.findByIdAndDelete(req.params.id);

    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Departamento eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar departamento',
      error: error.message
    });
  }
};

// @desc    Subir imágenes del departamento
// @route   POST /api/departamentos/:id/imagenes
// @access  Private/Admin
exports.subirImagenes = async (req, res) => {
  try {
    const departamento = await Departamento.findById(req.params.id);

    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron imágenes'
      });
    }

    const imagenes = req.files.map(file => ({
      url: `/uploads/departamentos/${file.filename}`,
      descripcion: req.body.descripcion || ''
    }));

    departamento.imagenes.push(...imagenes);
    await departamento.save();

    res.json({
      success: true,
      message: 'Imágenes subidas exitosamente',
      data: departamento
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al subir imágenes',
      error: error.message
    });
  }
};

// @desc    Verificar disponibilidad
// @route   GET /api/departamentos/:id/disponibilidad
// @access  Public
exports.verificarDisponibilidad = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas requeridas'
      });
    }

    const departamento = await Departamento.findById(req.params.id);

    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    // Buscar reservas conflictivas
    const Reserva = require('../models/Reserva');
    const conflicto = await Reserva.findOne({
      departamento: req.params.id,
      estado: { $in: ['confirmada', 'en-curso'] },
      $or: [
        {
          fechaInicio: { $lte: new Date(fechaFin) },
          fechaFin: { $gte: new Date(fechaInicio) }
        }
      ]
    });

    const disponible = !conflicto && departamento.estado !== 'mantenimiento';

    res.json({
      success: true,
      data: {
        disponible,
        departamento: {
          id: departamento._id,
          numero: departamento.numero,
          tipo: departamento.tipo,
          estado: departamento.estado
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
};
