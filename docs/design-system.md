# REFI Foundation Design System

## Visual principle

REFI uses a **white-first institutional system**:

- **~70% white** — the canvas, whitespace, editorial content and most page surfaces.
- **~30% blue** — navigation, hero/impact sections, major structural blocks and institutional identity.
- **Gold/yellow** — warmth, achievement, statistics, section markers and restrained visual emphasis.
- **Red** — action, urgency, support/donation moments and selected programme states.
- **Dark text** — readable editorial copy and evidence-led communication.

The percentages are a **visual-dominance rule**, not a requirement to divide every page into literal colour blocks.

## Colour hierarchy

### White
Use as the default page canvas. Preserve generous negative space around mission statements, evidence, stories and programme information.

### Blue
Blue establishes REFI's institutional presence. Use the darkest blues for navigation, footer and major full-bleed sections; lighter blues for supporting surfaces and UI states.

### Gold
Gold should be a supporting accent, not a competing primary colour. Preferred applications: statistics, thin rules, labels, icons, section markers and meaningful highlights.

### Red
Red is intentionally rarer than gold. Reserve it for primary action, support/donation CTAs, urgent campaign messaging and selected programme indicators.

## Usage rules

1. Do not recreate the previous navy/gold-heavy visual direction.
2. Do not use blue, gold and red simultaneously in every component.
3. Do not use red as a general decorative colour.
4. Do not turn the 70/30 ratio into rigid horizontal colour bands.
5. Maintain WCAG-conscious contrast between text and surfaces.
6. Photography should remain dignity-first and documentary/editorial rather than stock-heavy or overly staged.
7. Colour should support hierarchy and meaning; it should not substitute for hierarchy.

## Token source

The canonical CSS variables live in `src/styles/tokens.css`. Components should consume semantic tokens where possible rather than hard-coding hex values.
