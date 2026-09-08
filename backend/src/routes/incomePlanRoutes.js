import express from 'express';
import {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  addEntry, updateEntry, toggleEntryDone, deleteEntry, postEntry,
} from '../controllers/incomePlanController.js';
import { protect } from '../middleware/auth.js';
import { requirePremium } from '../middleware/requirePremium.js';

const router = express.Router();

router.use(protect);
router.get('/', getPlans);
router.post('/', requirePremium, createPlan);
router.get('/:id', getPlan);
router.put('/:id', requirePremium, updatePlan);
router.delete('/:id', requirePremium, deletePlan);
router.post('/:id/entries', requirePremium, addEntry);
router.put('/:id/entries/:entryId', requirePremium, updateEntry);
router.patch('/:id/entries/:entryId/done', requirePremium, toggleEntryDone);
router.post('/:id/entries/:entryId/post', requirePremium, postEntry);
router.delete('/:id/entries/:entryId', requirePremium, deleteEntry);

export default router;
