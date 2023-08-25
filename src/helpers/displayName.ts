/**
 * Returns an object with the names of any user objects inside if they have nicknames
 * @param obj The object to hide names from
 * @returns any
 */
export const displayName = (obj: any): any => {
  if (Array.isArray(obj)) {
    if (obj.length === 0 || !obj[0] || typeof obj[0] !== 'object') return obj;
    return obj.map(displayName);
  }
  if (obj instanceof Date) return obj;
  if ('firstName' in obj) {
    if (obj.nickname) {
      delete obj.firstName;
      obj.displayName = obj.nickname;
    } else {
      obj.displayName = `${obj.firstName}`;
    }
    delete obj.lastName;
  }
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      value && typeof value === 'object' ? displayName(value) : value,
    ])
  );
};
