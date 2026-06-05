// ============================================================
//  Template Method: Data Pipeline
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Class   DataPipeline
//  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
//  Client           Entry point
//
//  Template method: DataPipeline.run()
//  ────────────────────────────────────────────────────────
//  extract()    ← abstract    format-specific parsing
//  transform()  ← abstract    format-specific cleaning / shaping
//  validate()   ← concrete    shared: checks id + name present
//  load()       ← concrete    shared: prints formatted record table
//  report()     ← hook        default "no issues"; override for custom warnings
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Code reuse          validate() and load() written once, used by all
//  ✓ Enforced sequence   run() is the skeleton; steps cannot be reordered
//  ✓ Hollywood principle base calls subclass, not the other way around
//  ✗ Inheritance lock    a new required step touches the base class
// ============================================================

// SECTION:: Abstract Pipeline
// ═════════════════════════════════════════════════════════════
//  ABSTRACT CLASS: DataPipeline
// ═════════════════════════════════════════════════════════════
//  Defines the template method run() and the step contracts.
//  extract() and transform() are abstract; subclasses must implement them.
//  validate() and load() are concrete; written once and shared by all.
//  report() is a hook with a default implementation; subclasses may override.

export type Row = Record<string, unknown>;

export abstract class DataPipeline {
  protected records: Row[]    = [];
  protected errors:  string[] = [];

  abstract get name(): string;
  protected abstract extract(): void;
  protected abstract transform(): void;

  // Template method — final by convention. Do not override in subclasses.
  // Defines the invariant sequence: extract → transform → validate → load → report
  run(): void {
    console.log(`\n  Pipeline : ${this.name}`);
    console.log('  ' + '─'.repeat(52));
    this.extract();
    this.transform();
    this.validate();
    this.load();
    this.report();
  }

  // Concrete steps — shared logic; never overridden.
  protected validate(): void {
    this.errors = [];
    const errorRows = new Set<number>();
    this.records.forEach((rec, i) => {
      if (!rec['id'])   { this.errors.push(`row ${i}: missing required field 'id'`);   errorRows.add(i); }
      if (!rec['name']) { this.errors.push(`row ${i}: missing required field 'name'`); errorRows.add(i); }
    });
    const passed = this.records.length - errorRows.size;
    console.log(`  [Validate]  ${this.records.length} records checked: ${passed} passed, ${errorRows.size} error(s)`);
  }

  protected load(): void {
    console.log(`  [Load]      writing ${this.records.length} record(s)`);
    for (const rec of this.records) {
      const pairs = Object.entries(rec).map(([k, v]) => `${k}:${v}`).join('  ');
      console.log(`              ${pairs}`);
    }
  }

  // Hook — default handles errors; subclasses may override for custom messaging.
  protected report(): void {
    if (this.errors.length > 0) {
      for (const err of this.errors) console.log(`  [Report]  !  ${err}`);
    } else {
      console.log('  [Report]    Pipeline complete. No issues.');
    }
  }
}


// SECTION:: CSV Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: CsvPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : parse comma-separated rows into records
//  transform: trim whitespace from all values; empty string → null

const CSV_SOURCE = `id,name,age,city
1,Alice,30,London
2,  Bob  ,25,  New York
3,,28,Paris`;
// Row 3 has no name; will be caught by validate()

export class CsvPipeline extends DataPipeline {
  get name() { return 'CSV Data Pipeline'; }

  protected extract(): void {
    const lines   = CSV_SOURCE.split('\n');
    const headers = lines[0].split(',');
    this.records  = lines.slice(1).map(line => {
      const vals: Row = {};
      line.split(',').forEach((v, i) => { vals[headers[i]] = v; });
      return vals;
    });
    console.log(`  [Extract]   ${this.records.length} raw rows parsed from CSV source`);
  }

