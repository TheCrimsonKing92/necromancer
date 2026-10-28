class ImmutableMapView<K, V> implements ReadonlyMap<K, V> {
  readonly #values: Map<K, V>;

  constructor(entries: Iterable<readonly [K, V]>) {
    this.#values = new Map(entries);
    Object.freeze(this);
  }

  get size(): number {
    return this.#values.size;
  }

  get(key: K): V | undefined {
    return this.#values.get(key);
  }

  has(key: K): boolean {
    return this.#values.has(key);
  }

  entries(): MapIterator<[K, V]> {
    return this.#values.entries();
  }

  keys(): MapIterator<K> {
    return this.#values.keys();
  }

  values(): MapIterator<V> {
    return this.#values.values();
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.#values.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
}

export const immutableMap = <K, V>(
  entries: Iterable<readonly [K, V]>,
): ReadonlyMap<K, V> => new ImmutableMapView(entries);

export const cloneAndFreeze = <T>(value: T): T => {
  const clones = new WeakMap<object, object>();

  const clone = (current: unknown): unknown => {
    if (
      current === null ||
      (typeof current !== "object" && typeof current !== "function")
    ) {
      return current;
    }
    if (typeof current === "function") return current;

    const prior = clones.get(current);
    if (prior) return prior;

    if (Array.isArray(current)) {
      const result: unknown[] = [];
      clones.set(current, result);
      result.push(...current.map(clone));
      return Object.freeze(result);
    }

    const result = Object.create(Object.getPrototypeOf(current)) as Record<
      PropertyKey,
      unknown
    >;
    clones.set(current, result);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor) continue;
      if ("value" in descriptor) descriptor.value = clone(descriptor.value);
      Object.defineProperty(result, key, descriptor);
    }
    return Object.freeze(result);
  };

  return clone(value) as T;
};
