// ============================================================
//  Integration Tests — Template Method: Data Pipeline (TypeScript)
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import { describe, it, before } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  CsvPipeline, JsonPipeline, XmlPipeline,
} from '../../../../BehavioralPatterns/TemplateMethod/typescript/typescript';

// ── CSV full run ──────────────────────────────────────────────
describe('CsvPipeline — full run()', () => {
  let lines: string[];
  before(() => { lines = captureOutput(() => new CsvPipeline().run()); });

  it('all five step labels present', () => {
    const out = lines.join('\n');
    for (const l of ['[Extract]', '[Transform]', '[Validate]', '[Load]', '[Report]'])
      assert.ok(out.includes(l));
  });

  it('validate catches missing name', () => {
    assert.ok(lines.some(l => l.includes('1 error(s)')));
  });

  it('report shows warning', () => {
    assert.ok(lines.some(l => l.includes('⚠') && l.includes('name')));
  });

  it('Alice and Bob appear in load output', () => {
    assert.ok(lines.some(l => l.includes('Alice')));
    assert.ok(lines.some(l => l.includes('Bob')));
  });

  it('whitespace trimmed — Bob not padded', () => {
    assert.ok(!lines.join('\n').includes('  Bob  '));
  });
});

// ── JSON full run ─────────────────────────────────────────────
describe('JsonPipeline — full run()', () => {
  let lines: string[];
  before(() => { lines = captureOutput(() => new JsonPipeline().run()); });

  it('all five step labels present', () => {
    const out = lines.join('\n');
    for (const l of ['[Extract]', '[Transform]', '[Validate]', '[Load]', '[Report]'])
      assert.ok(out.includes(l));
  });

  it('no validation errors', () => {
    assert.ok(lines.some(l => l.includes('0 error(s)')));
  });

  it('nested key appears flattened', () => {
    assert.ok(lines.join('\n').includes('meta_role'));
  });

  it('coerced age in output', () => {
    assert.ok(lines.some(l => l.includes('age:31')));
  });

  it('all three names in output', () => {
    const out = lines.join('\n');
    for (const n of ['Dave', 'Eve', 'Frank']) assert.ok(out.includes(n));
  });
});

// ── XML full run ──────────────────────────────────────────────
describe('XmlPipeline — full run()', () => {
  let lines: string[];
  before(() => { lines = captureOutput(() => new XmlPipeline().run()); });

  it('all five step labels present', () => {
    const out = lines.join('\n');
    for (const l of ['[Extract]', '[Transform]', '[Validate]', '[Load]', '[Report]'])
      assert.ok(out.includes(l));
  });

  it('no validation errors', () => {
    assert.ok(lines.some(l => l.includes('0 error(s)')));
  });

  it('coerced bool in output', () => {
    const out = lines.join('\n');
    assert.ok(out.includes('active:true'));
    assert.ok(out.includes('active:false'));
  });

  it('float score in output', () => {
    assert.ok(lines.some(l => l.includes('9.4')));
  });
});

// ── Shared skeleton ───────────────────────────────────────────
describe('Shared skeleton across all pipelines', () => {
  const LABELS = ['[Extract]', '[Transform]', '[Validate]', '[Load]', '[Report]'];

  function run(p: { run(): void }) {
    return captureOutput(() => p.run()).join('\n');
  }

  it('all pipelines share the same step labels', () => {
    for (const out of [run(new CsvPipeline()), run(new JsonPipeline()), run(new XmlPipeline())])
      for (const l of LABELS) assert.ok(out.includes(l));
  });

  it('extract always before transform', () => {
    for (const pipe of [new CsvPipeline(), new JsonPipeline(), new XmlPipeline()]) {
      const out = run(pipe);
      assert.ok(out.indexOf('[Extract]') < out.indexOf('[Transform]'));
    }
  });

  it('validate always after transform', () => {
    for (const pipe of [new CsvPipeline(), new JsonPipeline(), new XmlPipeline()]) {
      const out = run(pipe);
      assert.ok(out.indexOf('[Transform]') < out.indexOf('[Validate]'));
    }
  });

  it('report always last', () => {
    for (const pipe of [new CsvPipeline(), new JsonPipeline(), new XmlPipeline()]) {
      const out = run(pipe);
      assert.ok(out.indexOf('[Load]') < out.indexOf('[Report]'));
    }
  });
});
