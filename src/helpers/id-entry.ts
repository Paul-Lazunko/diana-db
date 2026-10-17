/**
 * Index entry for one value: the ids holding it.
 * Most values in unique-ish fields belong to a single document, so a lone id is stored as a plain
 * string and promoted to a Set only when a second id arrives. This keeps O(1) add/remove without
 * paying for a Set per document.
 */
export type IdEntry = string | Set<string>;

export function addId<K>(index: Map<K, IdEntry>, key: K, id: string): void {
  const entry: IdEntry = index.get(key);
  if (entry === undefined) {
    index.set(key, id);
  } else if (typeof entry === 'string') {
    if (entry !== id) {
      index.set(
        key,
        new Set<string>([
          entry,
          id,
        ]),
      );
    }
  } else {
    entry.add(id);
  }
}

/** Returns false when the id wasn't indexed under this key. */
export function deleteId<K>(index: Map<K, IdEntry>, key: K, id: string): boolean {
  const entry: IdEntry = index.get(key);
  if (entry === undefined) {
    return false;
  }
  if (typeof entry === 'string') {
    if (entry !== id) {
      return false;
    }
    index.delete(key);
    return true;
  }
  if (!entry.delete(id)) {
    return false;
  }
  if (entry.size === 1) {
    index.set(key, entry.values().next().value);
  } else if (!entry.size) {
    index.delete(key);
  }
  return true;
}

export function idsOf(entry: IdEntry | undefined): string[] {
  if (entry === undefined) {
    return [];
  }
  return typeof entry === 'string' ? [entry] : Array.from(entry);
}

export function forEachId(entry: IdEntry | undefined, fn: (id: string) => void): void {
  if (entry === undefined) {
    return;
  }
  if (typeof entry === 'string') {
    fn(entry);
  } else {
    entry.forEach(fn);
  }
}

/** Restores an entry from the dump format (array of ids, or an object with numeric keys). */
export function entryFromStored(stored: any): IdEntry | undefined {
  const ids: string[] = Array.isArray(stored)
    ? stored
    : stored && typeof stored === 'object'
      ? Object.values(stored)
      : stored
        ? [stored]
        : [];
  if (!ids.length) {
    return undefined;
  }
  return ids.length === 1 ? ids[0] : new Set<string>(ids);
}
