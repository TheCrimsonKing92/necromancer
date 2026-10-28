const UINT32_RANGE = 4_294_967_296;

export interface RandomResult {
  seed: number;
  value: number;
}

export const normalizeSeed = (seed: number): number => {
  const normalized = Math.trunc(seed) >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
};

export const nextRandom = (seed: number): RandomResult => {
  let next = normalizeSeed(seed);
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;

  return {
    seed: next,
    value: next / UINT32_RANGE,
  };
};

export const rollInteger = (
  seed: number,
  minimum: number,
  maximum: number,
): RandomResult => {
  const random = nextRandom(seed);
  const low = Math.ceil(Math.min(minimum, maximum));
  const high = Math.floor(Math.max(minimum, maximum));

  return {
    seed: random.seed,
    value: Math.floor(random.value * (high - low + 1)) + low,
  };
};
