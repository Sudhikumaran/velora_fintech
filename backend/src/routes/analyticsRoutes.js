import express from 'express';
import {
  getDashboardSummary,
  getSpendingByCategory,
  getMonthlyTrend,
  getCashFlow,
  getIncomeVsExpense,
  getNetWorth,
  getMonthlyBudgetAnalysis,
  getBudgetAnalysis,
  exportData,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboardSummary);
router.get('/budget-monthly', getMonthlyBudgetAnalysis);
router.get('/budget-analysis', getBudgetAnalysis);
router.get('/spending-by-category', getSpendingByCategory);
router.get('/monthly-trend', getMonthlyTrend);
router.get('/cash-flow', getCashFlow);
router.get('/income-vs-expense', getIncomeVsExpense);
router.get('/net-worth', getNetWorth);
router.get('/export', exportData);

export default router;
