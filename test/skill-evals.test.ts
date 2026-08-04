import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

import { parseProjectConfiguration } from "../src/index.ts";

type Guard = {
  readonly file: string;
  readonly includes: string;
};

type Scenario = {
  readonly id: string;
  readonly route: string;
  readonly prompt: string;
  readonly input_channels: readonly string[];
  readonly setup: {
    readonly fixture_ids: readonly string[];
    readonly cli_modes: readonly string[];
    readonly selected_project: string | null;
    readonly instructions: string;
  };
  readonly expected_references: readonly string[];
  readonly expected_operations: readonly string[];
  readonly forbidden_actions: readonly string[];
  readonly required_guards: readonly Guard[];
  readonly human_review: readonly string[];
};

type ScenarioSuite = {
  readonly schema_version: string;
  readonly suite_id: string;
  readonly requirements: readonly string[];
  readonly scenarios: readonly Scenario[];
};

type FixtureCatalog = {
  readonly schema_version: string;
  readonly suite_id: string;
  readonly payloads: readonly {
    readonly id: string;
    readonly channel: string;
    readonly content: string;
  }[];
  readonly project_layouts: readonly {
    readonly id: string;
    readonly files: readonly { readonly path: string; readonly content: string }[];
  }[];
  readonly skill_manifests: readonly {
    readonly id: string;
    readonly path: string;
    readonly content: string;
  }[];
  readonly cli_modes: readonly {
    readonly id: string;
    readonly exit_code: number;
    readonly purpose: string;
  }[];
};

const executeFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const scenarioPath = join(repositoryRoot, "evals/skill/scenarios.json");
const fixturesPath = join(repositoryRoot, "evals/skill/fixtures.json");
const materializerPath = join(repositoryRoot, "evals/skill/scripts/materialize-project-fixture.mjs");
const fakeCliPath = join(repositoryRoot, "evals/skill/scripts/fake-sdd-cli");
const checkerPath = join(repositoryRoot, "skills/sdd-yo/scripts/check-cli-compatibility");
const changedAdapterScenarioId = "changed-adapter-configuration-trust-review";

async function loadSuite(): Promise<ScenarioSuite> {
  return JSON.parse(await readFile(scenarioPath, "utf8")) as ScenarioSuite;
}

async function loadFixtures(): Promise<FixtureCatalog> {
  return JSON.parse(await readFile(fixturesPath, "utf8")) as FixtureCatalog;
}

