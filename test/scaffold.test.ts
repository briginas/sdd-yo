import assert from "node:assert/strict";
import test from "node:test";

const minimumNodeVersion = [22, 18, 0] as const;

function parseNodeVersion(version: string): readonly [number, number, number] {
  const parts = version.split(".", 3).map(Number);
  assert.equal(parts.length, 3, `expected a three-part Node.js version, received ${version}`);
  const [major, minor, patch] = parts;
  assert.ok(
    major !== undefined && minor !== undefined && patch !== undefined,
    `expected a complete Node.js version, received ${version}`,
  );
  return [major, minor, patch];
}

function isAtLeast(actual: readonly [number, number, number], minimum: readonly [number, number, number]): boolean {
  for (let index = 0; index < actual.length; index += 1) {
    const actualPart = actual[index];
    const minimumPart = minimum[index];
    if (actualPart === undefined || minimumPart === undefined) return false;
    if (actualPart !== minimumPart) return actualPart > minimumPart;
  }
  return true;
}

test("scaffold runs on the declared Node.js baseline", () => {
  assert.ok(
    isAtLeast(parseNodeVersion(process.versions.node), minimumNodeVersion),
    `Node.js ${minimumNodeVersion.join(".")} or newer is required`,
  );
});

test("scaffold source entry point loads its foundational library surface as ESM", async () => {
  const entryPoint = await import("../src/index.ts");
  assert.equal(entryPoint.JSON_SCHEMA_VERSION_V1, "1.0");
  assert.equal(typeof entryPoint.isProjectId, "function");
});
