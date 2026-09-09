# Contributing to ShinyStack

Thanks for taking the time to contribute. A useful contribution should make repository audits more accurate, more understandable, or easier to integrate into a maintainer workflow.

## Local setup

1. Install Node.js 18 or newer.
2. Clone the repository and change into its directory.
3. Run `npm test`.
4. Run `node src/cli.js --path .` to inspect the local project.

There are no runtime dependencies to install.

## Good first contributions

- Add a regression test for a repository layout we do not recognize.
- Improve a check's remediation message.
- Add support for another common license filename.
- Add a useful output field to the JSON report.
- Improve Windows path handling.
- Add documentation for integrating the report into CI.

Please open an issue before larger changes so the behavior and output format can be discussed first.

## Pull requests

- Keep each pull request focused on one change.
- Add tests for new detection behavior.
- Run `npm test` before opening the pull request.
- Explain the problem, the behavior change, and any compatibility impact.

## Project design

ShinyStack uses Node.js built-ins instead of a dependency framework. Checks live in `src/checks.js`, while command-line parsing and exit behavior live in `src/cli.js`. Keep these responsibilities separate when adding features.
