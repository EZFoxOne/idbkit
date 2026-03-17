/**
 * Build IDBKeyRange from options object
 * @param {{ from?: any, to?: any, only?: any, inclusive?: [boolean, boolean] }} options
 * @returns {IDBKeyRange | undefined}
 */
export function buildKeyRange(options) {
  if (!options) return undefined;

  const { from, to, only, inclusive = [true, true] } = options;

  if (only !== undefined) {
    return IDBKeyRange.only(only);
  }
  if (from !== undefined && to !== undefined) {
    return IDBKeyRange.bound(from, to, inclusive[0], inclusive[1]);
  }
  if (from !== undefined) {
    return IDBKeyRange.lowerBound(from, inclusive[0]);
  }
  if (to !== undefined) {
    return IDBKeyRange.upperBound(to, inclusive[1]);
  }

  return undefined;
}
