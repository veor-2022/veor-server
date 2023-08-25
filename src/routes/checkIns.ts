import { Router } from 'express';
import {
  createCheckIn,
  getCheckInsByUser,
  deleteCheckIn,
} from '../controllers/checkIns';

const checkInRouter = Router();

checkInRouter.post('/', createCheckIn);
checkInRouter.get('/user/:id', getCheckInsByUser);
checkInRouter.delete('/:id', deleteCheckIn);

export default checkInRouter;
