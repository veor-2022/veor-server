import express, { NextFunction, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { config as initEnv } from 'dotenv';
import cors from 'cors';
import { Prisma, PrismaClient } from '@prisma/client';
import 'express-async-errors';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import baseRouter from './routes';
import { userFromAuthHeader } from './middleware/tokenExtract';
import { stringQuery } from './middleware/stringQuery';
import { Expo } from 'expo-server-sdk';
const serviceAccount = require('../firebase-adminsdk.json');

initEnv();
initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const app = express();
export const prisma = new PrismaClient();
const server = createServer(app);
export const io = new Server(server);
export const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
export const firestore = getFirestore();

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(
  express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 })
);
app.use(cookieParser());
app.use(userFromAuthHeader);
app.use(stringQuery);
app.use(cors());
app.use(baseRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2014') {
      return res
        .status(400)
        .send(
          'Sorry, you cannot delete this as there are things connected to it. If you want to, you will need to delete the connected things first.'
        );
    }
  }
  console.error(err.stack);
  return res.status(400).send(err.message);
});

server.listen(process.env.PORT || 3005, () =>
  console.log(
    `🚀 Server ready at: http://localhost:${process.env.PORT || 3005}`
  )
);
