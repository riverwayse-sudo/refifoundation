# REFI Foundation — UI/UX Rules

Version: 1.0
Status: Canonical product/design rule set

## 1. Product experience principle

REFI should feel credible, human, transparent and action-oriented. The interface must communicate institutional trust without becoming cold or bureaucratic.

**Experience formula:** clarity + dignity + evidence + action.

Every page must answer, in order:
1. Where am I?
2. Why does this matter?
3. What evidence supports it?
4. What can I do next?

## 2. Visual hierarchy

- White is the default canvas and should dominate the experience.
- Blue establishes institutional identity and is used for navigation, major sections, footer and high-confidence information blocks.
- Gold is a supporting accent, never a competing primary colour.
- Red is reserved for action, urgency and carefully selected programme moments.
- Dark text is preferred for editorial readability.
- Do not create arbitrary colour combinations outside the token system.

## 3. Layout system

- Use a consistent responsive container and generous horizontal whitespace.
- Desktop layouts should generally use a 12-column grid.
- Mobile layouts collapse to a simple single-column reading flow unless a two-column pattern materially improves comprehension.
- Sections should have clear visual separation without excessive boxed containers.
- Avoid stacking multiple full-width coloured bands simply for decoration.
- Use whitespace as an active design element.

## 4. Content hierarchy

Every section must have one dominant message.

Recommended hierarchy:
- Eyebrow / category
- Clear section heading
- Short explanatory statement
- Evidence, programme detail or supporting content
- One primary next action

Avoid paragraphs that force users to hunt for the point.

## 5. Navigation

Primary navigation must remain predictable and concise. Recommended top-level structure:
- About
- Our Work
- Impact
- Stories
- Get Involved

Use a prominent support/donation action without allowing it to overpower the navigation.

Navigation rules:
- No hidden critical destinations.
- Active states must be obvious.
- Mobile navigation must preserve the same information architecture.
- External destinations must be visually distinguishable where appropriate.

## 6. Buttons and calls to action

Each viewport should have a clear primary action when an action is appropriate.

- Red: primary/high-intent action.
- Blue: secondary or institutional action.
- Gold: accent or low-frequency emphasis; not the default button colour.
- Text links: tertiary navigation and editorial actions.

Button labels must describe the outcome: “Support the Foundation”, “See Our Impact”, “Explore Our Work”. Avoid vague labels such as “Click Here”.

Never use multiple competing primary CTAs in the same section.

## 7. Cards

Cards must earn their borders. Prefer open layouts, imagery, spacing and typography before adding heavy shadows or outlines.

Programme/story cards should normally contain:
- category
- title
- concise description
- relevant image or visual cue
- outcome/action

Do not make every card visually identical if the content hierarchy differs.

## 8. Photography

Photography is evidence of people and impact, not decoration.

- Prioritise dignity, authenticity and context.
- Avoid exploitative imagery, exaggerated emotional manipulation or generic stock-photo expressions.
- Show people participating, learning, playing, contributing and benefiting.
- Preserve natural skin tones and realistic environments.
- Use consistent image ratios within repeated components.
- Apply overlays only when necessary for legibility.

## 9. Motion and interaction

Motion should clarify state, hierarchy or continuity.

Approved patterns:
- subtle reveal on scroll
- restrained hover elevation or border transition
- image scale on card hover
- navigation state transitions
- count-up statistics when entering the viewport
- smooth anchor scrolling

Avoid:
- constant floating animation
- excessive parallax
- long entrance delays
- decorative motion that competes with content
- motion that causes layout shift

Respect `prefers-reduced-motion`.

## 10. Accessibility

Accessibility is a product requirement, not a visual enhancement.

- Maintain WCAG-conscious contrast.
- Never communicate meaning through colour alone.
- All interactive controls require visible focus states.
- Images require meaningful alternative text where informative.
- Decorative images should be ignored by assistive technology.
- Keyboard navigation must cover every interactive path.
- Touch targets should be comfortably tappable on mobile.
- Form fields require persistent labels and useful validation messages.

## 11. Forms and lead capture

Forms should minimise friction while collecting only information that has a clear purpose.

Rules:
- Group related fields.
- Use plain-language labels.
- Explain why sensitive or non-obvious information is requested.
- Validate inline.
- Preserve entered values after recoverable errors.
- Give an explicit success state and explain what happens next.
- Never rely on colour alone for validation.

## 12. Trust and evidence

REFI is a foundation; credibility must be visible in the interface.

Where claims are made, prefer:
- measurable impact
- programme dates
- locations
- beneficiaries reached
- partner information
- documented stories
- transparent methodology

Avoid unsupported superlatives such as “world-class” or “life-changing” unless substantiated.

## 13. Responsive behaviour

Design from content constraints rather than device screenshots.

Mobile rules:
- Preserve hierarchy, not desktop geometry.
- Reduce navigation complexity without removing critical destinations.
- Keep primary actions reachable.
- Avoid tiny text and compressed cards.
- Never require horizontal scrolling for ordinary page content.
- Stack complex grids when comprehension would otherwise suffer.

## 14. Performance UX

- Optimise images before delivery.
- Prefer modern responsive image formats.
- Lazy-load below-the-fold media where appropriate.
- Avoid unnecessary client-side JavaScript.
- Prevent layout shift by reserving media dimensions.
- Keep above-the-fold content fast and stable.
- Animation must never become a performance dependency.

## 15. Empty, loading and error states

Every dynamic experience must define:
- loading state
- empty state
- success state
- recoverable error state
- unavailable/failure state

States should explain what happened and what the user can do next.

## 16. Forms of trust

Use consistent trust cues:
- clear organisation identity
- transparent contact information
- programme/location details
- partner or supporter information where appropriate
- privacy expectations around forms
- clear donation/support flows

Do not manufacture trust with badges, fake counters, fake testimonials or decorative certification marks.

## 17. Content and language

REFI communication should be:
- human
- direct
- respectful
- specific
- evidence-led
- optimistic without exaggeration

Prefer active voice. Avoid institutional jargon when a simpler phrase communicates the same idea.

## 18. Component governance

All reusable components must consume the REFI token system. Components must not introduce arbitrary colour values, inconsistent spacing, random border radii or one-off interaction patterns.

New patterns should be added to the design system before being duplicated across pages.

## 19. Page-level rule

A page is considered complete only when its visual hierarchy, content hierarchy, responsive behaviour, accessibility, interaction states and performance behaviour have all been considered.

**REFI standard:** every interface element must either improve understanding, establish trust, demonstrate evidence or enable action. If it does none of these, remove it.
