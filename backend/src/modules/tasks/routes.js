import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { taskController } from './controllers/taskController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configurar multer para subir archivos
// Use absolute path for uploads directory (works in Docker with volumes)
let uploadsBasePath;
if (fs.existsSync('/app/uploads')) {
  uploadsBasePath = '/app/uploads';
} else {
  uploadsBasePath = path.join(__dirname, '../../../uploads');
}
const tasksPath = path.join(uploadsBasePath, 'tasks');

// Asegurar que el directorio existe
const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
    }
  } catch (error) {
    console.error(`Error al crear directorio ${dirPath}:`, error);
  }
};
ensureDirectoryExists(tasksPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectoryExists(tasksPath);
    cb(null, tasksPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 512 * 1024 * 1024 // 512MB
  }
});

// Attachment endpoint must be before authMiddleware (public access)
router.get('/attachment/:filename', taskController.getAttachment);

router.use(authMiddleware);

router.get('/', taskController.getAll);
router.get('/board/:boardId', taskController.getByBoard);
router.get('/:id', taskController.getById);
router.post('/', taskController.create);
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: 'File too large', 
            message: 'El archivo excede el tamaño máximo permitido de 512 MB' 
          });
        }
        return res.status(400).json({ 
          error: 'Upload error', 
          message: err.message 
        });
      }
      return res.status(400).json({ 
        error: 'Upload error', 
        message: err.message 
      });
    }
    next();
  });
}, taskController.uploadFile);
router.post('/:id/comments', taskController.addComment);
router.put('/:id', taskController.update);
router.patch('/:id/move', taskController.move);
router.delete('/:id', taskController.delete);

export default router;

