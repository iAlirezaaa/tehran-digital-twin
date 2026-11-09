# Tehran Digital Twin / اطلس دیجیتال تهران

A streaming, **whole-city** browser atlas for Tehran. Built with [MapLibre GL JS](https://maplibre.org/), [OpenFreeMap](https://openfreemap.org/) vector tiles and optional open terrain elevation (Mapzen/AWS). The initial release is an **exploration and visualization layer**, **not** a survey-grade complete 3D reconstruction.

## Features in v0.3

- Citywide map of Tehran, streaming OpenStreetMap-derived roads, buildings and local map detail as needed (no monolithic GeoJSON download).
- **3D-first entry:** opens Sattarkhan in a pitched zoom-16.1 map, with one-click 3D camera recovery; the Home control still offers a whole-city 2D overview.
- **Visible-area explorer:** categorizes available building footprints, land-use polygons (e.g. residential/commercial/industrial) and local POIs (schools, hospitals, shops, parks, transport) in the current view. Click named places to move the camera.
- **Feature inspection:** click the map to inspect locally available feature labels and tags, and click extruded building polygons for their rendering height metadata. All figures are approximate and restricted to vector tiles presently loaded.
- **Resilience:** load the primary MapLibre CDN with a second CDN fallback and show a basic OSM iframe when 3D resources cannot be reached; 2D iframe mode does not provide 3D or land-use explorer.

- 3D building extrusion from zoom 15 upward; uses the OpenMapTiles `render_height` field when available and a **9 m visual placeholder** when no suitable height exists. Tile `render_height` itself is **an estimate** based on OSM information, not survey-grade measurement.
- Optional 3D terrain from Mapzen Terrarium DEM tiles, at 1× vertical scale.
- Day/night styles, eight preset Tehran places, Persian RTL interface, manual Nominatim geocoding, link sharing, per-feature inspection, responsive layout.
- No API key, backend, build step or per-visitor geolocation required.

> **Important distinction:** Covering all of Tehran with *a map* is not the same as having an accurate building-by-building model. Footprints, floors, heights, facades, interiors and licenses need per-dataset provenance and later validation. Do **not** present visual fallbacks as measured heights.

## Live site (after publication)

`https://iAlirezaaa.github.io/tehran-digital-twin/`

This address only works **after** creating the repository, committing these files and enabling GitHub Pages. It is not claimed to be live until verified.

## Local preview

```sh
python3 -m http.server 8080
```

Then visit http://localhost:8080 . Internet connectivity is required for remote vector tiles, elevation tiles, fonts and MapLibre.

## Publish to GitHub Pages (one-time configuration)

The repository is **already created and populated** at [`iAlirezaaa/tehran-digital-twin`](https://github.com/iAlirezaaa/tehran-digital-twin). The app is static; no build step or API keys are needed.

1. Open [Repository Settings → Pages](https://github.com/iAlirezaaa/tehran-digital-twin/settings/pages).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose **Branch: `main`**, **Folder: `/(root)`**, then press **Save**.
4. After GitHub confirms a successful Pages deployment, open **https://ialirezaaa.github.io/tehran-digital-twin/**.

GitHub Pages is currently enabled and has published successfully on the main branch. The separate validation workflow checks Python and JavaScript syntax. Publishing a new commit triggers another Pages deployment. If the JS engine or basemap service is blocked in a visitor's network, a basic OpenStreetMap iframe appears instead of a permanently blocked loading spinner.

## Current data architecture

| Layer | Provider | Accuracy / limits |
|---|---|---|
| Roads, footprints, parks, labels | OpenFreeMap planet vector tiles derived from OpenStreetMap | OSM completeness varies by area |
| Building extrusion | OpenFreeMap building vector layer (`render_height`) | Not always measured; missing heights use 9 m fallback |
| Terrain | Mapzen/AWS Terrarium DEM | Regional DEM resolution, not detailed city mesh |
| Place search | OpenStreetMap Nominatim (submit only; no autocomplete) | Public service with usage limits |

### A note about Nominatim

The public endpoint is used **only** on a form submit, not on every keystroke. Please follow [the Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) before public high-traffic use. For production scale, self-host or use a provider with a usage agreement.

## Known limitations

- Coverage follows the OpenStreetMap-derived tile data, not complete municipal cadastral records. Individual parcels or building structures may be missing or inaccurate.
- This viewer displays the **currently visible viewport**, not official counts of all structures or POIs in a neighborhood. Counts are approximate and can duplicate multi-part objects.
- OSM vector building layers typically provide *rendering heights* but not a verified floor count or faithful building facades.
- OpenMapTiles `landuse` describes polygons and cannot be used to calculate area by simply counting features. POI classifications represent tagged map features, not an exhaustive business registry.
- Some external domains may be blocked or slow; 3D requires WebGL and third-party map tiles.

## Next milestones

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for acquisition, validation, geometry, instancing, terrain LOD, performance and city blocks. `scripts/` includes an *optional, bounded* Overpass building downloader for development snapshots, not an instruction to hammer the entire city API.

## Credits and license

- Map rendering: MapLibre GL JS — BSD-3-Clause.
- OpenFreeMap — vector basemap; OpenStreetMap data © contributors / ODbL (attribution present on map).
- Elevation: Mapzen Terrain Tiles / AWS Open Data. Per-input DEM credits apply; follow original upstream terms.
- Place search: OpenStreetMap Nominatim. Follow OSMF usage policy.
- Application source: MIT License. This does not relicense third-party geographic datasets.

## Testing

```sh
python -m unittest discover -s tests -v
node --check app.js
```
