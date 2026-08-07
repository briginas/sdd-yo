# Milestone 15 — Semantic SpecPatch confirmation

Milestone 15 completed the semantic default presentation for exact SpecPatch
confirmation under `REQ-26234DC8` / `CAP-404305F6`. No CLI, schema,
configuration, package version, or exact-patch safety behavior changed.

The approved `spec-code` Change modified only `REQ-26234DC8`. Its project was
`SDD-17EF8B29`, its base was `2e7424f5a969c019f843b5b38b17b54991132215`, and
the approved semantic and structural delta fingerprints were respectively
`sha256:9249f7ac2d9db383bf0f901e0d2341c76501857c3e504de529e2478934048707`
and `sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
Ivan Briginas approved it as issuer `product-review`, actor `ivan-briginas`,
decision `approved`, message `it's ok`; separate selection applied the exact
SpecPatch retained under `.sdd/staging/milestone-15.1/`.

The Skill now presents one to three behavior-and-consequence points by default,
makes technical details opt-in, and preserves separate exact patch selection.
Static checks and manual scenarios cover default confirmation, explicit details
without authorization, and concise `review_required`. Ivan Briginas recorded a
passing verdict at
`evals/skill/transcripts/ivan-briginas-semantic-patch-verdict.md`.

Validation passed on 2026-08-07: focused Skill/eval tests (30/30), `npm test`
(235/235), package smoke (1/1), schema check, build, typecheck, formatting,
contract verification (27,549 checks), and `git diff --check`.
