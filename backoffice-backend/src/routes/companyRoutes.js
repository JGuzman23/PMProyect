import express from 'express';
import { companyController } from '../controllers/companyController.js';

const router = express.Router();

router.get('/stats', companyController.getStats);
router.get('/', companyController.getAll);
router.get('/:id', companyController.getById);
router.post('/', companyController.create);
router.put('/:id', companyController.update);
router.patch('/:id/toggle-active', companyController.toggleActive);
router.delete('/:id', companyController.delete);

export default router;









