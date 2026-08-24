import express from 'express';
import { runJobs } from '../controllers/jobController.js';

const router = express.Router();
router.get('/run', runJobs);
router.post('/run', runJobs);
export default router;
