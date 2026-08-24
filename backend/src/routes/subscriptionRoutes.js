import express from 'express';
import {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  toggleStatus, postDueSubscriptions, postSubscription,
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getSubscriptions);
router.post('/', createSubscription);
router.post('/post-due', postDueSubscriptions);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);
router.patch('/:id/toggle', toggleStatus);
router.post('/:id/post', postSubscription);

export default router;
