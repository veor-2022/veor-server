import { RequestHandler } from 'express';
import { prisma } from '..';

export const createCheckIn: RequestHandler = async (req, res) => {
  const { notes, tags, emotion, user } = req.body;
  const checkIn = await prisma.checkIn.create({
    data: {
      notes,
      tags: {
        set: tags,
      },
      emotion,
      user: {
        connect: {
          id: user,
        },
      },
    },
  });
  res.json(checkIn);
};

export const getCheckInsByUser: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const checkIns = await prisma.checkIn.findMany({
    where: {
      user: {
        id,
      },
    },
  });
  res.json(checkIns);
};

export const deleteCheckIn: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const checkIn = await prisma.checkIn.delete({
    where: {
      id,
    },
  });
  res.json(checkIn);
};
