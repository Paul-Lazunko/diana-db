export function round(value: number, precision: number): number {
  return Math.round(value / 10 ** (precision||0)) * 10 ** (precision || 0);
}

export function projectOutgoingValue(value: number, precision: number) {
  return parseFloat((value / 10 ** (precision || 0)).toFixed((precision || 0)));
}
export function projectIncomingValue(value: number, precision: number) {
  return Math.round(value * (10 ** (precision || 0)) );
}
