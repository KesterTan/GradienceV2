---
name: dev-spec-publisher
description: Generate a draft development specification for one or more PRs using automation/scripts/publish_dev_spec_from_pr.sh and automation/scripts/dev_spec_from_pr.sh; operator review and completion of risks/validation are required before publishing.
---

When invoked as:

    /dev-spec-publisher publish dev spec for PR #<number> [and PR #<number2> ...]

or

    /dev-spec-publisher publish dev spec for PRs #<number1>, #<number2>, ...

do the following:

1. Before creating the dev spec, create a tracking issue in a configured issue repo (defaults to the source repo when not provided) describing the PR(s) that will be covered.
2. Run `automation/scripts/publish_dev_spec_from_pr.sh <repo> <comma-separated-pr-numbers>` to:
     - Fetch the details (title, body, diff, linked issues, merge date, reviewers, etc.) for all specified PR numbers.
     - Auto-generate a dev spec markdown file (e.g., DEV_SPEC_PR_<number1>_<number2>_...md) with template sections.
     - Commit the file to a new branch (e.g., dev-spec-pr-<number1>-<number2>-...) and open a PR.
3. After the script succeeds, **fill in every template section** using AI analysis of the codebase and PR diff.
   Do not leave placeholders. Each section must contain real content:

   - **Section 1 — Ownership**: primary owner = PR author; secondary owners = reviewers (from PR metadata).
   - **Section 2 — Merge Date**: exact UTC timestamp from `mergedAt` in PR metadata.
   - **Section 3 — Architecture Diagram**: Mermaid `graph` or `flowchart` showing all components with their execution context (CLIENT / SERVER / CLOUD / EDGE / DEVICE). Every component named in the code must appear.
   - **Section 4 — Information Flow Diagram**: Mermaid `flowchart` showing every piece of user information and application data that moves between components, with labeled directed edges.
   - **Section 5 — Class Diagram**: Mermaid `classDiagram` showing every class and interface relevant to the user story, with all superclass/subclass relationships. This will be verified — do not omit any class.
   - **Section 6 — Class Reference**: For every class in section 5, list all public fields and methods first (grouped by concept), then all private fields and methods (grouped by concept). Explain the purpose of each field and method.
   - **Section 7 — Technologies**: A Markdown table with one row per technology (language, libraries, APIs, tools). Columns: name, required version, what it is used for, why it was chosen over alternatives, and a URL to source/author/docs. Do not omit anything — include the language itself, common libraries, and necessary tools.
   - **Section 8 — Long-Term Storage**: For each data type stored in a database, explain every field's purpose and estimate storage in bytes per record. If no database is used, state so explicitly.
   - **Section 9 — Failure Modes**: Fill in every row of the table for these scenarios: process crash, lost runtime state, erased stored data, corrupt data in database, RPC failure, client overloaded, client out of RAM, database out of space, lost network connectivity, lost database access, bot signs up and spams users. Describe both user-visible and internally-visible effects.
   - **Section 10 — PII**: For each PII item in long-term storage: justify why it is kept, how it is stored, how it entered the system, the full module/class/method/field path it took before and after storage, who is responsible for securing it, and the audit procedures. For minors' PII: state whether it is solicited/stored, why, whether guardian permission is solicited, and the team policy for preventing access by those convicted or suspected of child abuse.
   - **Section 12 — Risks / Assumptions**: Concrete risks and assumptions specific to this PR's implementation.
   - **Section 13 — Validation / Acceptance Criteria**: Concrete, checkable validation steps derived from the PR's acceptance criteria and test coverage.

4. Commit the completed dev spec to the open PR branch and push.

This skill runs script-driven automation and produces a draft that requires operator verification. Before merging the dev spec PR, a human must:
- Verify accuracy of architecture and class diagrams against the code
- Confirm the PII analysis is complete and correct
- Complete the risks/validation sections if not already filled

See [automation/scripts/publish_dev_spec_from_pr.sh](automation/scripts/publish_dev_spec_from_pr.sh), [automation/scripts/dev_spec_from_pr.sh](automation/scripts/dev_spec_from_pr.sh).