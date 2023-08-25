import { Router } from 'express';
import { uploadAvatar } from '../controllers/files';

const filesRouter = Router();

filesRouter.post('/avatar', uploadAvatar);

export default filesRouter;
