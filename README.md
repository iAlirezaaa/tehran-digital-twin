# Tehran Digital Twin / اطلس دیجیتال تهران

A streaming, **whole-city** browser atlas for Tehran. Built with [MapLibre GL JS](https://maplibre.org/), [OpenFreeMap](https://openfreemap.org/) vector tiles and optional open terrain elevation (Mapzen/AWS). The initial release is an **exploration and visualization layer**, **not** a survey-grade complete 3D reconstruction.

## Features in v0.1

- Citywide map of Tehran, streaming OpenStreetMap-derived roads, buildings and local map detail as needed (no monolithic GeoJSON download).
- 3D building extrusion when zoomed to level 15 or higher; source attribute `render_height` when available, otherwise an explicit **9 m visual fallback**. This is *not verified building height*.
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

## Publish to GitHub Pages

1. Create public repo `iAlirezaaa/tehran-digital-twin` with **no initial README**.
2. In this folder:

```sh
git init
git add .
git commit -m "feat: initial Tehran citywide streaming 3D atlas"
git branch -M main
git remote add origin https://github.com/iAlirezaaa/tehran-digital-twin.git
git push -u origin main
```

3. Open **Settings → Pages → Build and deployment → Source: GitHub Actions**. The included `.github/workflows/pages.yml` will deploy the static app on main pushes.
4. Check the workflow in **Actions** and open the published `github.io` URL. Deployment isn't automatic until Pages is enabled for the repo.

If the repo exists already, don't overwrite its files blindly: inspect it first.

## Current data architecture

| Layer | Provider | Accuracy / limits |
|---|---|---|
| Roads, footprints, parks, labels | OpenFreeMap planet vector tiles derived from OpenStreetMap | OSM completeness varies by area |
| Building extrusion | OpenFreeMap building vector layer (`render_height`) | Not always measured; missing heights use 9 m fallback |
| Terrain | Mapzen/AWS Terrarium DEM | Regional DEM resolution, not detailed city mesh |
| Place search | OpenStreetMap Nominatim (submit only; no autocomplete) | Public service with usage limits |

### A note about Nominatim

The public endpoint is used **only** on a form submit, not on every keystroke. Please follow [the Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) before public high-traffic use. For production scale, self-host or use a provider with a usage agreement.

## Next milestones

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for acquisition, validation, geometry, instancing, terrain LOD, performance and city blocks. `scripts/` includes an *optional, bounded* Overpass building downloader for development snapshots, not an instruction to hammer the entire city API.

## Credits and license

- Map rendering: MapLibre GL JS — BSD-3-Clause.
- OpenFreeMap — vector basemap; OpenStreetMap data © contributors / ODbL (attribution present on map).
- Elevation: Mapzen Terrain Tiles / AWS Open Data. Per-input DEM credits apply; follow original upstream terms.
- Place search: OpenStreetMap Nominatim. Follow OSMF usage policy.
- Application source: MIT License. This does not relicense third-party geographic datasets.

### One-command creation (with GitHub CLI)

If you have [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`), this script can **create the new repository**, push the project and attempt to enable Pages:

```sh
python scripts/publish_github.py
```

It refuses to overwrite an existing repository. Check **Actions → Deploy Tehran Atlas to GitHub Pages** before assuming the public URL is live.

## Testing

```sh
python -m unittest discover -s tests -v
node --check app.js
```
