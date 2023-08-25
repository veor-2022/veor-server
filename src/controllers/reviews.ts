import { RequestHandler } from 'express';
import { prisma } from '..';

export const createReview: RequestHandler = async (req, res) => {
  const { rating, content, listener, user } = req.body;
  const review = await prisma.review.create({
    data: {
      rating,
      content,
      user: {
        connect: {
          id: user,
        },
      },
      listener: {
        connect: {
          id: listener,
        },
      },
    },
  });
  res.json(review);
};

export const getReviewByUserIdAndListenerId: RequestHandler = async (
  req,
  res
) => {
  const { userId, listenerId } = req.query;
  const review = await prisma.review.findFirst({
    where: {
      userId: userId as string,
      listenerId: listenerId as string,
    },
  });
  res.json(review);
};
