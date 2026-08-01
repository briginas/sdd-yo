import { randomBytes } from "node:crypto";

import type { Randomness } from "./randomness.ts";

export const nodeRandomness: Randomness = {
  randomBytes: (length) => randomBytes(length),
};
