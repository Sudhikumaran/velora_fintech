import express from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal, addContribution } from '../controllers/goalController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/contributions', addContribution);

export default router;
