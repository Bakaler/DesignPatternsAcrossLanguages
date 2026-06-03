// ============================================================
//  Unit Tests — Template Method: Data Pipeline (TypeScript)
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  DataPipeline, CsvPipeline, JsonPipeline, XmlPipeline, type Row,
} from '../../../../BehavioralPatterns/TemplateMethod/typescript/typescript';

// ── Helper: minimal spy pipeline ─────────────────────────────
function makePipeline(records: Row[], name = 'TestPipe'): DataPipeline & { errs: string[] } {
  class SpyPipe extends DataPipeline {
    get name() { return name; }
    protected extract()   { this.records = records; }
    protected transform() { /* no-op */ }
    get errs() { return this.errors; }
    // expose protected methods for direct testing
    runValidate() { (this as any).extract(); (this as any).validate(); }
    runLoad()     { (this as any).load(); }
    runReport()   { (this as any).report(); }
  }
  return new SpyPipe() as any;
}

// ── validate() ───────────────────────────────────────────────
describe('DataPipeline.validate()', () => {
  it('passes records that have both id and name', () => {
    const p = makePipeline([{ id: '1', name: 'Alice' }]);
    captureOutput(() => (p as any).runValidate());
    assert.strictEqual(p.errs.length, 0);
  });

  it('catches a missing name', () => {
    const p = makePipeline([{ id: '1', name: null }]);
    captureOutput(() => (p as any).runValidate());
    assert.ok(p.errs.some((e: string) => e.includes('name')));
  });

  it('catches a missing id', () => {
    const p = makePipeline([{ id: null, name: 'Alice' }]);
    captureOutput(() => (p as any).runValidate());
    assert.ok(p.errs.some((e: string) => e.includes("'id'")));
  });

  it('output line contains "records checked"', () => {
    const p = makePipeline([{ id: '1', name: 'Alice' }]);
    const lines = captureOutput(() => (p as any).runValidate());
    assert.ok(lines.some(l => l.includes('records checked')));
  });
});

// ── report() hook ────────────────────────────────────────────
describe('DataPipeline.report() hook', () => {
  it('prints "No issues." when no errors', () => {
    const p = makePipeline([]);
    const out = captureOutput(() => (p as any).runReport()).join('\n');
    assert.ok(out.includes('No issues.'));
  });

  it('prints warning symbol when errors exist', () => {
    const p = makePipeline([]);
    (p as any).errors = ["row 0: missing required field 'name'"];
    const out = captureOutput(() => (p as any).runReport()).join('\n');
    assert.ok(out.includes('⚠'));
  });

  it('can be overridden in a subclass', () => {
    class CustomCsv extends CsvPipeline {
      protected override report() { console.log('CUSTOM'); }
    }
    const out = captureOutput(() => new CustomCsv().run()).join('\n');
    assert.ok(out.includes('CUSTOM'));
    assert.ok(!out.includes('No issues.'));
  });
});

// ── CsvPipeline ───────────────────────────────────────────────
describe('CsvPipeline', () => {
  let pipe: CsvPipeline;
  beforeEach(() => { pipe = new CsvPipeline(); });

  it('extract loads 3 records', () => {
    captureOutput(() => (pipe as any).extract());
    assert.strictEqual((pipe as any).records.length, 3);
  });

  it('transform trims whitespace', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    const names = (pipe as any).records.map((r: Row) => r['name']);
    assert.ok(names.includes('Bob'));
    assert.ok(!names.includes('  Bob  '));
  });

  it('transform converts empty string to null', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[2]['name'], null);
  });

  it('transform output mentions whitespace trimming', () => {
    captureOutput(() => (pipe as any).extract());
    const lines = captureOutput(() => (pipe as any).transform());
    assert.ok(lines.some(l => l.includes('whitespace trimmed')));
  });
});

// ── JsonPipeline ──────────────────────────────────────────────
describe('JsonPipeline', () => {
  let pipe: JsonPipeline;
  beforeEach(() => { pipe = new JsonPipeline(); });

  it('extract loads 3 records', () => {
    captureOutput(() => (pipe as any).extract());
    assert.strictEqual((pipe as any).records.length, 3);
  });

  it('transform flattens nested objects', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.ok('meta_role' in (pipe as any).records[0]);
    assert.ok(!('meta' in (pipe as any).records[0]));
  });

  it('transform coerces numeric string to number', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[0]['age'], 31);
  });
});

// ── XmlPipeline ───────────────────────────────────────────────
describe('XmlPipeline', () => {
  let pipe: XmlPipeline;
  beforeEach(() => { pipe = new XmlPipeline(); });

  it('extract loads 3 records', () => {
    captureOutput(() => (pipe as any).extract());
    assert.strictEqual((pipe as any).records.length, 3);
  });

  it('transform coerces int', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[0]['id'], 1);
  });

  it('transform coerces float', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[0]['score'], 9.4);
  });

  it('transform coerces bool true', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[0]['active'], true);
  });

  it('transform coerces bool false', () => {
    captureOutput(() => (pipe as any).extract());
    captureOutput(() => (pipe as any).transform());
    assert.strictEqual((pipe as any).records[1]['active'], false);
  });
});

// ── run() step order ─────────────────────────────────────────
describe('run() step ordering', () => {
  it('calls steps in correct order', () => {
    const order: string[] = [];
    class SpyPipe extends DataPipeline {
      get name() { return 'Spy'; }
      protected extract()   { order.push('extract');   this.records = [{ id: '1', name: 'X' }]; }
      protected transform() { order.push('transform'); }
      protected override validate() { order.push('validate'); this.errors = []; }
      protected override load()     { order.push('load'); }
      protected override report()   { order.push('report'); }
    }
    captureOutput(() => new SpyPipe().run());
    assert.deepStrictEqual(order, ['extract', 'transform', 'validate', 'load', 'report']);
  });
});
