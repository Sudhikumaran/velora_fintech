import express from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, updatePrice, getPriceHistory, refreshPrices } from '../controllers/investmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getInvestments);
router.post('/', createInvestment);
router.post('/refresh-prices', refreshPrices);
router.put('/:id', updateInvestment);
router.delete('/:id', deleteInvestment);
router.patch('/:id/price', updatePrice);
router.get('/:id/price-history', getPriceHistory);

export default router;
