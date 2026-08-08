import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("REQ-ABFFEAF2 REQ-0163273A publishes only an exact protected release through trusted OIDC", async () => {
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
  assert.match(workflow, /test "\$GITHUB_REPOSITORY" = "briginas\/sdd-yo"/u);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/u);
  assert.match(workflow, /git rev-parse "\$RELEASE_TAG\^\{commit\}"/u);
  assert.match(workflow, /test "\$RELEASE_TAG" = "v\$\(node/u);
  assert.match(workflow, /npm pack --json --pack-destination "\$RUNNER_TEMP\/sdd-yo-release"/u);
  assert.match(
    workflow,
    /npm publish "\$RUNNER_TEMP\/sdd-yo-release\/sdd-yo-0\.3\.0\.tgz" --access public --provenance/u,
  );
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./u);

  assert.doesNotMatch(ordinaryCi, /id-token: write|npm publish/u);
});
