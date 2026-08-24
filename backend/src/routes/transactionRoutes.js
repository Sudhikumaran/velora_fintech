import express from 'express';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  archiveTransaction, getTransactionById, importTransactions, postRecurringDue,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/import', importTransactions);
router.post('/post-recurring', postRecurringDue);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.patch('/:id/archive', archiveTransaction);

export default router;
