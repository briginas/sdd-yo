import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { currentPackageIdentity } from "./current-package-identity.ts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("REQ-B0B35D6D REQ-ABFFEAF2 REQ-9CE36B68 REQ-0163273A derives identity and permits only the exact protected trusted-publisher release", async () => {
  const workflow = await readFile(join(repositoryRoot, ".github/workflows/publish.yml"), "utf8");
  const ordinaryCi = await readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");
  const runbook = await readFile(join(repositoryRoot, "docs/release-runbook.md"), "utf8");

  assert.match(workflow, /^on:\n  release:\n    types: \[published\]$/mu);
  assert.doesNotMatch(workflow, /\b(?:push|pull_request|workflow_dispatch|workflow_call):/u);
  assert.match(workflow, /^    environment: release$/mu);
  assert.match(workflow, /^    runs-on: macos-latest$/mu);
  assert.match(workflow, /^      contents: read\n      id-token: write$/mu);
  assert.match(workflow, /uses: actions\/checkout@v7/u);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/u);
  assert.match(workflow, /fetch-depth: 0/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /Restore the integration reference at the release subject/u);
  assert.match(workflow, /git update-ref refs\/heads\/main "\$RELEASE_SHA"/u);
  assert.match(workflow, /git rev-parse "main\^\{commit\}"/u);
  assert.match(workflow, /uses: actions\/setup-node@v7/u);
  assert.match(workflow, /node-version: 24/u);
  assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/u);
  assert.match(workflow, /package-manager-cache: false/u);
  assert.doesNotMatch(workflow, /^\s+PACKAGE_(?:NAME|VERSION):/mu);
  assert.match(workflow, /Derive package identity from the immutable source manifest/u);
  assert.match(workflow, /import manifest from "\.\/package\.json" with \{ type: "json" \}/u);
  assert.match(workflow, /printf 'PACKAGE_NAME=%s\\nPACKAGE_VERSION=%s\\n'.*>> "\$GITHUB_ENV"/u);
  assert.doesNotMatch(
    workflow,
    new RegExp(`PACKAGE_VERSION: ${currentPackageIdentity.version.replaceAll(".", "\\.")}`, "u"),
  );
  assert.match(workflow, /NPM_VERSION: 11\.16\.0/u);
  assert.match(workflow, /PREVIOUS_PUBLIC_VERSION: 0\.5\.3/u);
  assert.match(workflow, /EXPECTED_ARTIFACT_SHA256: 12c9e2805189c383c43021c6e39f0fab97b551c1fc1a3c37773644aeef127167/u);
  assert.match(
    workflow,
    /EXPECTED_INVENTORY_SHA256: fb8bd8867afbcab6492ff2a94a5f6b25780d738d1b1b8db56c2e565bb8e740f1/u,
  );
  assert.match(workflow, /EXPECTED_INVENTORY_ENTRY_COUNT: "2170"/u);
  assert.match(workflow, /Require npm provenance support/u);
  assert.match(workflow, /npm install --global "npm@\$NPM_VERSION"/u);
  assert.match(workflow, /test "\$\(npm --version\)" = "\$NPM_VERSION"/u);
  assert.match(workflow, /major < 11 \|\| \(major === 11 && \(minor < 5 \|\| \(minor === 5 && patch < 1\)\)\)/u);
  assert.match(workflow, /test "\$GITHUB_REPOSITORY" = "briginas\/sdd-yo"/u);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/u);
  assert.match(workflow, /git rev-parse "\$RELEASE_TAG\^\{commit\}"/u);
  assert.match(workflow, /test "\$RELEASE_TAG" = "v\$\(node/u);
  assert.match(workflow, /test "\$package_name" = "sdd-yo"/u);
  assert.match(workflow, /Require the exact existing-package registry state/u);
  assert.match(workflow, /npm view "\$PACKAGE_NAME" version --json/u);
  assert.match(workflow, /npm view "\$PACKAGE_NAME@\$PACKAGE_VERSION" version --json/u);
  assert.match(workflow, /PREVIOUS_PUBLIC_VERSION/u);
  assert.match(workflow, /publication is forbidden because \$PACKAGE_NAME@\$PACKAGE_VERSION already exists/u);
  assert.match(workflow, /npm pack --json --pack-destination "\$RUNNER_TEMP\/sdd-yo-release"/u);
  assert.match(workflow, /Verify reviewed artifact bytes and inventory/u);
  assert.match(workflow, /shasum -a 256 "\$artifact"/u);
  assert.match(workflow, /tar -tzf "\$artifact" \| LC_ALL=C sort \| shasum -a 256/u);
  assert.match(workflow, /Publish through the configured npm trusted publisher/u);
  assert.match(
    workflow,
    /npm publish "\$RUNNER_TEMP\/sdd-yo-release\/\$PACKAGE_NAME-\$PACKAGE_VERSION\.tgz" --access public --provenance/u,
  );
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN|secrets\./u);

  assert.doesNotMatch(ordinaryCi, /id-token: write|npm publish/u);

  assert.match(runbook, /named integration branch, normally `main`, as already\s+selected/u);
  assert.match(runbook, /resolve and recheck its exact current commit/u);
  assert.match(runbook, /bounded current local and remote-tracking ref tips/u);
  assert.match(runbook, /bounded named release may authorize the Git mutations it explicitly lists/u);
  assert.match(runbook, /Inspect, plan, prepare, test, or review requests do not/u);
  assert.match(runbook, /Read-only ref\s+discovery never broadens/u);
});
