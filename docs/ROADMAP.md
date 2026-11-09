# Roadmap — Tehran building-by-building digital reconstruction

## Principles

- **Entire city, progressive streaming**: tile/LOD by viewport; never load all footprints/meshes into browser memory.
- **Truthful geometry**: separate verified geometry, derived data, and visual placeholders. Per-building provenance and confidence.
- **No randomly placed buildings**: all geometry must have a geospatial source or be clearly labeled conceptual.
- **Performance**: vector tiles / 3D tiles, batching and instancing, spatial indexes and far-LOD impostors.
- **Reproducibility**: versioned sources, CRS handling and tests, deterministic imports and checksums.

## Phase 0 — Browser foundation (implemented)

- [x] Whole-city streaming Tehran OSM-derived basemap.
- [x] 3D extrusion from vector building layer at high zoom.
- [x] Terrain toggle using public DEM source.
- [x] RTL mobile UI, manual search, 8 place presets, link sharing and inspector.
- [x] GitHub Pages workflow and documentation.
- [ ] Deploy and verify on GitHub Pages. Requires repository creation / Pages configuration.

## Phase 1 — Ground-truth geography

- [ ] Get an authoritative municipal boundary and Tehran districts; preserve geometry with source and license.
- [ ] Download clipped OSM PBF from Geofabrik, process with osmium/pyrosm, validate road connectivity and building footprints.
- [ ] Compare OSM building footprints with Overture Maps buildings (monthly snapshots), dedupe by polygon overlap/IDs.
- [ ] Add land use, sidewalks, pedestrian crossings, junction topology, road widths and real curbside parking where tagged.
- [ ] Split production features to z/x/y or PMTiles; track completeness by district.

## Phase 2 — Building quality

- [ ] Ingest `height`, `min_height`, `building:levels`, roof type and building parts only where provided.
- [ ] Distinguish measured, derived and assumed heights with provenance badges.
- [ ] Add facades from legal, usable reference datasets with copyright/licensing audit.
- [ ] Generate footprints / facade procedural styles per block; 1–3 level LODs; no ungrounded "exact" claims.
- [ ] Model selected landmark buildings in greater detail and validate alignment.

## Phase 3 — Operational digital city

- [ ] Independent block streaming and deterministic mesh cache (GLB/3D Tiles), structure tree with 400+ agents optional.
- [ ] Terrain-aware roads, bridges, tunnels and underpasses; no floating buildings.
- [ ] Traffic lanes/turning paths and parking occupancy with explicit simulated-vs-real labels.
- [ ] QA via geospatial topology rules, height outlier checks, browser FPS/MB benchmarks and aerial alignment review.
- [ ] Non-photorealistic optional cinematic mode, independent of factual map.

## Completion definition

"Tehran completely reconstructed" requires **quantified** administrative coverage, building-by-building location/geometry and validated height/floors/facade coverage, plus an explicit dataset reference date. A citywide map alone does not fulfill that goal.
