import express from 'express';
import { getAccounts, createAccount, updateAccount, deleteAccount, archiveAccount, getAccountById } from '../controllers/accountController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getAccounts);
router.post('/', createAccount);
router.get('/:id', getAccountById);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.patch('/:id/archive', archiveAccount);

export default router;
