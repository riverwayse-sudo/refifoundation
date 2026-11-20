## Change summary

State what changed. Use direct, specific language.

## Reason for change

State the problem or requirement.

## Behavior and compatibility

- Existing behavior that must remain:
- New behavior:
- API, data, or configuration changes:

## Risk and impact

- Affected routes, services, and data:
- Security and privacy impact:
- Accessibility and performance impact:
- Rollback plan:

## Verification evidence

| Check | Command or action | Expected result | Actual result |
|---|---|---|---|
| Lint | `npm run lint` | No lint errors | |
| Type check | `npm run typecheck` | No type errors | |
| Build | `npm run build` | Build succeeds | |
| Sitemap | `npm run verify:sitemap` | Sitemap checks pass | |
| Other tests | Describe the test | State the expected result | |

For user-visible changes, include deployed-site verification. A successful build alone does not prove that the deployed feature works.

## Communication and documentation review

- [ ] Instructions use clear, direct language and consistent terms.
- [ ] Warnings appear before risky actions.
- [ ] Technical terms and acronyms are defined where needed.
- [ ] Documentation matches the implementation.
- [ ] No required technical detail was removed.

## Release readiness

- [ ] No secrets or private data are included.
- [ ] Required environment changes are documented.
- [ ] Migration and recovery steps are documented.
- [ ] Outstanding risks and owner actions are listed.
