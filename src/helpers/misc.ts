import { prisma } from '..';

export const convertTrueStringsInObjectToBoolean = (value: {
  [key: string]: string;
}) =>
  Object.fromEntries(
    Object.entries(value).map(([key, value]) => [key, value === 'true']),
  );

export const removeUndefinedValues = (value: { [key: string]: any }): any =>
  Object.fromEntries(
    Object.entries(value)
      .map(([key, value]) => [
        key,
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length
          ? removeUndefinedValues(value)
          : value,
      ])
      .filter(([_, value]) => value !== undefined),
  );

export const randomCode = () =>
  Math.random().toString(36).substring(2, 15).padStart(11, '0');

export const randomAuthCode = async () => {
  let code = randomCode();
  while (await prisma.authCode.findUnique({ where: { code } })) {
    code = randomCode();
  }
  return code;
};
