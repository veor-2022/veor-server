import { Router } from 'express';
import authRouter from './auth';
import chatRouter from './chats';
import checkInRouter from './checkIns';
import feedbackRouter from './feedbacks';
import groupsRouter from './groups';
import requestsRouter from './requests';
import reviewsRouter from './reviews';
import usersRouter from './users';
import programRouter from './programs';
import filesRouter from './files';

const baseRouter = Router();

baseRouter.get('/', (req, res) => {
  res.status(200).end();
});
baseRouter.get('/health', (req, res) => {
  res.send('Everything works fine.');
});

baseRouter.use('/auth', authRouter);
baseRouter.use('/users', usersRouter);
baseRouter.use('/groups', groupsRouter);
baseRouter.use('/checkIns', checkInRouter);
baseRouter.use('/reviews', reviewsRouter);
baseRouter.use('/chats', chatRouter);
baseRouter.use('/requests', requestsRouter);
baseRouter.use('/feedbacks', feedbackRouter);
baseRouter.use('/programs', programRouter);
baseRouter.use('/files', filesRouter);

export default baseRouter;
