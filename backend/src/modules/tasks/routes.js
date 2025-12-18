import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { taskController } from './controllers/taskController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/tasks');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.use(authMiddleware);

router.get('/', taskController.getAll);
router.get('/board/:boardId', taskController.getByBoard);
router.get('/:id', taskController.getById);
router.post('/', taskController.create);
router.post('/upload', upload.single('file'), taskController.uploadFile);
router.post('/:id/comments', taskController.addComment);
router.put('/:id', taskController.update);
router.patch('/:id/move', taskController.move);
router.delete('/:id', taskController.delete);

export default router;

