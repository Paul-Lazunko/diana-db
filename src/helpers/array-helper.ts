const mathCallbacksArgs: Record<'min' | 'max', any[]> = {
  max: [
    (m: number, value: number) => Math.max(m, value),
    -Infinity,
  ],
  min: [
    (m: number, value: number) => Math.min(m, value),
    Infinity,
  ],
};

export function arrayIntersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) {
    return [];
  }
  if (arrays.length === 1) {
    return arrays[0];
  }
  const base: T[] = arrays.reduce(
    (shortest: T[], current: T[]): T[] => (current.length < shortest.length ? current : shortest),
    arrays[0],
  );
  return Array.from(new Set(base)).filter((item: T) => arrays.every((arr: T[]) => arr.includes(item)));
}

export function arrayConcatenation<T>(...arrays: (T[] | any)[]): T[] {
  return Array.from(new Set(arrays.flat().filter((item: FlatArray<T, 1>) => item !== undefined)));
}

export function arrayExcluding<T>(base: T[], exclude: T[]): T[] {
  if (!Array.isArray(base) || !Array.isArray(exclude)) {
    return base;
  }
  return base.filter((item) => !exclude.includes(item));
}

export function arrayEqualityCompare<T>(a: T[], b: T[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function findValueWithMode(items: any[], mode: 'min' | 'max'): number | undefined {
  if (!Array.isArray(items) || !items.length) {
    return;
  }
  const callbackArgs = mathCallbacksArgs[mode];
  return items
    .map((item: any) => {
      switch (typeof item) {
        case 'bigint':
        case 'number':
          return item as number;
        case 'boolean':
          return item ? 1 : 0;
        case 'string':
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item)) {
            return new Date(item).getTime();
          } else {
            return item.length;
          }
        default:
          break;
      }
    })
    .filter((value: number) => typeof value === 'number' && !Number.isNaN(value))
    .reduce(callbackArgs[0], callbackArgs[1]);
}
