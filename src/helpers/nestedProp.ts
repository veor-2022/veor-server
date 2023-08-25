/**
 * Gets a nested property from an object and string of keys
 * @param obj The object to recuse properties through
 * @param properties The properties to recurse through (array of keys or single key for non-nested properties)
 * @param error Error to throw if property is not found
 * @returns The value of the nested property or undefined if any key not found
 */
export function getNestedProperty<T = any>(
  obj: any,
  properties: string | string[],
  error: true,
): T;
export function getNestedProperty<T = any>(
  obj: any,
  properties: string | string[],
  error?: false,
): T | undefined;
export function getNestedProperty<T = any>(
  obj: any,
  properties: string | string[],
  error: boolean | undefined,
): T | undefined {
  let result = obj;
  if (typeof properties === 'string') properties = [properties];
  if (typeof result !== 'object') {
    if (error) throw new Error(`Property not found`);
    else return undefined;
  }
  for (let i = 0; i < properties.length; i++) {
    const key = properties[i];
    result = result[key];
    if (
      (typeof result !== 'object' && i !== properties.length - 1) ||
      result === undefined
    ) {
      if (error) throw new Error(`Property not found`);
      else return undefined;
    }
  }
  return result;
}
