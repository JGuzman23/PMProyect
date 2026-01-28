import express from 'express';
import { productController } from './controllers/productController.js';
import { supplierController } from './controllers/supplierController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Supplier routes (must be before product routes with :id parameter)
router.get('/suppliers', supplierController.getAll);
router.get('/suppliers/:id', supplierController.getById);
router.post('/suppliers', supplierController.create);
router.put('/suppliers/:id', supplierController.update);
router.delete('/suppliers/:id', supplierController.delete);

// Product routes
router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);
router.patch('/:id/stock', productController.updateStock);

export default router;
