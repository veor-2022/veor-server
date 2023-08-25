export interface UserAuthHeader {
  id: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserAuthHeader;
    adminPassword?: string;
    isAdmin?: true;
    // query where only string values are present (the rest are removed)
    stringQuery: { [key: string]: string };
  }
}