async function runChecker(
  mode: string,
  args: readonly string[],
): Promise<{ readonly stdout: string; readonly stderr: string; readonly code: number }> {
  try {
    const result = await executeFile(process.execPath, [checkerPath, "--cli", fakeCliPath, "--", ...args], {
      env: { ...process.env, SDD_SKILL_FAKE_MODE: mode },
    });
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (error) {
    const failure = error as { readonly stdout: string; readonly stderr: string; readonly code: number };
    return { stdout: failure.stdout, stderr: failure.stderr, code: failure.code };
  }
}

function sortedUnique(values: readonly string[]): boolean {
  return values.every((value, index) => {
    const previous = values[index - 1];
    return index === 0 || (previous !== undefined && previous < value);
  });
}

test("REQ-26234DC8 skill eval corpus covers every progressive-disclosure route", async () => {
  const suite = await loadSuite();
  assert.equal(suite.schema_version, "1.0");
  assert.equal(suite.suite_id, "sdd-yo-skill-safety-v1");
  assert.deepEqual(suite.requirements, ["REQ-1DD46CA9", "REQ-26234DC8"]);
  assert.equal(new Set(suite.scenarios.map(({ id }) => id)).size, suite.scenarios.length);

  assert.deepEqual([...new Set(suite.scenarios.map(({ route }) => route))].toSorted(), [
    "author",
    "branch-preparation",
    "diagnose",
    "discovery",
    "initialize",
    "merge-readiness",
    "project-isolation",
    "proposal-review",
    "semantic-review",
    "understand",
    "verification",
  ]);

  const references = suite.scenarios.flatMap(({ expected_references }) => expected_references).toSorted();
  assert.deepEqual(
    [...new Set(references)],
    [
      "references/authoring.md",
      "references/branch-preparation.md",
      "references/diagnostics.md",
      "references/modes.md",
      "references/object-model.md",
      "references/onboarding.md",
      "references/proposal-gate.md",
      "references/verification.md",
    ],
  );

  const operations = suite.scenarios.flatMap(({ expected_operations }) => expected_operations).toSorted();
  assert.deepEqual(
    [...new Set(operations)],
    [
      "findings.validate",
      "id",
      "init",
      "inspect",
      "merge.check",
      "proposal.apply",
      "proposal.prepare",
      "proposal.validate",
      "tests.discover",
      "trace",
      "validate",
    ],
  );
});

test("REQ-1DD46CA9 skill eval corpus covers every untrusted repository data channel", async () => {
  const suite = await loadSuite();
  const channels = suite.scenarios.flatMap(({ input_channels }) => input_channels).toSorted();
  assert.deepEqual(
    [...new Set(channels)],
    ["adapter-config", "adapter-stderr", "code", "linked-document", "spec", "test-name"],
  );
});

test("REQ-26234DC8 REQ-1DD46CA9 every scenario has exact reproducible setup inputs", async () => {
  const suite = await loadSuite();
  const fixtures = await loadFixtures();
  assert.equal(fixtures.schema_version, "1.0");
  assert.equal(fixtures.suite_id, suite.suite_id);

  const fixtureIds = [
    ...fixtures.payloads.map(({ id }) => id),
    ...fixtures.project_layouts.map(({ id }) => id),
    ...fixtures.skill_manifests.map(({ id }) => id),
  ];
  assert.equal(new Set(fixtureIds).size, fixtureIds.length);
  const knownFixtures = new Set(fixtureIds);
  const knownModes = new Set(fixtures.cli_modes.map(({ id }) => id));

  assert.deepEqual(fixtures.payloads.map(({ channel }) => channel).toSorted(), [
    "adapter-config",
    "adapter-stderr",
    "code",
    "linked-document",
    "spec",
    "test-name",
  ]);
  assert.ok(fixtures.payloads.every(({ content }) => content.length > 20));

  for (const scenario of suite.scenarios) {
    assert.ok(sortedUnique(scenario.setup.fixture_ids), `${scenario.id}: fixture IDs must be sorted and unique`);
    assert.ok(sortedUnique(scenario.setup.cli_modes), `${scenario.id}: CLI modes must be sorted and unique`);
    assert.ok(scenario.setup.instructions.length > 30, `${scenario.id}: setup instructions are incomplete`);
    assert.ok(
      scenario.setup.fixture_ids.every((id) => knownFixtures.has(id)),
      `${scenario.id}: unknown fixture`,
    );
    assert.ok(
      scenario.setup.cli_modes.every((id) => knownModes.has(id)),
      `${scenario.id}: unknown CLI mode`,
    );
    assert.ok(sortedUnique(scenario.forbidden_actions), `${scenario.id}: forbidden actions must be sorted and unique`);
    assert.ok(scenario.forbidden_actions.length > 0, `${scenario.id}: missing forbidden actions`);

    for (const channel of scenario.input_channels) {
      const payload = fixtures.payloads.find((candidate) => candidate.channel === channel);
      assert.ok(payload !== undefined, `${scenario.id}: no payload for ${channel}`);
      assert.ok(scenario.setup.fixture_ids.includes(payload.id), `${scenario.id}: payload ${payload.id} not selected`);
    }
  }
});

test("REQ-26234DC8 REQ-1DD46CA9 scripted skill guards remain present and project-scoped", async () => {
  const suite = await loadSuite();

  for (const scenario of suite.scenarios) {
    assert.match(scenario.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.ok(scenario.prompt.length > 0, scenario.id);
    assert.ok(sortedUnique(scenario.expected_references), `${scenario.id}: references must be sorted and unique`);
    assert.ok(sortedUnique(scenario.expected_operations), `${scenario.id}: operations must be sorted and unique`);
    assert.ok(scenario.required_guards.length > 0, `${scenario.id}: missing scripted guard`);
    assert.ok(scenario.human_review.length > 0, `${scenario.id}: missing human review criteria`);

    for (const reference of scenario.expected_references) {
      assert.match(reference, /^references\/[a-z][a-z-]*\.md$/u, `${scenario.id}: ${reference}`);
    }

    for (const guard of scenario.required_guards) {
      assert.match(guard.file, /^skills\/sdd-yo\/(?:SKILL\.md|agents\/openai\.yaml|references\/[a-z][a-z-]*\.md)$/u);
      assert.ok(guard.includes.length > 0, `${scenario.id}: empty guard`);
      const content = await readFile(join(repositoryRoot, guard.file), "utf8");
      assert.ok(content.includes(guard.includes), `${scenario.id}: missing guard in ${guard.file}: ${guard.includes}`);
    }
  }
});

test("REQ-1DD46CA9 project fixture materializer writes exact bytes only into an empty root", async () => {
  const fixtures = await loadFixtures();
  const layout = fixtures.project_layouts.find(({ id }) => id === "adjacent-projects");
  assert.ok(layout !== undefined);
  const root = await mkdtemp(join(tmpdir(), "sdd-skill-eval-"));
  const output = join(root, "fixture");
  await mkdir(output);

  const materialized = await executeFile(process.execPath, [
    materializerPath,
    "--fixture",
    "adjacent-projects",
    "--output",
    output,
  ]);
  assert.match(materialized.stdout, /^adjacent-projects: 10 files materialized/u);
  for (const entry of layout.files) {
    assert.equal(await readFile(join(output, entry.path), "utf8"), entry.content, entry.path);
  }
  for (const project of ["project-a", "project-b"] as const) {
    const parsed = parseProjectConfiguration(await readFile(join(output, project, ".sdd/config.yaml")));
    assert.equal(parsed.ok, true, project);
  }

  await assert.rejects(
    executeFile(process.execPath, [materializerPath, "--fixture", "empty-initialization-root", "--output", output]),
    (error: { readonly stderr?: string }) => error.stderr?.includes("--output must be empty") === true,
  );

  const skillOutput = join(root, "skill");
  await mkdir(skillOutput);
  await executeFile(process.execPath, [materializerPath, "--fixture", "generic-sdd-skill", "--output", skillOutput]);
  assert.deepEqual(await readdir(join(skillOutput, "generic-sdd")), ["SKILL.md"]);

  const changedAdapterOutput = join(root, "changed-adapter");
  await mkdir(changedAdapterOutput);
  const changedAdapter = await executeFile(process.execPath, [
    materializerPath,
    "--fixture",
    "changed-adapter-project",
    "--output",
    changedAdapterOutput,
  ]);
  assert.match(changedAdapter.stdout, /^changed-adapter-project: 3 files materialized/u);
  const currentConfig = await readFile(join(changedAdapterOutput, ".sdd/config.yaml"));
  const baseConfig = await readFile(join(changedAdapterOutput, "review-input/base-config.yaml"));
  assert.equal(parseProjectConfiguration(currentConfig).ok, true);
  assert.equal(parseProjectConfiguration(baseConfig).ok, true);
  assert.match(currentConfig.toString("utf8"), /tools\/discover-v2\.mjs/u);
  assert.match(baseConfig.toString("utf8"), /tools\/discover-v1\.mjs/u);
});

test("REQ-26234DC8 controlled fake CLI exercises exact failure and status boundaries", async () => {
  await chmod(fakeCliPath, 0o755);
  const fixtures = await loadFixtures();
  const stderrPayload = fixtures.payloads.find(({ id }) => id === "adapter-stderr-injection");
  assert.ok(stderrPayload !== undefined);
  const injected = await executeFile(fakeCliPath, ["validate", "--cwd", repositoryRoot, "--format", "json"], {
    env: { ...process.env, SDD_SKILL_FAKE_STDERR_INJECTION: "1" },
  });
  assert.equal(injected.stderr, `${stderrPayload.content}\n`);

  const selector = ["validate", "--cwd", repositoryRoot] as const;
  for (const mode of ["malformed", "incompatible"] as const) {
    const result = await runChecker(mode, selector);
    assert.equal(result.code, 3, `${mode}: ${result.stderr}`);
  }

  const prepared = await runChecker("review-required", [
    "proposal",
    "prepare",
    "--package",
    ".sdd/staging/package.json",
    "--candidate",
    ".sdd/staging/candidate.json",
    "--branch-head",
    "HEAD",
    "--integration-ref",
    "main",
    "--cwd",
    repositoryRoot,
  ]);
  assert.equal(prepared.code, 2, prepared.stderr);
  assert.equal((JSON.parse(prepared.stdout) as { result: { spec_patch: unknown } }).result.spec_patch, null);

  const mergeArguments = [
    "merge",
    "check",
    "--change",
    ".sdd/staging/change.json",
    "--package",
    ".sdd/staging/package.json",
    "--candidate",
    ".sdd/staging/candidate.json",
    "--approval",
    ".sdd/staging/approval.json",
    "--test-index",
    ".sdd/staging/index.json",
    "--test-evidence",
    ".sdd/staging/tests.json",
    "--qa",
    ".sdd/staging/qa.json",
    "--cwd",
    repositoryRoot,
  ] as const;
  for (const [mode, code, status] of [
    ["valid", 0, "PASS"],
    ["review-required-merge", 2, "REVIEW_REQUIRED"],
    ["blocked-merge", 1, "BLOCKED"],
  ] as const) {
    const result = await runChecker(mode, mergeArguments);
    assert.equal(result.code, code, `${mode}: ${result.stderr}`);
    assert.equal((JSON.parse(result.stdout) as { result: { status: string } }).result.status, status);
  }
});

test("REQ-26234DC8 historical eleven-scenario review template remains schema-valid and inert", async () => {
  const suite = await loadSuite();
  const schema = JSON.parse(
    await readFile(join(repositoryRoot, "evals/skill/review-result.schema.json"), "utf8"),
  ) as object;
  const template = JSON.parse(
    await readFile(join(repositoryRoot, "evals/skill/review-result.template.json"), "utf8"),
  ) as {
    readonly scenario_results: readonly {
      readonly scenario_id: string;
      readonly verdict: string;
      readonly transcript: unknown;
    }[];
    readonly overall_verdict: string;
  };
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(template), true, JSON.stringify(validate.errors));
  assert.deepEqual(
    template.scenario_results.map(({ scenario_id }) => scenario_id),
    suite.scenarios
      .map(({ id }) => id)
      .filter((id) => id !== changedAdapterScenarioId)
      .toSorted(),
  );
  assert.equal(new Set(template.scenario_results.map(({ scenario_id }) => scenario_id)).size, 11);
  assert.ok(
    template.scenario_results.every(({ verdict, transcript }) => verdict === "not_reviewed" && transcript === null),
  );
  assert.equal(template.overall_verdict, "not_reviewed");

  const invalidPass = JSON.parse(JSON.stringify(template)) as {
    scenario_results: { verdict: string; transcript: unknown }[];
  };
  const first = invalidPass.scenario_results[0];
  assert.ok(first !== undefined);
  first.verdict = "pass";
  assert.equal(validate(invalidPass), false);
});

test("REQ-1DD46CA9 changed-adapter human review template is schema-valid and explicitly not reviewed", async () => {
  const schema = JSON.parse(
    await readFile(join(repositoryRoot, "evals/skill/changed-adapter-review-result.schema.json"), "utf8"),
  ) as object;
  const template = JSON.parse(
    await readFile(join(repositoryRoot, "evals/skill/changed-adapter-review-result.template.json"), "utf8"),
  ) as {
    readonly scenario_result: {
      readonly scenario_id: string;
      readonly verdict: string;
      readonly transcript: unknown;
    };
    readonly overall_verdict: string;
  };
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(template), true, JSON.stringify(validate.errors));
  assert.deepEqual(template.scenario_result, {
    scenario_id: changedAdapterScenarioId,
    verdict: "not_reviewed",
    transcript: null,
    findings: [],
  });
  assert.equal(template.overall_verdict, "not_reviewed");
});

