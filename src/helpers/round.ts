export function round(value: number, precision: number): number {
  return Math.round(value / 10 ** precision) * 10 ** precision;
}

export function projectOutgoingValue(value: number, precision: number) {
  return parseFloat((value / 10 ** precision).toFixed(precision));
}
export function projectIncomingValue(value: number, precision: number) {
  return Math.round(value * 10 ** precision);
}
