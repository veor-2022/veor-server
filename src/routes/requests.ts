import { Router } from 'express';
import {
  acceptRequest,
  createSupportRequest,
  emailSupportInvite,
  rejectRequest,
  checkRequestStatus,
} from '../controllers/requests';
import { requireAuth } from '../middleware/guards';

const requestsRouter = Router();

requestsRouter.post('/invite', emailSupportInvite);
requestsRouter.post('/support', createSupportRequest);
requestsRouter.post('/:id', acceptRequest);
requestsRouter.delete('/:id', rejectRequest);
requestsRouter.get('/status', checkRequestStatus);

export default requestsRouter;
