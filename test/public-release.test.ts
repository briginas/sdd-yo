import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("REQ-ABFFEAF2 REQ-9CE36B68 REQ-0163273A permits only the exact protected trusted-publisher release", async () => {
  const workflow = await readFile(join(repositoryRoot, ".github/workflows/publish.yml"), "utf8");
  const ordinaryCi = await readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");

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
  assert.match(workflow, /PACKAGE_NAME: sdd-yo/u);
  assert.match(workflow, /PACKAGE_VERSION: 0\.5\.1/u);
  assert.match(workflow, /NPM_VERSION: 11\.16\.0/u);
  assert.match(workflow, /PREVIOUS_PUBLIC_VERSION: 0\.5\.0/u);
  assert.match(workflow, /EXPECTED_ARTIFACT_SHA256: 58d63d00103b06ef70539256bafd18b3faac5fb62dc4ba9d1bc52d9f0141dc8c/u);
  assert.match(
    workflow,
    /EXPECTED_INVENTORY_SHA256: db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d/u,
  );
  assert.match(workflow, /EXPECTED_INVENTORY_ENTRY_COUNT: "2138"/u);
  assert.match(workflow, /Require npm provenance support/u);
  assert.match(workflow, /npm install --global "npm@\$NPM_VERSION"/u);
  assert.match(workflow, /test "\$\(npm --version\)" = "\$NPM_VERSION"/u);
  assert.match(workflow, /major < 11 \|\| \(major === 11 && \(minor < 5 \|\| \(minor === 5 && patch < 1\)\)\)/u);
  assert.match(workflow, /test "\$GITHUB_REPOSITORY" = "briginas\/sdd-yo"/u);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/u);
  assert.match(workflow, /git rev-parse "\$RELEASE_TAG\^\{commit\}"/u);
  assert.match(workflow, /test "\$RELEASE_TAG" = "v\$\(node/u);
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
});
