import { Router } from 'express';
import {
  addFeedback,
  deleteFeedback,
  fetchFeedback,
  getFeedbackById,
  updateFeedback,
} from '../controllers/feedbacks';
import { requireAdmin } from '../middleware/guards';

const feedbackRouter = Router();

feedbackRouter.post('/', addFeedback);
feedbackRouter.get('/', requireAdmin, fetchFeedback);
feedbackRouter.delete('/:id', requireAdmin, deleteFeedback);
feedbackRouter.get('/:id', requireAdmin, getFeedbackById);
feedbackRouter.put('/:id', requireAdmin, updateFeedback);

export default feedbackRouter;
