# ============================================================
#  Template Method: Data Pipeline
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Abstract Class   DataPipeline
#  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
#  Client           Entry point
#
#  Template method: DataPipeline.run()
#  ────────────────────────────────────────────────────────
#  _extract()   ← abstract    format-specific parsing
#  _transform() ← abstract    format-specific cleaning / shaping
#  _validate()  ← concrete    shared: checks id + name present
#  _load()      ← concrete    shared: prints formatted record table
#  _report()    ← hook        default "no issues"; override for custom warnings
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Code reuse          _validate() and _load() written once, used by all
#  ✓ Enforced sequence   run() is the skeleton; steps cannot be reordered
#  ✓ Hollywood principle base calls subclass, not the other way around
#  ✗ Inheritance lock    a new required step touches the base class
# ============================================================

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any
import csv
import io
import json
import xml.etree.ElementTree as ET

Record = dict[str, Any]


# SECTION:: Abstract Pipeline
# ═════════════════════════════════════════════════════════════
#  ABSTRACT CLASS: DataPipeline
# ═════════════════════════════════════════════════════════════
#  Defines the template method run() and the step contracts.
#  _extract() and _transform() are abstract; subclasses must implement them.
#  _validate() and _load() are concrete; written once and shared by all.
#  _report() is a hook with a default implementation; subclasses may override.

class DataPipeline(ABC):

    def __init__(self) -> None:
        self._records: list[Record] = []
        self._errors:  list[str]   = []

    @property
    @abstractmethod
    def name(self) -> str: ...

    # ── Template method ───────────────────────────────────────
    #  Final by convention. Do not override in subclasses.
    #  Defines the invariant sequence: extract → transform → validate → load → report

    def run(self) -> None:
        print(f"\n  Pipeline : {self.name}")
        print("  " + "─" * 52)
        self._extract()
        self._transform()
        self._validate()
        self._load()
        self._report()

    # ── Abstract steps ────────────────────────────────────────

    @abstractmethod
    def _extract(self) -> None:
        """Parse raw source data into self._records."""

    @abstractmethod
    def _transform(self) -> None:
        """Clean and reshape self._records in-place."""

    # ── Concrete steps ────────────────────────────────────────
    #  Shared logic; never overridden.

    def _validate(self) -> None:
        """Check every record has id and name. Collect errors."""
        self._errors = []
        error_rows: set[int] = set()
        for i, rec in enumerate(self._records):
            if not rec.get("id"):
                self._errors.append(f"row {i}: missing required field 'id'")
                error_rows.add(i)
            if not rec.get("name"):
                self._errors.append(f"row {i}: missing required field 'name'")
                error_rows.add(i)
        passed = len(self._records) - len(error_rows)
        print(f"  [Validate]  {len(self._records)} records checked: "
              f"{passed} passed, {len(error_rows)} error(s)")

    def _load(self) -> None:
        """Write all records to the (simulated) store."""
        print(f"  [Load]      writing {len(self._records)} record(s)")
        for rec in self._records:
            pairs = "  ".join(f"{k}:{v}" for k, v in rec.items())
            print(f"              {pairs}")

    # ── Hook ─────────────────────────────────────────────────
    #  Default implementation handles errors automatically.
    #  Subclasses may override to add custom post-run messaging.

    def _report(self) -> None:
        if self._errors:
            for err in self._errors:
                print(f"  [Report]  !  {err}")
        else:
            print("  [Report]    Pipeline complete. no issues.")


# SECTION:: CSV Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: CsvPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : parse comma-separated rows via csv.DictReader
#  transform: trim whitespace from all values; empty string → None

_CSV_SOURCE = """\
id,name,age,city
1,Alice,30,London
2,  Bob  ,25,  New York
3,,28,Paris
"""
# Row 3 has no name; will be caught by _validate()


