export function round(value: number, precision: number): number {
  return Math.round(value / 10 ** (precision || 0)) * 10 ** (precision || 0);
}

// Without an explicit precision, numbers are stored and returned unchanged.
export function projectOutgoingValue(value: number, precision: number) {
  if (precision === undefined || precision === null) {
    return value;
  }
  return parseFloat((value / 10 ** precision).toFixed(precision));
}
export function projectIncomingValue(value: number, precision: number) {
  if (precision === undefined || precision === null) {
    return value;
  }
  return Math.round(value * 10 ** precision);
}
