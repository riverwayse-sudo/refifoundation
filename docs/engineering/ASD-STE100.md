# ASD-STE100 Engineering Communication Standard

**Project:** REFI Foundation website  
**Reference edition:** ASD-STE100 Issue 9, 15 January 2025  
**Status:** Project writing policy; not a claim of certified or full-standard compliance  
**Applies to:** Engineering and technical communication in this repository

## 1. Purpose

Use clear, controlled English for technical information. Reduce ambiguity in instructions, system behavior, errors, tests, operations, and handover material.

ASD-STE100 is a controlled natural language for technical documentation. It does not replace software design, security, accessibility, testing, or code-quality standards.

## 2. Governing reference

Use the current official ASD-STE100 issue as the authority for formal compliance. Issue 9 (15 January 2025) is the reference edition for this policy. Obtain the official copy from [ASD-STE100 Downloads](https://asd-ste100.org/STE_downloads.html).

Do not copy or republish the standard's protected dictionary or rule text in this repository. This guide is an implementation policy, not a substitute for Part 1 or Part 2 of the standard.

A document must not be described as “ASD-STE100 compliant” unless a qualified reviewer has checked it against the complete current official standard. Use “STE-aligned” for work that follows this project's clarity practices but has not had a full compliance review.

## 3. Scope

Apply this policy to:

- Architecture and design records.
- Technical specifications and implementation plans.
- Installation, deployment, configuration, recovery, and maintenance instructions.
- API and integration documentation.
- Test plans, test cases, expected results, and defect reports.
- Incident reports, runbooks, and release notes.
- Pull request descriptions, code review findings, and engineering issues.
- User-facing labels, instructions, status messages, and error messages where controlled language improves understanding.
- Owner guides and project handover documents.

Source code identifiers, API field names, database schema names, third-party product names, legal text, and quoted external content are not to be changed only to simplify the English. Explain specialist terms when the reader needs that explanation.

## 4. Writing rules for this project

These rules are a practical baseline. The official ASD-STE100 writing rules and dictionary take precedence.

1. Write one main instruction or fact in each sentence.
2. Prefer short, direct sentences. Split a sentence when it contains several actions or conditions.
3. Use active voice when the actor is known.
4. Use the present tense for system behavior and the imperative form for instructions.
5. Name the actor, action, object, condition, and expected result.
6. Use the same term for the same component or action throughout a document.
7. Prefer a simple, specific word over an abstract or vague word.
8. Do not use a word only because it sounds more formal or technical.
9. Avoid idioms, slang, metaphors, unnecessary abbreviations, and unexplained acronyms.
10. Define an acronym at first use unless it is a well-known project term for the intended reader.
11. Use numbered steps for procedures. Put one action in each step.
12. State warnings before the action that can cause harm, data loss, service interruption, or security exposure.
13. State measurable values with units and define the conditions that apply.
14. Separate confirmed facts, assumptions, risks, and recommendations.
15. Do not remove technical detail that a person needs to complete a task safely.

## 5. Required procedure structure

Use this structure for operational procedures when it applies:

- **Purpose:** State what the procedure does.
- **Scope:** State the system, environment, and people that it applies to.
- **Before you start:** List access, tools, permissions, backups, and preconditions.
- **Procedure:** Give ordered actions. Use one action per step.
- **Expected result:** State what success looks like.
- **If the result is different:** Give safe diagnostic and recovery steps.
- **Verification:** State the checks and evidence required.
- **Rollback:** State how to restore the previous state, when rollback is possible.

Never tell an operator to run a destructive command without a clear warning, a stated target, and a recovery plan.

## 6. Engineering record requirements

### Architecture and design

Record the problem, constraints, decision, alternatives considered, consequences, and verification method. Distinguish existing behavior from proposed behavior.

### Pull requests

Each pull request must state:

- What changed.
- Why the change is required.
- Which behavior must remain unchanged.
- Risks and affected systems.
- Tests run and their results.
- Any manual action still required.

### Defects and incidents

Describe the observed result, expected result, steps to reproduce, impact, evidence, and current status. Do not state a suspected cause as a confirmed cause.

### Test evidence

For each important test, record the environment, input or action, expected result, actual result, and pass/fail status. A successful build alone does not prove that a deployed feature works.

## 7. User-interface language

Use action labels that describe the result, such as “Save changes” or “Send message”. Avoid vague labels such as “Proceed” when the action can be named.

Error messages must state:

1. What did not work.
2. What the user can do next.
3. Whether the user's data was saved or changed, when that is known.

Do not expose stack traces, database details, secrets, internal paths, or security controls in public error messages.

## 8. Terminology control

Maintain one name for each important system, role, state, and action. Add project-specific terms to a terminology list before they become common in the codebase or documentation.

For each term, record its approved form, definition, and forms that must not be used. Do not invent a technical synonym when an existing term is clear.

## 9. Review and acceptance

Technical authors must review their text before they submit it. Reviewers must check:

- The intended reader can identify each action.
- Each instruction has a clear target and expected result.
- Terms are consistent.
- Conditions and exceptions are explicit.
- Warnings appear before risky actions.
- Technical facts match the implementation.
- No required detail was removed in the name of simplification.

For formal ASD-STE100 compliance, review the complete document against the current official Part 1 rules and Part 2 dictionary. Record the reviewer, edition, document version, findings, and disposition of each finding.

## 10. Adoption and enforcement

- New or materially revised engineering documents must follow this policy.
- Existing documents must be updated when engineers next use or revise them. Do not create a risky mass rewrite.
- Pull request review must flag unclear or inconsistent technical instructions.
- User-facing text must also pass product, accessibility, and security review.
- Code behavior, API contracts, legal meaning, and safety information take priority over stylistic simplification.
- Review this policy when ASD publishes a new issue or when project terminology changes.

## 11. Examples

These examples show the project's preferred style. They are not a formal dictionary validation.

| Avoid | Prefer |
|---|---|
| “The system will facilitate the processing of the request.” | “The system processes the request.” |
| “In the event that the payment fails, please try again.” | “If the payment fails, try again.” |
| “The configuration needs to be updated by the operator.” | “Update the configuration.” |
| “The service is currently unavailable.” | “The service is not available. Try again later.” |
| “Ensure that the relevant credentials have been configured.” | “Set the required credentials before you start.” |

## 12. Reference

- Official ASD-STE100 website: https://www.asd-ste100.org/
- Official download page: https://asd-ste100.org/STE_downloads.html
- Current reference: ASD-STE100 Issue 9, dated 15 January 2025.