  protected transform(): void {
    for (const rec of this.records) {
      for (const key of Object.keys(rec)) {
        const stripped = String(rec[key]).trim();
        rec[key] = stripped === '' ? null : stripped;
      }
    }
    console.log('  [Transform] whitespace trimmed · empty strings → null');
  }
}


// SECTION:: JSON Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: JsonPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : parse a JSON array into records
//  transform: flatten nested objects (meta.role → meta_role)
//             coerce numeric strings to number

const JSON_SOURCE = `[
  {"id": 1, "name": "Dave",  "age": "31", "meta": {"role": "admin", "level": 3}},
  {"id": 2, "name": "Eve",   "age": "27", "meta": {"role": "user",  "level": 1}},
  {"id": 3, "name": "Frank", "age": "35", "meta": {"role": "mod",   "level": 2}}
]`;

function coerceNumeric(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const n = Number(v);
  return (!isNaN(n) && v.trim() !== '') ? n : v;
}

export class JsonPipeline extends DataPipeline {
  get name() { return 'JSON Data Pipeline'; }

  protected extract(): void {
    this.records = JSON.parse(JSON_SOURCE);
    console.log(`  [Extract]   ${this.records.length} objects parsed from JSON array`);
  }

  protected transform(): void {
    this.records = this.records.map(rec => {
      const out: Row = {};
      for (const [k, v] of Object.entries(rec)) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          for (const [nk, nv] of Object.entries(v as object)) out[`${k}_${nk}`] = nv;
        } else {
          out[k] = coerceNumeric(v);
        }
      }
      return out;
    });
    console.log('  [Transform] nested keys flattened · numeric strings coerced');
  }
}


// SECTION:: XML Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: XmlPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : parse <record> elements, preserving type attributes
//  transform: strip type metadata; coerce values (int/float/bool/string)

const XML_SOURCE = `<records>
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
</records>`;

type XmlMeta = { _type: string; _val: string };

const XML_COERCE: Record<string, (v: string) => unknown> = {
  int:    v => parseInt(v, 10),
  float:  v => parseFloat(v),
  bool:   v => v.trim().toLowerCase() === 'true',
  string: v => v,
};

export class XmlPipeline extends DataPipeline {
  get name() { return 'XML Data Pipeline'; }

  protected extract(): void {
    const recordRe = /<record>([\s\S]*?)<\/record>/g;
    const fieldRe  = /<(\w+)\s+type="(\w+)">(.*?)<\/\1>/g;
    const raws: Row[] = [];
    let rm: RegExpExecArray | null;
    while ((rm = recordRe.exec(XML_SOURCE)) !== null) {
      const rec: Row = {};
      fieldRe.lastIndex = 0;
      let fm: RegExpExecArray | null;
      while ((fm = fieldRe.exec(rm[1])) !== null) {
        rec[fm[1]] = { _type: fm[2], _val: fm[3] } as XmlMeta;
      }
      raws.push(rec);
    }
    this.records = raws;
    console.log(`  [Extract]   ${this.records.length} <record> elements parsed from XML`);
  }

  protected transform(): void {
    for (const rec of this.records) {
      for (const key of Object.keys(rec)) {
        const meta = rec[key] as XmlMeta;
        rec[key] = (XML_COERCE[meta._type] ?? XML_COERCE['string'])(meta._val);
      }
    }
    console.log('  [Transform] type attrs stripped · values coerced (int/float/bool)');
  }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
  const SEP = '═'.repeat(64);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Template Method: Data Pipeline                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log(`\n${SEP}`);
  console.log('  Three pipelines, same skeleton, different formats');
  console.log(SEP);

  for (const pipeline of [new CsvPipeline(), new JsonPipeline(), new XmlPipeline()]) {
    pipeline.run();
  }

  console.log(`\n${SEP}`);
  console.log('  The template method in action:');
  console.log('    Every pipeline ran: extract → transform → validate → load → report');
  console.log('    validate() and load() are identical across all three; written once.');
  console.log('    Only extract() and transform() differed per format.');
  console.log(SEP);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Done                                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
} // require.main === module
