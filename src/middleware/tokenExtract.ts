import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../helpers/jwt';

export const userFromAuthHeader = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.get('Authorization')?.split(' ');
  if (authHeader && authHeader.length === 2) {
    switch (authHeader[0]) {
      case 'Bearer': {
        req.user = verifyToken(authHeader[1]);
        break;
      }
      case 'Basic': {
        req.adminPassword = authHeader[1];
        if (req.adminPassword === process.env.ADMIN_PASSWORD) {
          req.isAdmin = true;
        }
        break;
      }
    }
  }
  next();
};
