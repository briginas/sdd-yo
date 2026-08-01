import assert from "node:assert/strict";
import test from "node:test";

import { isObjectId } from "../src/contracts/identifiers.ts";
import { generateRandomId, generateRandomIds } from "../src/ids/generate-id.ts";
import type { Randomness } from "../src/platform/randomness.ts";

function sequenceRandomness(values: readonly (readonly number[])[]): Randomness {
  let index = 0;
  return {
    randomBytes: (length) => {
      assert.equal(length, 4);
      const value = values[index];
      if (value === undefined) throw new Error("Randomness sequence exhausted.");
      index += 1;
      return Uint8Array.from(value);
    },
  };
}

test("REQ-2C8E8085 generates uppercase eight-hex IDs for every supported prefix", () => {
  const kinds = [
    ["project", "SDD"],
    ["capability", "CAP"],
    ["requirement", "REQ"],
    ["concept", "CON"],
  ] as const;
  for (const [kind, prefix] of kinds) {
    const value = generateRandomId(kind, sequenceRandomness([[0x01, 0xab, 0xcd, 0xef]]));
    assert.equal(value, `${prefix}-01ABCDEF`);
  }
});

test("REQ-2C8E8085 retries batch collisions and fails closed when uniqueness cannot be produced", () => {
  const values = generateRandomIds(
    "requirement",
    2,
    sequenceRandomness([
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 2],
    ]),
  );
  assert.deepEqual(values, ["REQ-00000001", "REQ-00000002"]);

  const constant: Randomness = { randomBytes: () => Uint8Array.from([0, 0, 0, 1]) };
  assert.throws(() => generateRandomIds("requirement", 2, constant), /retry budget/u);
});

test("REQ-2C8E8085 retries candidates permanently reserved by canonical history", () => {
  const reservedValue: unknown = "CAP-00000001";
  assert.ok(isObjectId(reservedValue));
  const values = generateRandomIds(
    "capability",
    1,
    sequenceRandomness([
      [0, 0, 0, 1],
      [0, 0, 0, 2],
    ]),
    new Set([reservedValue]),
  );
  assert.deepEqual(values, ["CAP-00000002"]);
});

test("REQ-2C8E8085 rejects invalid batch sizes and malformed randomness output", () => {
  const randomness: Randomness = { randomBytes: () => Uint8Array.from([0, 0, 0, 1]) };
  for (const count of [0, 257, 1.5, Number.NaN]) {
    assert.throws(() => generateRandomIds("concept", count, randomness), RangeError);
  }
  assert.throws(
    () => generateRandomId("concept", { randomBytes: () => Uint8Array.from([0, 1, 2]) }),
    /invalid byte count/u,
  );
});
