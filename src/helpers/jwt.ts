import { sign, verify } from 'jsonwebtoken';
import { UserAuthHeader } from '../types';

export const signUser = (user: UserAuthHeader): string =>
  sign(user, process.env.JWT_SECRET as string);

export const verifyToken = (token: string): UserAuthHeader => {
  return verify(token, process.env.JWT_SECRET as string) as UserAuthHeader;
};