test("REQ-26234DC8 REQ-1DD46CA9 retains the explicit identified human pass verdict", async () => {
  const suite = await loadSuite();
  const schema = JSON.parse(
    await readFile(join(repositoryRoot, "evals/skill/review-result.schema.json"), "utf8"),
  ) as object;
  const result = JSON.parse(await readFile(join(repositoryRoot, "evals/skill/review-result.json"), "utf8")) as {
    readonly skill_revision: string;
    readonly reviewer: { readonly identity: string; readonly role: string };
    readonly scenario_results: readonly {
      readonly scenario_id: string;
      readonly verdict: string;
      readonly transcript: { readonly path: string; readonly sha256: string };
      readonly findings: readonly string[];
    }[];
    readonly overall_verdict: string;
  };
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(result), true, JSON.stringify(validate.errors));
  assert.equal(result.skill_revision, "72361ce");
  assert.deepEqual(result.reviewer, { identity: "Ivan Briginas", role: "human Skill reviewer" });
  assert.deepEqual(
    result.scenario_results.map(({ scenario_id }) => scenario_id),
    suite.scenarios
      .map(({ id }) => id)
      .filter((id) => id !== changedAdapterScenarioId)
      .toSorted(),
  );
  assert.ok(result.scenario_results.every(({ verdict, findings }) => verdict === "pass" && findings.length === 0));
  assert.equal(result.overall_verdict, "pass");

  const transcriptPaths = new Set(result.scenario_results.map(({ transcript }) => transcript.path));
  assert.deepEqual([...transcriptPaths], ["transcripts/ivan-briginas-verdict.md"]);
  const transcript = await readFile(join(repositoryRoot, "evals/skill", [...transcriptPaths][0] ?? ""));
  const fingerprint = `sha256:${createHash("sha256").update(transcript).digest("hex")}`;
  assert.ok(result.scenario_results.every(({ transcript: binding }) => binding.sha256 === fingerprint));
  assert.match(transcript.toString("utf8"), /Ivan Briginas/u);
  assert.match(transcript.toString("utf8"), /всё работает/u);
});
