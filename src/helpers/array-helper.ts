type ComparableValue = {
  _c: number;
  item: any;
}

const mathCallbacksArgs: Record<'min' | 'max', any[]> = {
  max: [
    (m, value) => Math.max(m, value._c),
    -Infinity,
  ],
  min: [
    (m, value) => Math.min(m, value._c),
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
  const sets: Set<T>[] = arrays.filter((arr: T[]) => arr !== base).map((arr: T[]) => new Set<T>(arr));
  return Array.from(new Set(base)).filter((item: T) => sets.every((set: Set<T>) => set.has(item)));
}

export function arrayConcatenation<T>(...arrays: (T[] | any)[]): T[] {
  return Array.from(new Set(arrays.flat().filter((item: FlatArray<T, 1>) => item !== undefined)));
}

export function arrayExcluding<T>(base: T[], exclude: T[]): T[] {
  if (!Array.isArray(base) || !Array.isArray(exclude)) {
    return base;
  }
  if (!exclude.length) {
    return base;
  }
  const excluded: Set<T> = new Set<T>(exclude);
  return base.filter((item) => !excluded.has(item));
}

export function arrayEqualityCompare<T>(a: T[], b: T[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function findValueWithMode(items: any[], mode: 'min' | 'max') {
  if (!Array.isArray(items) || !items.length) {
    return;
  }
  const callbackArgs = mathCallbacksArgs[mode];
  const cItems =  items
    .map((item) => {
      let _c;
      switch (typeof item) {
        case 'bigint':
        case 'number':
          _c = item;
          break;
        case 'boolean':
          _c = item ? 1 : 0;
          break;
        case 'string':
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item)) {
            _c = new Date(item).getTime();
          }
          else {
            _c = item.length;
          }
          break;
        default:
          _c = mode === 'max' ? -Infinity : Infinity;
          break;
      }
      return { _c, item };
    })

  const searchValue = cItems.reduce(callbackArgs[0], callbackArgs[1]);

  return cItems.filter((cItem) => cItem._c === searchValue).map(cItem => cItem.item)
}
