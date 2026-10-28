import { normalizeSeed } from "../random";
import type { RunState } from "../types";

export const seededLine = (
  run: RunState,
  salt: number,
  lines: readonly string[],
): string => {
  let mixed = normalizeSeed(run.seed) ^ salt;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;
  return lines[mixed % lines.length]!;
};
