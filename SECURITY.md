# Security policy

## Supported versions

SDD Yo is pre-1.0. Security fixes target only the latest public npm release and
the latest `main` revision. Older public releases, private package versions,
and private tarballs are not maintained as separate supported release lines.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue, discussion, pull
request, or test fixture.

GitHub private vulnerability reporting is not currently enabled for this
repository. Open a minimal public issue asking the repository owner for a
private contact channel, without including vulnerability details. In the
private report, include:

- the affected revision or package version;
- the impacted command, library surface, or Skill route;
- reproduction steps or a minimal proof of concept;
- the expected security boundary and observed behavior;
- any known workaround or exposure assessment.

The maintainer will acknowledge the report, investigate it, and coordinate a
fix and disclosure timeline according to impact. Do not treat an automated
scan or passing test as a security-review verdict.
