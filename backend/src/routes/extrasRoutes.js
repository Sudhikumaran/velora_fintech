import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getInsights, spendCheck, whatIf, caExport,
  saveMerchantRules, joinAaWaitlist,
  createHousehold, joinHousehold, getHousehold, leaveHousehold,
} from '../controllers/extrasController.js';

const router = express.Router();
router.use(protect);

router.get('/insights', getInsights);
router.get('/spend-check', spendCheck);
router.get('/what-if', whatIf);
router.get('/ca-export', caExport);
router.put('/merchant-rules', saveMerchantRules);
router.post('/aa-waitlist', joinAaWaitlist);
router.get('/household', getHousehold);
router.post('/household', createHousehold);
router.post('/household/join', joinHousehold);
router.post('/household/leave', leaveHousehold);

export default router;
