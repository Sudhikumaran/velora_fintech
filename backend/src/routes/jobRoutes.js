import express from 'express';
import { runJobs, runDailySpend } from '../controllers/jobController.js';

const router = express.Router();
router.get('/run', runJobs);
router.post('/run', runJobs);
router.get('/daily-spend', runDailySpend);
router.post('/daily-spend', runDailySpend);
export default router;
