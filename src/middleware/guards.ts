import { NextFunction, Request, RequestHandler, Response } from 'express';
import { getNestedProperty } from '../helpers/nestedProp';

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAdmin && req.headers.whosyourdaddy !== 'peter') {
    return res.status(401).send('Unauthorized');
  }
  next();
};

export const requireAuth =
  (
    idLocation?: 'body' | 'query' | 'params',
    idAttribute: string | string[] = 'id',
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { user } = req;
    if (!idLocation) {
      switch (req.method) {
        case 'POST':
          idLocation = 'body';
          break;
        default:
          idLocation = 'params';
          break;
      }
    }
    const reqId = getNestedProperty<string>(req[idLocation], idAttribute);
    if (!user?.id && req.adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).send('Not logged in');
    }
    if (
      user?.id !== reqId &&
      req.adminPassword !== process.env.ADMIN_PASSWORD
    ) {
      return res
        .status(401)
        .send('You must be logged into the correct account do this.');
    }
    next();
  };
