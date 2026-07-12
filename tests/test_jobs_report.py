import unittest

from tools.jobs_report import load_results, normalize, render


class TestLoadResults(unittest.TestCase):
    def test_envelope_and_bare_array(self):
        env = '{"meta": {"count": 1}, "results": [{"title": "A"}]}'
        bare = '[{"title": "B"}]'
        self.assertEqual(load_results(env, "f")[0]["title"], "A")
        self.assertEqual(load_results(bare, "f")[0]["title"], "B")

    def test_tags_source(self):
        rows = load_results('[{"title": "A"}]', "sweep.json")
        self.assertEqual(rows[0]["_source"], "sweep.json")

    def test_invalid_json_exits(self):
        with self.assertRaises(SystemExit):
            load_results("not json", "f")

    def test_wrong_shape_exits(self):
        with self.assertRaises(SystemExit):
            load_results('{"jobs": []}', "f")


class TestNormalize(unittest.TestCase):
    def test_ats_shape(self):
        j = normalize(
            {
                "title": "Engineer",
                "company": "Linear",
                "location": "Europe",
                "date": "2026-07-02T21:22:13.865+00:00",
                "remote": True,
                "url": "https://x",
                "ats": "ashby",
                "department": "Eng",
            }
        )
        self.assertEqual(j["date"], "2026-07-02")
        self.assertEqual(j["source"], "ashby")
        self.assertEqual(j["extra"], "Eng")
        self.assertTrue(j["remote"])

    def test_hn_shape_falls_back_to_header_and_no_date(self):
        j = normalize({"header": "Acme | Senior Dev | Remote", "company": "Acme", "remote": True, "_source": "hn.json"})
        self.assertEqual(j["title"], "Acme | Senior Dev | Remote")
        self.assertEqual(j["date"], "")
        self.assertEqual(j["source"], "hn")

    def test_work_mode_maps_to_remote(self):
        self.assertTrue(normalize({"title": "X", "work_mode": "remote"})["remote"])
        self.assertFalse(normalize({"title": "X", "work_mode": "hybrid"})["remote"])
        self.assertIsNone(normalize({"title": "X"})["remote"])


class TestRender(unittest.TestCase):
    def test_escapes_html_in_fields(self):
        jobs = [normalize({"title": "<script>alert(1)</script>", "company": "A&B", "url": "https://x"})]
        out = render(jobs, "T")
        self.assertNotIn("<script>alert", out)
        self.assertIn("&lt;script&gt;", out)
        self.assertIn("A&amp;B", out)

    def test_row_count_matches(self):
        jobs = [normalize({"title": f"J{i}", "url": ""}) for i in range(3)]
        out = render(jobs, "T")
        self.assertEqual(out.count("<tr>") - 1, 3)  # minus the header row


if __name__ == "__main__":
    unittest.main()
