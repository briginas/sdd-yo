# Security policy

## Supported versions

SDD Yo is pre-1.0 and has no public package release. Security fixes currently
target the latest `main` revision. Older revisions and private tarballs are not
maintained as separate supported release lines.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue, discussion, pull
request, or test fixture.

Use GitHub's private vulnerability reporting for this repository. Include:

- the affected revision or package version;
- the impacted command, library surface, or Skill route;
- reproduction steps or a minimal proof of concept;
- the expected security boundary and observed behavior;
- any known workaround or exposure assessment.

If the private reporting button is unavailable, open a minimal issue asking
the repository owner for a private contact channel without including sensitive
details.

The maintainer will acknowledge the report, investigate it, and coordinate a
fix and disclosure timeline according to impact. Do not treat an automated
scan or passing test as a security-review verdict.
