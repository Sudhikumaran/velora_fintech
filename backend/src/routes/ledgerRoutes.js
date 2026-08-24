import express from 'express';
import { getLedger } from '../controllers/ledgerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getLedger);

export default router;
