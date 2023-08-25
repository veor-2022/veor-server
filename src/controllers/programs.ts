import { Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import { prisma } from '..';
import { censor } from '../helpers/censor';
import { paginate } from '../helpers/paginate';

export const createProgram: RequestHandler = async (req, res) => {
  const { userId, answers, type } = req.body;
  if (!userId || !answers || !type) throw new Error('Missing required fields');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { programs: true },
  });
  if (!user) throw new Error('User not found');
  if (
    user.programs.find(
      (program) => program.type === type && program.status !== 'REJECTED',
    )
  )
    throw new Error('User already has a program of this type');
  if (
    user.programs.find(
      (program) => program.type === type && program.status === 'REJECTED',
    )
  ) {
    const program = await prisma.program.findFirst({
      where: { userId, type },
    });
    if (!program) throw new Error('Program not found');
    await prisma.program.update({
      where: { id: program.id },
      data: { answers, status: 'REVIEWING' },
    });
    res.json(program);
    return;
  } else {
    const program = await prisma.program.create({
      data: {
        answers,
        user: { connect: { id: userId } },
        type,
        status: 'REVIEWING',
      },
    });
    res.json(program);
  }
};

export const updateProgram: RequestHandler = async (req, res) => {
  const { id, answers } = req.body;
  const program = await prisma.program.findUniqueOrThrow({ where: { id } });
  if (req.user?.id !== program.userId && !req.isAdmin) {
    throw new Error('Unauthorized');
  }
  res.json(
    await prisma.program.update({
      where: { id },
      data: { answers },
    }),
  );
};

export const submitProgram: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const program = await prisma.program.findUniqueOrThrow({
    where: { id },
  });
  if (req.user?.id !== program.userId && !req.isAdmin) {
    throw new Error('Unauthorized');
  }
  res.json(
    await prisma.program.update({
      where: { id },
      data: { status: 'REVIEWING' },
    }),
  );
};

export const fetchProgram: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const program = await prisma.program.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!program || (req.user?.id !== program.userId && !req.isAdmin)) {
    throw new Error('Unauthorized');
  }
  res.json(censor(program));
};

export const fetchPrograms: RequestHandler = async (req, res) => {
  const searchQuery = req.stringQuery.searchQuery || '';
  const { status, type } = req.stringQuery;
  const data = await paginate(req.stringQuery, 'program', {
    where: {
      user: {
        OR: [
          {
            email: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            nickname: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        ],
      },
      status: status || { not: 'INCOMPLETE' },
      type: type || undefined,
    },
    include: {
      user: true,
    },
  } as Prisma.ProgramFindManyArgs);
  censor(data.data);
  res.json(data);
};

export const acceptProgram: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const program = await prisma.program.update({
    where: { id },
    data: { status: 'ACCEPTED' },
  });
  if (program.type === 'LISTENER') {
    await prisma.listenerProfile.create({
      data: {
        user: { connect: { id: program.userId } },
      },
    });
  }
  res.json(program);
};

export const rejectProgram: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const program = await prisma.program.update({
    where: { id },
    data: { status: 'REJECTED' },
  });
  res.json(program);
};

export const getUserPrograms: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const programs = await prisma.program.findMany({
    where: { userId: id },
  });
  res.json(programs);
};
