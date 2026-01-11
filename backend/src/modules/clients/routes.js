import express from 'express';
import { clientController } from './controllers/clientController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', clientController.getAll);
router.get('/:id', clientController.getById);
router.post('/', clientController.create);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.delete);

export default router;









