import express from 'express';
import { getDebts, createDebt, updateDebt, deleteDebt, addRepayment } from '../controllers/debtController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getDebts);
router.post('/', createDebt);
router.put('/:id', updateDebt);
router.delete('/:id', deleteDebt);
router.post('/:id/repayments', addRepayment);

export default router;
