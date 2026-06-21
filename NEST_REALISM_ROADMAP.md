# Nest Realism Roadmap

This document tracks the visual realism pass for the ant nest cross-section.
It is separate from the older mesh-structure F1/F2/F3 naming. In discussion and
handoffs, call these phases "nest realism F1-F6" to avoid ambiguity.

## Current Status

| Phase | Progress | Status |
| --- | ---: | --- |
| F1: Soil cross-section density | 70-80% | Pebbles, soil grains, fine roots, clods, surface grass, depth gradient, and static-cache rendering are in. Moisture variation and stronger layer differences still need work. |
| F2: Dug chamber interiors | 75-80% | Shared chamber floor texture, bowl lighting, foreground rims, gritty rim chips, ceiling-collapse shadow, compacted floor highlight, and scuffs are in. Remaining work is visual tuning against real-device screenshots. |
| F3: Natural passage carving | 65-70% | Darker walls, brighter center, tunnel-mouth contact shadow/pebbles, room-connection fixes, and deterministic wall scrape/crumb marks are in. Remaining work is stronger silhouette irregularity if screenshots still read too tube-like. |
| F4: Inventory piles | 50-60% | Food/eggs/larvae/waste now render as floor-integrated piles with mound bases, contact shadows, and back/front depth shading. Remaining work is screenshot tuning of pile density and scale. |
| F5: Ant integration | 60-70% | Tunnel ants now draw smaller/darker across vector, sprite, dot, and crowd modes, and the foreground room rim has stronger lower occlusion. Remaining work is screenshot tuning for over-dark passages or over-heavy rims. |
| F5.5: Surface raster layer | 25-35% | The heavy procedural surface pass was reverted. Surface detail now uses two raster tiles: a static cached cut-face cap and a transparent horizon/grass strip. Remaining work is art tuning of the PNGs, not more per-frame object drawing. |
| F6: UI pass | 35-45% | First glass HUD pass is in: darker translucent side panel, stronger resource tiles, segmented icon tabs, glass cards/buttons, and unified dock/list styling. Remaining work is screenshot tuning and any larger layout changes such as a separate bottom command dock. |

## F1: Soil Cross-Section Density

- Add small stones, soil grains, roots, moisture blotches, and layer differences to the underground background.
- Add grass, dead leaves, twigs, and dangling roots at the surface.
- Make deeper layers darker and cooler.
- Keep this work baked into the `S._soilLayerCvs` static cache path.

## F2: Dug Chamber Interiors

- Make the chamber front rim thicker and more like rough, granular soil.
- Make the ceiling side read as collapsed/shadowed.
- Make the floor side read as brighter, compacted, walked-on soil.
- Keep the current ellipse/lens chamber language, but add chips, crumbs, and local unevenness to the outline.

Current implementation notes:

- `drawRoomInteriorRealism()` bakes ceiling shadow, compacted floor light, scuffs, and top crumble into the static soil layer.
- `drawRoomRimChips()` adds deterministic chipped/darkened rim marks without changing room geometry or save data.
- `drawRoomSoilLip()` remains the main rim/lip renderer and now owns the chipped edge marks so the effect does not double-stack.

## F3: Natural Passage Carving

- Make passage edges less uniform so they do not read as smooth tubes.
- Add collapsed soil, pebbles, and contact shadow at chamber mouths.
- Keep passage centers slightly brighter and walls darker.

Current implementation notes:

- `drawPassageCarveMarks()` bakes deterministic wall-side scrape marks, tiny crumbs, and subtle center scuffs into the static soil layer.
- The passage graph, pathfinding, and save data are unchanged; this is visual-only and runs through the cached nest soil layer.

## F4: Inventory Piles

- Draw food, eggs, larvae, and waste as floor piles rather than evenly scattered dots.
- Add contact shadows per particle.
- Darken back particles and brighten front particles so the pile sits on the chamber floor.

Current implementation notes:

- `getRoomPileAnchor()` and `buildInventoryPileItems()` convert existing visual slots into deterministic floor-biased pile positions; inventory counts and save data are unchanged.
- `drawInventoryPileBase()` adds a clipped mound shadow/highlight under each pile type.
- Food uses the same `drawFoodSeedGrain()` visual as carried food; waste now uses `drawWastePebbleGrain()` instead of flat dark dots.

## F5: Ant Integration

- Strengthen the foreground rim layer so ants inside rooms tuck under the lip.
- Draw ants on passages slightly smaller and closer to black silhouettes.
- Prefer clipping/rims over coordinate changes when ants appear outside walls or rooms.

Current implementation notes:

- `getAntDrawProfile()` applies draw-only tunnel styling for action ants; movement/path coordinates remain unchanged.
- `getCrowdAntDrawProfile()` applies the same smaller black-silhouette treatment to `crowdSprite` passage ants.
- `drawRoomForegroundRims()` now extends the lower foreground occlusion band so room ants tuck farther under the chamber lip.

## F5.5: Surface Raster Layer

- Use image assets for the surface treatment instead of growing the procedural grass/root/debris system.
- Keep the cut-face texture in the static soil cache so chamber and tunnel cutouts remove it; this avoids tinting the queen chamber.
- Keep the above-ground silhouette as a transparent image strip so the horizon can be tuned in one bitmap.

Current implementation notes:

- `surface-cut-cap-tile-v1.png` is drawn by `drawSurfaceCutTexture()` inside `drawStaticNestSoilLayer()` before cavity cutouts.
- `surface-horizon-tile-v1.png` is drawn by `drawSurfaceHorizonTexture()` after sky rendering and before soil rendering.
- The prior F5.5 procedural arrays for extra surface grains, root mats, and background growth were reverted because they were heavier and harder to art-direct.

## F6: UI Last

- The dark glass HUD direction is now applied as a first pass.
- Keep later UI work focused on screenshot tuning and layout ergonomics.

Current implementation notes:

- The F6 CSS pass keeps the existing DOM and game logic intact.
- `#side-pane`, `#top-bar`, `#control-panel`, resource boxes, tabs, cards, dock items, and ant rows now share a darker translucent glass material.
- Control tabs now read as a segmented icon navigation without moving the existing tab system.

## Suggested Implementation Order

1. Finish F2 chamber rim, chips, and ceiling/floor contrast.
2. Finish F3 passage edge irregularity and mouth blending.
3. Move to F4 inventory piles once the floor and passage treatment is stable.
4. Revisit F5 ant integration after the rims and passages have their final silhouettes.
5. Tune F5.5 raster surface assets before HUD changes.
6. Keep F6 out of scope until the nest body is visually coherent.
