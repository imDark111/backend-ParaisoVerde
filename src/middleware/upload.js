const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dt9ybqutn',
  api_key: process.env.CLOUDINARY_API_KEY || '184995567315769',
  api_secret: process.env.CLOUDINARY_API_SECRET || '5x0FSeq2sWQfReaWr1UaQ_LDzTM'
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'paraiso-verde';
    
    if (file.fieldname === 'fotoPerfil') {
      folder = 'paraiso-verde/avatars';
    } else if (file.fieldname === 'imagenes') {
      folder = 'paraiso-verde/departamentos';
    }
    
    return {
      folder: folder,
      allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    };
  }
});

// Filtro de archivos - solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
