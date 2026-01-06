import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { userController } from './controllers/userController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Asegurar que el directorio de avatares existe
const avatarsPath = path.join(__dirname, '../../../uploads/avatars');

// Función para asegurar que el directorio existe con permisos correctos
const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      console.log(`Directorio creado: ${dirPath}`);
    }
    // Verificar permisos de escritura
    fs.accessSync(dirPath, fs.constants.W_OK);
  } catch (error) {
    console.error(`Error al crear/verificar directorio ${dirPath}:`, error);
    throw error;
  }
};

// Crear directorio al cargar el módulo
try {
  ensureDirectoryExists(avatarsPath);
} catch (error) {
  console.error('Error crítico al inicializar directorio de avatares:', error);
}

// Configurar multer para subir avatares
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Asegurar que el directorio existe antes de guardar
      ensureDirectoryExists(avatarsPath);
      cb(null, avatarsPath);
    } catch (error) {
      console.error('Error al preparar directorio de destino:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.use(authMiddleware);

// Avatar endpoint must be before /:id route
router.get('/avatar/:filename', userController.getAvatar);

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.post('/:id/avatar', upload.single('avatar'), userController.uploadAvatar);
router.delete('/:id/avatar', userController.removeAvatar);
router.delete('/:id', userController.delete);

export default router;








