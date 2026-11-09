import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("export_osm_buildings", ROOT / "scripts/export_osm_buildings.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class StaticAtlasTests(unittest.TestCase):
    def test_required_static_files(self):
        for name in ("index.html", "styles.css", "app.js", ".nojekyll", ".github/workflows/validate.yml"):
            self.assertTrue((ROOT / name).is_file(), name)

    def test_bootstrap_has_bounded_loading_and_basic_map(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        bootstrap = (ROOT / "bootstrap.js").read_text(encoding="utf-8")
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn('src="./bootstrap.js?v=0.2.1"', html)
        self.assertIn("import('./app.js?v=0.2.1')", bootstrap)
        self.assertIn("setTimeout(() => useFallback(", bootstrap)
        self.assertIn("openstreetmap.org/export/embed.html", bootstrap)
        self.assertIn("window.tehranAtlasReady?.()", app)
        self.assertIn("window.tehranAtlasFallback?.(", app)

    def test_source_registry_json(self):
        data = json.loads((ROOT / "data/sources.json").read_text())
        self.assertTrue(any(s["name"] == "OpenStreetMap" for s in data["sources"]))
        self.assertEqual(data["fallbacks"]["building_render_height_m"], 9)

    def test_small_bbox_accepted(self):
        self.assertEqual(mod.parse_bbox("35.708,51.351,35.720,51.367"), (35.708, 51.351, 35.720, 51.367))

    def test_citywide_bbox_refused_for_public_overpass(self):
        with self.assertRaises(ValueError):
            mod.parse_bbox("35.45,50.90,35.95,51.75")

    def test_osm_closed_polygon(self):
        way = {"type": "way", "id": 123, "tags": {"building": "yes", "building:levels": "3"}, "geometry": [
            {"lat": 35.71, "lon": 51.36}, {"lat": 35.71, "lon": 51.361},
            {"lat": 35.711, "lon": 51.361}, {"lat": 35.711, "lon": 51.36}
        ]}
        feature = mod.to_feature(way)
        self.assertEqual(feature["geometry"]["coordinates"][0][0], feature["geometry"]["coordinates"][0][-1])
        self.assertEqual(feature["properties"]["levels"], "3")

    def test_no_arbitrary_unmapped_geometry(self):
        self.assertIsNone(mod.to_feature({"type": "way", "id": 456, "tags": {"building": "yes"}, "geometry": []}))


if __name__ == "__main__":
    unittest.main()
