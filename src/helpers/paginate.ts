// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { PrismaClient } from '@prisma/client';
import { PAGE_SIZE } from '../constants';
import { prisma } from '..';
import { removeUndefinedValues } from './misc';

/** If you want type checking on the query params, do `as Prisma.xxxFindManyArgs` */
export const paginate = async <T = any>(
  { page = '1', pageSize = PAGE_SIZE.toString() }: { [k: string]: string },
  model: keyof Omit<
    PrismaClient,
    | '$connect'
    | '$disconnect'
    | '$executeRaw'
    | '$executeRawUnsafe'
    | '$on'
    | '$queryRaw'
    | '$queryRawUnsafe'
    | '$transaction'
    | '$use'
  >,
  queryData: any,
): Promise<{ data: T[]; total: number; totalPages: number }> => {
  const [data, total] = await prisma.$transaction([
    (prisma[model].findMany as any)({
      ...removeUndefinedValues(queryData),
      skip: (+page - 1) * +pageSize,
      take: +pageSize,
    }),
    (prisma[model].count as any)({ where: queryData.where }),
  ]);
  return {
    data,
    total,
    totalPages: Math.ceil(total / +pageSize),
  };
};
