import express from 'express';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, toggleStatus } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getSubscriptions);
router.post('/', createSubscription);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);
router.patch('/:id/toggle', toggleStatus);

export default router;
