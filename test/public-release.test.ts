import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("REQ-ABFFEAF2 REQ-9CE36B68 REQ-0163273A permits only the exact protected bootstrap publication", async () => {
  const workflow = await readFile(join(repositoryRoot, ".github/workflows/publish.yml"), "utf8");
  const ordinaryCi = await readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");

  assert.match(workflow, /^on:\n  release:\n    types: \[published\]$/mu);
  assert.doesNotMatch(workflow, /\b(?:push|pull_request|workflow_dispatch|workflow_call):/u);
  assert.match(workflow, /^    environment: release$/mu);
  assert.match(workflow, /^    runs-on: ubuntu-latest$/mu);
  assert.match(workflow, /^      contents: read\n      id-token: write$/mu);
  assert.match(workflow, /uses: actions\/checkout@v7/u);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/u);
  assert.match(workflow, /fetch-depth: 0/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /uses: actions\/setup-node@v7/u);
  assert.match(workflow, /node-version: 24/u);
  assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/u);
  assert.match(workflow, /package-manager-cache: false/u);
  assert.match(workflow, /PACKAGE_NAME: sdd-yo/u);
  assert.match(workflow, /PACKAGE_VERSION: 0\.3\.0/u);
  assert.match(workflow, /EXPECTED_ARTIFACT_SHA256: 65a7f9f95684085ad54af828e32e5cb64bad2a9f1f3e1ce7769841cf04d4fae8/u);
  assert.match(
    workflow,
    /EXPECTED_INVENTORY_SHA256: 6341e4d5024509bb54bcdb255b2458ebbff314ba9d6480c529dc46a02a1f2838/u,
  );
  assert.match(workflow, /EXPECTED_INVENTORY_ENTRY_COUNT: "2125"/u);
  assert.match(workflow, /Require npm provenance support/u);
  assert.match(workflow, /major < 11 \|\| \(major === 11 && minor < 5\)/u);
  assert.match(workflow, /test "\$GITHUB_REPOSITORY" = "briginas\/sdd-yo"/u);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/u);
  assert.match(workflow, /git rev-parse "\$RELEASE_TAG\^\{commit\}"/u);
  assert.match(workflow, /test "\$RELEASE_TAG" = "v\$\(node/u);
  assert.match(workflow, /Require the exact first-publication registry state/u);
  assert.match(workflow, /npm view "\$PACKAGE_NAME" version --json/u);
  assert.match(workflow, /npm view "\$PACKAGE_NAME@\$PACKAGE_VERSION" version --json/u);
  assert.match(workflow, /bootstrap publication is forbidden because \$PACKAGE_NAME already exists/u);
  assert.match(workflow, /npm pack --json --pack-destination "\$RUNNER_TEMP\/sdd-yo-release"/u);
  assert.match(workflow, /Verify reviewed artifact bytes and inventory/u);
  assert.match(workflow, /sha256sum "\$artifact"/u);
  assert.match(workflow, /tar -tzf "\$artifact" \| LC_ALL=C sort \| sha256sum/u);
  assert.match(workflow, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_BOOTSTRAP_TOKEN \}\}/u);
  assert.match(workflow, /test -n "\$NODE_AUTH_TOKEN"/u);
  assert.match(
    workflow,
    /npm publish "\$RUNNER_TEMP\/sdd-yo-release\/\$PACKAGE_NAME-\$PACKAGE_VERSION\.tgz" --access public --provenance/u,
  );
  assert.doesNotMatch(workflow, /NPM_TOKEN/u);
  assert.equal((workflow.match(/NODE_AUTH_TOKEN/g) ?? []).length, 2);
  assert.equal((workflow.match(/secrets\.NPM_BOOTSTRAP_TOKEN/g) ?? []).length, 1);

  assert.doesNotMatch(ordinaryCi, /id-token: write|npm publish/u);
});
