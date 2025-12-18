import express from 'express';
import { boardController } from './controllers/boardController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', boardController.getAll);
router.get('/:id', boardController.getById);
router.post('/', boardController.create);
router.put('/:id', boardController.update);
router.delete('/:id', boardController.delete);

export default router;





