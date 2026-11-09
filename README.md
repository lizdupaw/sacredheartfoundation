# Sacred Heart Foundation — Homepage Prototype

Clickable HTML prototype of the Sacred Heart Foundation homepage, built from the Figma file
"Sacred Heart Foundation Website" (frame `SHF - Homepage`) and the "SHF Content Doc" (tab *COMPLETE Home*).

## What's here

| Path | What it is |
|---|---|
| `site/` | **v2 (current)** — the homepage plus the motion layer |
| `site/index.html` | Page markup, layout styles and interactions (slider, forms, modals, trust-bar counter) |
| `site/motion.css`, `site/motion.js` | v2 motion layer: hero zoom + word-by-word headline, petal/flower motion, Share Your Story reveal, section fade-ups, story-card hovers, drifting Donor Voices strip, heartbeat mark |
| `site/assets/` | Images and SVGs exported from Figma |
| `drafts/v1-first-draft/` | **v1** — the approved first draft, frozen for comparison |

## Run it locally

Any static server works. From the repo root:

```bash
python3 -m http.server 5173 --directory site
```

Then open http://localhost:5173.

## How the layout scales

The desktop layout is built 1:1 in Figma pixels (1920 frame). From 1200px wide and up, the page is
scaled with CSS `zoom` (window width ÷ 2240) so the 1920 design sits centred with side margins and
keeps Figma's proportions on any screen. Below 1200px a fluid, stacked layout takes over.

## Notes

- Visitors with "reduce motion" turned on get a static page (no animation, quotes as cards).
- Nav items and most links point to pages that aren't built yet; clicking them shows a notice.
- Forms are front-end only (validation and confirmation messages); nothing is submitted.
- Hero body copy, story cards and donor quotes are placeholder text.
- Photos are stock images from the design file; check licensing before any public launch.
