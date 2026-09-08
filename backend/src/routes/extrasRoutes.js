import express from 'express';
import { protect } from '../middleware/auth.js';
import { requirePremium } from '../middleware/requirePremium.js';
import {
  getInsights, spendCheck, whatIf, caExport,
  saveMerchantRules, joinAaWaitlist,
  createHousehold, joinHousehold, getHousehold, leaveHousehold,
} from '../controllers/extrasController.js';
import { getPlan, startTrial, joinPremiumWaitlist } from '../controllers/billingController.js';

const router = express.Router();
router.use(protect);

router.get('/plan', getPlan);
router.post('/plan/trial', startTrial);
router.post('/plan/waitlist', joinPremiumWaitlist);

router.get('/insights', requirePremium, getInsights);
router.get('/spend-check', requirePremium, spendCheck);
router.get('/what-if', requirePremium, whatIf);
router.get('/ca-export', requirePremium, caExport);
router.put('/merchant-rules', saveMerchantRules);
router.post('/aa-waitlist', joinAaWaitlist);
router.get('/household', getHousehold);
router.post('/household', requirePremium, createHousehold);
router.post('/household/join', requirePremium, joinHousehold);
router.post('/household/leave', leaveHousehold);

export default router;
