import express from 'express';
import { userController } from '../users/controllers/userController.js';
import { teamChartController } from './controllers/teamChartController.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Team chart settings routes (must be before routes with :id parameter)
router.get('/charts/settings', teamChartController.getSettings);
router.post('/charts/positions', teamChartController.savePositions);
router.post('/charts/connections', teamChartController.saveConnections);

// Teams module uses the same user routes but with team-specific logic
router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

export default router;








