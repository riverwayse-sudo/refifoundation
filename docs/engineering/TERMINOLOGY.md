# Engineering terminology register

**Project:** REFI Foundation website  
**Status:** Initial register; extend when product and engineering terms are approved.

Use one approved term for one concept. Do not change identifiers, API fields, database names, or third-party product names to match this register. Explain them when the intended reader needs help.

| Approved term | Meaning | Avoid | Notes |
|---|---|---|---|
| Foundation website | The public REFI Foundation website | Site (when the scope is unclear) | Use “website” in owner-facing instructions. |
| Content management system (CMS) | The system that authorized editors use to create and manage website content | Admin system (when CMS is meant) | Define CMS at first use in a document. |
| Editor | A person who has permission to create or update content | Admin (unless the role is an administrator) | State the editor's permission level. |
| Published content | Content that is approved and visible on the public website | Live content (when publication state matters) | Do not call draft or scheduled content published. |
| Scheduled content | Content set to publish at a future date or time | Pending content (when schedule is meant) | State the configured date and time zone. |
| Donation | A payment made to support the Foundation | Contribution (unless the legal or product context requires it) | Do not treat an initiated payment as a completed donation. |
| Verified payment | A payment confirmed by the trusted payment provider or verified server-side record | Successful payment (without verification evidence) | Client-side return pages are not proof of payment. |
| Match Centre | The sports match information and related experience | Match page (when the complete feature is meant) | Keep the product name consistent. |
| Leaderboard | A ranked list based on the defined scoring rules | Ranking table (unless describing the UI element) | Document the scoring method and tie rules. |
| Production | The live environment used by public visitors | Live (in deployment instructions) | Identify the production domain when relevant. |
| Preview deployment | A temporary deployment used to review a change | Staging (unless it is a separate staging environment) | State access restrictions. |
| Rollback | A controlled return to a previous known-good release or state | Undo (for a deployment operation) | State data implications and recovery limits. |

## Register maintenance

Add a term when a new feature, role, state, or operational process introduces a name that engineers or editors must use consistently. Record the approved term, meaning, and terms to avoid. Review this register when product language changes.
