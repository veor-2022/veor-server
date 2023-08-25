import { Router } from 'express';
import {
  createReview,
  getReviewByUserIdAndListenerId,
} from '../controllers/reviews';

const reviewRouter = Router();

reviewRouter.post('/', createReview);
reviewRouter.get('/user/listener', getReviewByUserIdAndListenerId);

export default reviewRouter;
