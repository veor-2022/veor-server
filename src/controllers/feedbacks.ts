import { Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { censor } from '../helpers/censor';
import { paginate } from '../helpers/paginate';

export const addFeedback: RequestHandler = async (req, res) => {
  if (!req.user) throw new Error('Unauthorized');
  const { content } = req.body;
  const result = await prisma.feedback.create({
    data: {
      content: content,
      senderId: req.user?.id as string,
    },
  });
  return res.json(result);
};

export const fetchFeedback: RequestHandler = async (req, res) => {
  const searchQuery = req.stringQuery.searchQuery || '';
  const { user, resolved } = req.stringQuery;
  const data = await paginate(req.stringQuery, 'feedback', {
    where: {
      senderId: user || undefined,
      content: {
        contains: searchQuery || '',
      },
      resolved: resolved ? resolved === 'true' : undefined,
    },
    include: {
      sender: true,
    },
  } as Prisma.FeedbackFindManyArgs);
  censor(data.data);
  res.json(data);
};

export const getFeedbackById: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const result = await prisma.feedback.findUnique({
    where: {
      id,
    },
    include: {
      sender: true,
    },
  });
  res.json(censor(result));
};

export const deleteFeedback: RequestHandler = async (req, res) => {
  const { id } = req.params;
  await prisma.feedback.delete({
    where: {
      id: id,
    },
  });
  res.send('Success');
};

export const updateFeedback: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { resolved } = req.body;
  const result = await prisma.feedback.update({
    where: {
      id,
    },
    data: {
      resolved,
    },
  });
  res.json(result);
};
