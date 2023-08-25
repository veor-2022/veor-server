import { Router } from 'express';
import {
  logIn,
  logInWithFirebaseToken,
  signUp,
  signUpWithFirebaseToken,
  checkIfUserExists,
} from '../controllers/auth';

const authRouter = Router();

authRouter.post('/signup', signUp);
authRouter.post('/login', logIn);
authRouter.post('/firebase/signup', signUpWithFirebaseToken);
authRouter.post('/firebase/login', logInWithFirebaseToken);
authRouter.post('/exist', checkIfUserExists);

export default authRouter;
