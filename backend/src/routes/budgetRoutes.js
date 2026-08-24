import express from 'express';
import { getBudgets, createBudget, updateBudget, deleteBudget, copyBudgetsToCurrentPeriod } from '../controllers/budgetController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getBudgets);
router.post('/', createBudget);
router.post('/copy-period', copyBudgetsToCurrentPeriod);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
