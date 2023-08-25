import { NextFunction, Request, Response } from 'express';

export const stringQuery = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  req.stringQuery = Object.fromEntries(
    Object.entries(req.query).filter(
      ([, value]) => typeof value === 'string',
    ) as [string, string][],
  );
  next();
};
