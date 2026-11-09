#!/usr/bin/env python3
"""Download a SMALL, named OSM building block via public Overpass (not whole-city bulk extraction).

Example:
python scripts/export_osm_buildings.py --bbox 35.708,51.351,35.720,51.367 \
  --output data/examples/sattarkhan-buildings.geojson

For a full-city dataset, download a Geofabrik PBF and clip locally; do not
send many large Overpass requests to a public community instance.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OVERPASS = "https://overpass-api.de/api/interpreter"


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    try:
        south, west, north, east = [float(i.strip()) for i in raw.split(",")]
    except (ValueError, TypeError) as exc:
        raise ValueError("Use --bbox south,west,north,east") from exc
    if not (35.0 <= south < north <= 36.3 and 50.3 <= west < east <= 52.3):
        raise ValueError("The bbox must be a small area around Tehran")
    # Conservative public API protection: ~5 square km maximum.
    area_km2 = (north - south) * 111.32 * (east - west) * 90.0
    if area_km2 > 5:
        raise ValueError(f"Area {area_km2:.1f} km² is too large for public Overpass; download an OSM PBF instead")
    return south, west, north, east


def to_feature(way: dict) -> dict | None:
    points = way.get("geometry") or []
    if way.get("type") != "way" or len(points) < 4:
        return None
    vertices = [[p["lon"], p["lat"]] for p in points if "lon" in p and "lat" in p]
    if len(vertices) < 4:
        return None
    if vertices[0] != vertices[-1]:
        vertices.append(vertices[0])
    if len(set((x, y) for x, y in vertices[:-1])) < 3:
        return None
    tags = way.get("tags", {})
    if not tags.get("building"):
        return None
    return {
        "type": "Feature",
        "id": f"osm-way-{way['id']}",
        "geometry": {"type": "Polygon", "coordinates": [vertices]},
        "properties": {
            "osm_id": way["id"],
            "source": "OpenStreetMap Overpass API",
            "building": tags.get("building"),
            "height": tags.get("height"),
            "levels": tags.get("building:levels"),
            "roof:shape": tags.get("roof:shape"),
            "name": tags.get("name"),
        },
    }


def download(bbox: tuple[float, float, float, float]) -> dict:
    south, west, north, east = bbox
    query = (
        "[out:json][timeout:90];"
        f'(way["building"]({south},{west},{north},{east}););'
        "out geom;"
    )
    request = Request(
        OVERPASS,
        data=urlencode({"data": query}).encode("utf-8"),
        headers={"User-Agent": "TehranDigitalAtlas/0.1 (github.com/iAlirezaaa/tehran-digital-twin)", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        data = json.load(response)
    features = [f for element in data.get("elements", []) if (f := to_feature(element)) is not None]
    return {
        "type": "FeatureCollection",
        "properties": {"attribution": "© OpenStreetMap contributors / ODbL", "bounds": [west, south, east, north], "warnings": ["Only OSM ways are exported; building multipolygon relations are not supported by this prototype."]},
        "features": features,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bbox", required=True, help="Small block: south,west,north,east")
    parser.add_argument("--output", required=True, type=pathlib.Path)
    args = parser.parse_args()
    try:
        bbox = parse_bbox(args.bbox)
    except ValueError as exc:
        parser.error(str(exc))
    print(f"Retrieving a small block {bbox} from Overpass. Do not run in a rapid loop.")
    try:
        result = download(bbox)
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"Data request failed: {exc}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {len(result['features'])} way polygons to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
