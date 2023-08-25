/**
 * Removes the specified keys from an object or array of objects. (Mutates)
 * @param data The data to be modified (array or object)
 * @param keys The keys to be removed
 */
export function exclude<T>(data: T, ...keys: string[]): Omit<T, string>;
export function exclude<T>(data: T[], ...keys: string[]): Omit<T, string>[];
export function exclude<T>(data: T | T[], ...keys: string[]): any {
  if (Array.isArray(data)) {
    data.forEach((item) => exclude(item, ...keys));
  } else {
    for (const key of keys) {
      delete data[key as keyof typeof data];
    }
  }
  if (Array.isArray(data)) return data;
  if (data instanceof Date) return data;
  return Object.fromEntries(
    Object.entries(data as any).map(([key, value]) => [
      key,
      value && typeof value === 'object'
        ? exclude(value as any, ...keys)
        : value,
    ]),
  );
}
