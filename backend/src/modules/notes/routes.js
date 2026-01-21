import express from 'express';
import { noteController } from './controllers/noteController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', noteController.getAll);
router.get('/:id', noteController.getById);
router.post('/', noteController.create);
router.put('/:id', noteController.update);
router.delete('/:id', noteController.delete);

export default router;
