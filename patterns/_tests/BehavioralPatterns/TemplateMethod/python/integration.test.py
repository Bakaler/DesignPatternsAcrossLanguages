# ============================================================
#  Integration Tests - Template Method: Data Pipeline
#
#  What we test here:
#    · Full run() produces correct end-to-end output per pipeline
#    · CSV: validate catches missing name, report shows warning
#    · JSON: nested keys appear flattened, no errors reported
#    · XML: coerced types appear in load output, no errors reported
#    · All pipelines use the same step labels (shared skeleton)
#    · Hook override works end-to-end
#    · Concrete steps (_validate, _load) produce identical output
#      regardless of which pipeline runs them
#
#  Run: pytest integration.test.py -v
# ============================================================

import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__),
                                '../../../../BehavioralPatterns/TemplateMethod/python'))
from python import DataPipeline, CsvPipeline, JsonPipeline, XmlPipeline


def capture(fn):
    buf = io.StringIO()
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = sys.__stdout__
    return buf.getvalue().splitlines()


# ── CSV full run ──────────────────────────────────────────────
class TestCsvFullRun:
    def setup_method(self):
        self.lines = capture(lambda: CsvPipeline().run())
        self.out = "\n".join(self.lines)

    def test_all_five_step_labels_present(self):
        assert "[Extract]"   in self.out
        assert "[Transform]" in self.out
        assert "[Validate]"  in self.out
        assert "[Load]"      in self.out
        assert "[Report]"    in self.out

    def test_extract_reports_correct_count(self):
        assert any("3 raw rows" in l for l in self.lines)

    def test_validate_catches_missing_name(self):
        assert any("1 error(s)" in l for l in self.lines)

    def test_report_shows_warning_for_missing_name(self):
        assert any("⚠" in l and "name" in l for l in self.lines)

    def test_alice_and_bob_appear_in_load(self):
        assert any("Alice" in l for l in self.lines)
        assert any("Bob" in l for l in self.lines)

    def test_whitespace_trimmed_in_output(self):
        # Bob was "  Bob  " in source - should appear as "Bob"
        assert "  Bob  " not in self.out
        assert "Bob" in self.out


# ── JSON full run ─────────────────────────────────────────────
class TestJsonFullRun:
    def setup_method(self):
        self.lines = capture(lambda: JsonPipeline().run())
        self.out = "\n".join(self.lines)

    def test_all_five_step_labels_present(self):
        for label in ["[Extract]", "[Transform]", "[Validate]", "[Load]", "[Report]"]:
            assert label in self.out

    def test_no_validation_errors(self):
        assert any("0 error(s)" in l for l in self.lines)

    def test_report_shows_no_issues(self):
        assert "No issues." in self.out

    def test_nested_key_flattened_in_output(self):
        # meta.role should appear as meta_role in load output
        assert "meta_role" in self.out

    def test_coerced_age_in_output(self):
        # age was "31" string - loads as 31 int
        assert "age:31" in self.out

    def test_all_three_names_in_output(self):
        for name in ["Dave", "Eve", "Frank"]:
            assert name in self.out


# ── XML full run ──────────────────────────────────────────────
class TestXmlFullRun:
    def setup_method(self):
        self.lines = capture(lambda: XmlPipeline().run())
        self.out = "\n".join(self.lines)

    def test_all_five_step_labels_present(self):
        for label in ["[Extract]", "[Transform]", "[Validate]", "[Load]", "[Report]"]:
            assert label in self.out

    def test_no_validation_errors(self):
        assert any("0 error(s)" in l for l in self.lines)

    def test_report_shows_no_issues(self):
        assert "No issues." in self.out

    def test_coerced_bool_in_output(self):
        assert "active:True"  in self.out
        assert "active:False" in self.out

    def test_coerced_float_in_output(self):
        assert "9.4" in self.out

    def test_all_three_names_in_output(self):
        for name in ["Grace", "Henry", "Isla"]:
            assert name in self.out


# ── Shared skeleton - same step labels across all pipelines ──
class TestSharedSkeleton:
    STEP_LABELS = ["[Extract]", "[Transform]", "[Validate]", "[Load]", "[Report]"]

    def _run(self, pipeline):
        return "\n".join(capture(lambda: pipeline.run()))

    def test_csv_and_json_share_same_step_labels(self):
        csv_out  = self._run(CsvPipeline())
        json_out = self._run(JsonPipeline())
        for label in self.STEP_LABELS:
            assert label in csv_out
            assert label in json_out

    def test_validate_output_format_identical_across_pipelines(self):
        """The validate line format is shared - only the counts differ."""
        def get_validate_line(out):
            return next((l for l in out.splitlines() if "[Validate]" in l), "")

        csv_v  = get_validate_line(self._run(CsvPipeline()))
        json_v = get_validate_line(self._run(JsonPipeline()))
        xml_v  = get_validate_line(self._run(XmlPipeline()))

        # All share "records checked" phrasing
        for line in [csv_v, json_v, xml_v]:
            assert "records checked" in line

    def test_extract_runs_before_transform_in_all_pipelines(self):
        for pipeline in [CsvPipeline(), JsonPipeline(), XmlPipeline()]:
            out = self._run(pipeline)
            extract_pos   = out.find("[Extract]")
            transform_pos = out.find("[Transform]")
            assert extract_pos < transform_pos, f"Failed for {pipeline.name}"

    def test_validate_runs_after_transform_in_all_pipelines(self):
        for pipeline in [CsvPipeline(), JsonPipeline(), XmlPipeline()]:
            out = self._run(pipeline)
            transform_pos = out.find("[Transform]")
            validate_pos  = out.find("[Validate]")
            assert transform_pos < validate_pos, f"Failed for {pipeline.name}"

    def test_load_runs_after_validate_in_all_pipelines(self):
        for pipeline in [CsvPipeline(), JsonPipeline(), XmlPipeline()]:
            out = self._run(pipeline)
            validate_pos = out.find("[Validate]")
            load_pos     = out.find("[Load]")
            assert validate_pos < load_pos, f"Failed for {pipeline.name}"

    def test_report_runs_last_in_all_pipelines(self):
        for pipeline in [CsvPipeline(), JsonPipeline(), XmlPipeline()]:
            out = self._run(pipeline)
            load_pos   = out.find("[Load]")
            report_pos = out.find("[Report]")
            assert load_pos < report_pos, f"Failed for {pipeline.name}"


# ── Hook override ─────────────────────────────────────────────
class TestHookOverride:
    def test_overriding_report_changes_only_last_step(self):
        class SilentCsv(CsvPipeline):
            def _report(self):
                print("  [Report]    suppressed")

        out = "\n".join(capture(lambda: SilentCsv().run()))
        assert "suppressed" in out
        assert "No issues." not in out
        assert "⚠" not in out
        # Other steps still run normally
        assert "[Extract]"   in out
        assert "[Validate]"  in out
        assert "[Load]"      in out
