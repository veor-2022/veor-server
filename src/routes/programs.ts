import { Router } from 'express';
import {
  acceptProgram,
  fetchProgram,
  fetchPrograms,
  rejectProgram,
  createProgram,
  updateProgram,
  submitProgram,
  getUserPrograms,
} from '../controllers/programs';
import { requireAdmin, requireAuth } from '../middleware/guards';

const programRouter = Router();

programRouter.post('/', requireAuth('body', 'userId'), createProgram);
programRouter.put('/submit/:id', submitProgram);
programRouter.get('/', requireAdmin, fetchPrograms);
programRouter.get('/:id', fetchProgram);
programRouter.put('/accept/:id', requireAdmin, acceptProgram);
programRouter.put('/reject/:id', requireAdmin, rejectProgram);
programRouter.put('/:id', updateProgram);
programRouter.get('/user/:id', getUserPrograms);

export default programRouter;