class CsvPipeline(DataPipeline):

    @property
    def name(self) -> str:
        return "CSV Data Pipeline"

    def _extract(self) -> None:
        reader = csv.DictReader(io.StringIO(_CSV_SOURCE))
        self._records = [dict(row) for row in reader]
        print(f"  [Extract]   {len(self._records)} raw rows parsed from CSV source")

    def _transform(self) -> None:
        for rec in self._records:
            for key in list(rec.keys()):
                stripped = (rec[key] or "").strip()
                rec[key] = None if stripped == "" else stripped
        print("  [Transform] whitespace trimmed · empty strings → None")


# SECTION:: JSON Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: JsonPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : parse a JSON array into records
#  transform: flatten nested dicts (meta.role → meta_role)
#             coerce numeric strings to int or float

_JSON_SOURCE = """[
  {"id": 1, "name": "Dave",  "age": "31", "meta": {"role": "admin", "level": 3}},
  {"id": 2, "name": "Eve",   "age": "27", "meta": {"role": "user",  "level": 1}},
  {"id": 3, "name": "Frank", "age": "35", "meta": {"role": "mod",   "level": 2}}
]"""


class JsonPipeline(DataPipeline):

    @property
    def name(self) -> str:
        return "JSON Data Pipeline"

    def _extract(self) -> None:
        self._records = json.loads(_JSON_SOURCE)
        print(f"  [Extract]   {len(self._records)} objects parsed from JSON array")

    def _transform(self) -> None:
        def coerce(v: Any) -> Any:
            if not isinstance(v, str):
                return v
            try:
                return int(v)
            except ValueError:
                pass
            try:
                return float(v)
            except ValueError:
                return v

        flat: list[Record] = []
        for rec in self._records:
            out: Record = {}
            for k, v in rec.items():
                if isinstance(v, dict):
                    for nk, nv in v.items():
                        out[f"{k}_{nk}"] = nv
                else:
                    out[k] = coerce(v)
            flat.append(out)
        self._records = flat
        print("  [Transform] nested keys flattened · numeric strings coerced")


# SECTION:: XML Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: XmlPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : walk <record> elements into raw dicts, preserving type attr
#  transform: strip type attributes; coerce values to int / float / bool / str

_XML_SOURCE = """<records>
  <record>
    <id type="int">1</id>
    <name type="string">Grace</name>
    <active type="bool">true</active>
    <score type="float">9.4</score>
  </record>
  <record>
    <id type="int">2</id>
    <name type="string">Henry</name>
    <active type="bool">false</active>
    <score type="float">7.8</score>
  </record>
  <record>
    <id type="int">3</id>
    <name type="string">Isla</name>
    <active type="bool">true</active>
    <score type="float">8.9</score>
  </record>
</records>"""

_XML_COERCE: dict[str, Any] = {
    "int":    int,
    "float":  float,
    "bool":   lambda v: v.strip().lower() == "true",
    "string": str,
}


class XmlPipeline(DataPipeline):

    @property
    def name(self) -> str:
        return "XML Data Pipeline"

    def _extract(self) -> None:
        root = ET.fromstring(_XML_SOURCE)
        self._records = []
        for elem in root.findall("record"):
            rec: Record = {}
            for child in elem:
                # Preserve type attribute alongside value for _transform
                rec[child.tag] = {"_type": child.get("type", "string"),
                                  "_val":  child.text or ""}
            self._records.append(rec)
        print(f"  [Extract]   {len(self._records)} <record> elements parsed from XML")

    def _transform(self) -> None:
        for rec in self._records:
            for key in list(rec.keys()):
                meta = rec[key]
                typ  = meta["_type"]
                val  = meta["_val"]
                rec[key] = _XML_COERCE.get(typ, str)(val)
        print("  [Transform] type attrs stripped · values coerced (int/float/bool)")


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "═" * 64

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║       Template Method: Data Pipeline                         ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    print(f"\n{SEP}")
    print("  Three pipelines, same skeleton, different formats")
    print(SEP)

    for pipeline in [CsvPipeline(), JsonPipeline(), XmlPipeline()]:
        pipeline.run()

    print(f"\n{SEP}")
    print("  The template method in action:")
    print("    Every pipeline ran: extract → transform → validate → load → report")
    print("    validate() and load() are identical across all three; written once.")
    print("    Only extract() and transform() differed per format.")
    print(SEP)

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Done                                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
