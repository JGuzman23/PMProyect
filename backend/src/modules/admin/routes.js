import express from 'express';
import { adminController } from './controllers/adminController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Labels routes
router.get('/labels', adminController.getAllLabels);
router.get('/labels/:id', adminController.getLabelById);
router.post('/labels', adminController.createLabel);
router.put('/labels/:id', adminController.updateLabel);
router.delete('/labels/:id', adminController.deleteLabel);

// Board Statuses routes
router.get('/statuses', adminController.getAllStatuses);
router.get('/statuses/:id', adminController.getStatusById);
router.post('/statuses', adminController.createStatus);
router.put('/statuses/order', adminController.updateStatusOrder);
router.put('/statuses/:id', adminController.updateStatus);
router.delete('/statuses/:id', adminController.deleteStatus);

export default router;









