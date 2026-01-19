export function convertToNumeric(input: any): any {
  if (typeof input !== 'string') {
    return input;
  }
  const value = input.trim();
  if (value === '') {
    return input;
  }
  try {
    if (/^[+-]?\d+$/.test(value)) {
      const big = BigInt(value);
      if (big <= BigInt(Number.MAX_SAFE_INTEGER) && big >= BigInt(Number.MIN_SAFE_INTEGER)) {
        return Number(big);
      }
      return big;
    }
    if (/^[+-]?(\d+\.\d*|\d*\.\d+|\d+)([eE][+-]?\d+)?$/.test(value)) {
      const num = Number(value);
      if (!Number.isNaN(num) && Number.isFinite(num)) {
        return num;
      }
    }
  } catch {
    return input;
  }
  return input;
}
