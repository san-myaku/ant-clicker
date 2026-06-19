# Nest Realism Roadmap

This document tracks the visual realism pass for the ant nest cross-section.
It is separate from the older mesh-structure F1/F2/F3 naming. In discussion and
handoffs, call these phases "nest realism F1-F6" to avoid ambiguity.

## Current Status

| Phase | Progress | Status |
| --- | ---: | --- |
| F1: Soil cross-section density | 70-80% | Pebbles, soil grains, fine roots, clods, surface grass, depth gradient, and static-cache rendering are in. Moisture variation and stronger layer differences still need work. |
| F2: Dug chamber interiors | 75-80% | Shared chamber floor texture, bowl lighting, foreground rims, gritty rim chips, ceiling-collapse shadow, compacted floor highlight, and scuffs are in. Remaining work is visual tuning against real-device screenshots. |
| F3: Natural passage carving | 50-60% | Darker walls, brighter center, tunnel-mouth contact shadow/pebbles, and room-connection fixes are in. Irregular passage edges are still too tube-like. |
| F4: Inventory piles | 25-35% | Food/eggs/larvae/waste are drawn as particles, but not yet as floor-integrated piles with depth shading. |
| F5: Ant integration | 35-45% | Foreground room rims mask some ant spill. Tunnel ants still need smaller/darker silhouettes and stronger clipping/rim treatment. |
| F6: UI pass | 0% | Keep HUD/glass UI for later after the nest body is stable. |

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

## F4: Inventory Piles

- Draw food, eggs, larvae, and waste as floor piles rather than evenly scattered dots.
- Add contact shadows per particle.
- Darken back particles and brighten front particles so the pile sits on the chamber floor.

## F5: Ant Integration

- Strengthen the foreground rim layer so ants inside rooms tuck under the lip.
- Draw ants on passages slightly smaller and closer to black silhouettes.
- Prefer clipping/rims over coordinate changes when ants appear outside walls or rooms.

## F6: UI Last

- The dark glass HUD direction is attractive, but leave UI until the nest body is closer.
- Touching UI at the same time makes visual comparison harder.

## Suggested Implementation Order

1. Finish F2 chamber rim, chips, and ceiling/floor contrast.
2. Finish F3 passage edge irregularity and mouth blending.
3. Move to F4 inventory piles once the floor and passage treatment is stable.
4. Revisit F5 ant integration after the rims and passages have their final silhouettes.
5. Keep F6 out of scope until the nest body is visually coherent.
