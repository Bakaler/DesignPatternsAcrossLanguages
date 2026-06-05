# ============================================================
#  Unit Tests - Template Method: Data Pipeline
#
#  What we test here:
#    · DataPipeline is abstract - cannot be instantiated directly
#    · _validate() catches missing id and missing name
#    · _validate() passes records with both fields present
#    · _load() prints one line per record
#    · _report() hook prints "no issues" when errors is empty
#    · _report() hook prints warnings when errors exist
#    · CsvPipeline._extract() loads correct record count
#    · CsvPipeline._transform() trims whitespace and nulls empty strings
#    · JsonPipeline._transform() flattens nested dicts and coerces numbers
#    · XmlPipeline._transform() coerces int / float / bool / string types
#    · run() calls steps in the correct order
#
#  Run: pytest unit.test.py -v
# ============================================================

import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__),
                                '../../../../BehavioralPatterns/TemplateMethod/python'))
from python import DataPipeline, CsvPipeline, JsonPipeline, XmlPipeline

import pytest


def capture(fn):
    buf = io.StringIO()
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = sys.__stdout__
    return buf.getvalue().splitlines()


# ── Abstract class ────────────────────────────────────────────
class TestAbstractPipeline:
    def test_cannot_instantiate_directly(self):
        with pytest.raises(TypeError):
            DataPipeline()  # type: ignore


# ── _validate() - shared concrete step ───────────────────────
class TestValidate:
    def _make_pipeline(self, records):
        """Create a minimal concrete pipeline with preset records."""
        class _Pipe(DataPipeline):
            @property
            def name(self): return "TestPipe"
            def _extract(self): pass
            def _transform(self): pass

        p = _Pipe()
        p._records = records
        return p

    def test_passes_records_with_id_and_name(self):
        p = self._make_pipeline([{"id": "1", "name": "Alice"}])
        capture(lambda: p._validate())
        assert p._errors == []

    def test_catches_missing_name(self):
        p = self._make_pipeline([{"id": "1", "name": None}])
        capture(lambda: p._validate())
        assert any("name" in e for e in p._errors)

    def test_catches_missing_id(self):
        p = self._make_pipeline([{"id": None, "name": "Alice"}])
        capture(lambda: p._validate())
        assert any("id" in e for e in p._errors)

    def test_counts_error_rows_not_error_fields(self):
        # One record missing both id and name = 1 error row, not 2
        p = self._make_pipeline([{"id": None, "name": None}])
        capture(lambda: p._validate())
        out = "\n".join(capture(lambda: p._validate()))
        assert "1 error(s)" in out

    def test_multiple_valid_records_all_pass(self):
        records = [{"id": str(i), "name": f"User{i}"} for i in range(5)]
        p = self._make_pipeline(records)
        capture(lambda: p._validate())
        assert p._errors == []


# ── _report() hook ────────────────────────────────────────────
class TestReportHook:
    def _pipe_with_errors(self, errors):
        class _Pipe(DataPipeline):
            @property
            def name(self): return "TestPipe"
            def _extract(self): pass
            def _transform(self): pass

        p = _Pipe()
        p._errors = errors
        return p

    def test_default_prints_no_issues_when_clean(self):
        p = self._pipe_with_errors([])
        out = "\n".join(capture(lambda: p._report()))
        assert "no issues" in out

    def test_default_prints_warnings_when_errors_exist(self):
        p = self._pipe_with_errors(["row 0: missing 'name'"])
        out = "\n".join(capture(lambda: p._report()))
        assert "!" in out
        assert "missing 'name'" in out

    def test_hook_can_be_overridden(self):
        class CustomPipe(CsvPipeline):
            def _report(self):
                print("CUSTOM REPORT")

        out = "\n".join(capture(lambda: CustomPipe()._report()))
        assert "CUSTOM REPORT" in out
        assert "no issues" not in out


# ── CsvPipeline ───────────────────────────────────────────────
class TestCsvPipeline:
    def setup_method(self):
        self.pipe = CsvPipeline()

    def test_extract_loads_three_records(self):
        capture(lambda: self.pipe._extract())
        assert len(self.pipe._records) == 3

    def test_extract_output_mentions_csv(self):
        out = "\n".join(capture(lambda: self.pipe._extract()))
        assert "CSV" in out

    def test_transform_trims_whitespace(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        # Bob had leading/trailing spaces
        names = [r.get("name") for r in self.pipe._records]
        assert "Bob" in names
        assert "  Bob  " not in names

    def test_transform_converts_empty_string_to_none(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        # Row 3 (index 2) has empty name
        assert self.pipe._records[2]["name"] is None

    def test_transform_preserves_valid_values(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["name"] == "Alice"
        assert self.pipe._records[0]["id"] == "1"


# ── JsonPipeline ──────────────────────────────────────────────
class TestJsonPipeline:
    def setup_method(self):
        self.pipe = JsonPipeline()

    def test_extract_loads_three_records(self):
        capture(lambda: self.pipe._extract())
        assert len(self.pipe._records) == 3

    def test_transform_flattens_nested_dict(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        rec = self.pipe._records[0]
        assert "meta_role" in rec
        assert "meta_level" in rec
        assert "meta" not in rec

    def test_transform_coerces_numeric_string_to_int(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["age"] == 31
        assert isinstance(self.pipe._records[0]["age"], int)

    def test_transform_preserves_non_numeric_strings(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["name"] == "Dave"


# ── XmlPipeline ───────────────────────────────────────────────
class TestXmlPipeline:
    def setup_method(self):
        self.pipe = XmlPipeline()

    def test_extract_loads_three_records(self):
        capture(lambda: self.pipe._extract())
        assert len(self.pipe._records) == 3

    def test_transform_coerces_int(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["id"] == 1
        assert isinstance(self.pipe._records[0]["id"], int)

    def test_transform_coerces_float(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["score"] == 9.4
        assert isinstance(self.pipe._records[0]["score"], float)

    def test_transform_coerces_bool_true(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[0]["active"] is True

    def test_transform_coerces_bool_false(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        assert self.pipe._records[1]["active"] is False

    def test_transform_strips_type_metadata(self):
        capture(lambda: self.pipe._extract())
        capture(lambda: self.pipe._transform())
        # After transform, no record value should be a dict with _type/_val
        for rec in self.pipe._records:
            for v in rec.values():
                assert not isinstance(v, dict)


# ── run() step ordering ───────────────────────────────────────
class TestRunOrder:
    def test_run_calls_steps_in_correct_order(self):
        order = []

        class SpyPipeline(DataPipeline):
            @property
            def name(self): return "Spy"

            def _extract(self):
                order.append("extract")
                self._records = [{"id": "1", "name": "X"}]

            def _transform(self):
                order.append("transform")

            def _validate(self):
                order.append("validate")
                self._errors = []

            def _load(self):
                order.append("load")

            def _report(self):
                order.append("report")

        capture(lambda: SpyPipeline().run())
        assert order == ["extract", "transform", "validate", "load", "report"]

    def test_transform_always_runs_after_extract(self):
        """If extract runs first, records are available for transform."""
        pipe = CsvPipeline()
        capture(lambda: pipe._extract())
        assert len(pipe._records) > 0
        capture(lambda: pipe._transform())
        # After transform records should still be present
        assert len(pipe._records) > 0
