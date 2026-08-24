import express from 'express';
import {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  addEntry, updateEntry, toggleEntryDone, deleteEntry, postEntry,
} from '../controllers/incomePlanController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getPlans);
router.post('/', createPlan);
router.get('/:id', getPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);
router.post('/:id/entries', addEntry);
router.put('/:id/entries/:entryId', updateEntry);
router.patch('/:id/entries/:entryId/done', toggleEntryDone);
router.post('/:id/entries/:entryId/post', postEntry);
router.delete('/:id/entries/:entryId', deleteEntry);

export default router;
