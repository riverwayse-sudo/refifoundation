# Engineering review checklist

Use this checklist for significant changes to the REFI Foundation website. Select only the checks that apply, but record why a relevant check does not apply.

## Requirements and design

- [ ] The problem and intended result are clear.
- [ ] Acceptance criteria are measurable.
- [ ] Existing behavior and compatibility requirements are recorded.
- [ ] Assumptions, constraints, and unresolved questions are identified.
- [ ] The change is the smallest safe change that meets the requirement.

## Implementation

- [ ] Logic has one clear responsibility.
- [ ] Shared behavior is not duplicated without a reason.
- [ ] Inputs are validated at the trust boundary.
- [ ] Errors fail safely and do not expose secrets or internal details.
- [ ] Authorization is checked on the server for protected operations.
- [ ] Data changes have safe migration and recovery steps.
- [ ] Dependencies and configuration changes are justified.

## Security and privacy

- [ ] No secret is committed to the repository or exposed to the browser.
- [ ] User input is validated and safely rendered.
- [ ] Rate limits and abuse controls are considered for public endpoints.
- [ ] Personal data is collected only when required.
- [ ] Payment status is verified by a trusted server-side source.
- [ ] Logs do not expose credentials, tokens, or unnecessary personal data.

## Accessibility and performance

- [ ] Keyboard navigation works for interactive controls.
- [ ] Controls have accessible names and visible focus states.
- [ ] Color is not the only way to communicate status.
- [ ] Layout works at supported mobile and desktop widths.
- [ ] Images have suitable alternative text when they convey information.
- [ ] Performance impact is measured or explained.

## Tests and evidence

- [ ] Relevant automated tests pass.
- [ ] Lint and type checks pass.
- [ ] Production build passes.
- [ ] Critical failure paths are tested.
- [ ] The deployed site is checked for user-visible changes.
- [ ] Actual results and test environment are recorded.

## ASD-STE100 communication

- [ ] Sentences state one main fact or instruction.
- [ ] Procedures use numbered steps and one action per step.
- [ ] Actors, actions, conditions, and expected results are clear.
- [ ] Terms match `TERMINOLOGY.md`.
- [ ] Acronyms are defined at first use where needed.
- [ ] Warnings appear before actions that can cause harm or data loss.
- [ ] Assumptions are not presented as facts.
- [ ] Technical meaning and required detail are preserved.

## Release and operations

- [ ] Deployment steps are documented.
- [ ] Required environment variables are listed without their secret values.
- [ ] Monitoring and failure signals are identified.
- [ ] Rollback steps are documented and practical.
- [ ] Owner actions and known limitations are listed.
