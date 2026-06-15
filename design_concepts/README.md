# Product Design UI Concepts

These boards were generated to emulate the requested Product Design-style flow for the existing single-file Ant Colony app.

## Concept Boards

- `concept-a-refined-dark.png` - selected direction; keeps the current dark game UI and makes HUD, panels, tabs, and dock cards feel more polished.
- `concept-b-naturalist.png` - field-guide and underground ecosystem direction.
- `concept-c-dashboard.png` - colony operations dashboard direction.
- `research-tree-clean-radial-concept.png` - first clean radial research-tree direction with reduced map clutter and a side inspector.
- `research-tree-spiderweb-queen-link-concept.png` - selected research-tree direction; keeps the spiderweb growth feeling and adds Queen-level gates.
- `research-tree-mobile-spiderweb-concept.png` - mobile layout direction with a pannable web map and bottom-sheet research/Queen progression.

## Implemented Direction

The applied UI refresh follows Concept A. It is intentionally CSS-centered:

- No save-data, localStorage, `G` / `S`, or canvas-rendering changes.
- Existing `#top-bar`, `#control-panel`, `#control-tabs`, and `#upgradeDock` structure is preserved.
- UI labels remain the current in-app labels; generated-image text is only visual reference.
