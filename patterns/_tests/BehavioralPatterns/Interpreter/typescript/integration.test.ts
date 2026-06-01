// ============================================================
//  Integration Tests — Interpreter: Arithmetic Expression Evaluator (TypeScript)
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  Context,
  NumberExpression,
  VariableExpression,
  AddExpression,
  SubtractExpression,
  MultiplyExpression,
  DivideExpression,
} from '../../../../BehavioralPatterns/Interpreter/typescript/typescript';

// ── Full expression evaluation end-to-end ────────────────────
describe('End-to-end expression evaluation', () => {
  it('evaluates a three-level nested tree correctly', () => {
    // ((a + b) * (a - b)) / 5  with a=10, b=5  →  75/5 = 15
    const a   = new VariableExpression('a');
    const b   = new VariableExpression('b');
    const ctx = new Context().set('a', 10).set('b', 5);

    const expr = new DivideExpression(
      new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b)),
      new NumberExpression(5),
    );
    assert.strictEqual(expr.interpret(ctx), 15);
  });

  it('tree reuse: same tree, three different contexts', () => {
    const a    = new VariableExpression('a');
    const b    = new VariableExpression('b');
    const expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));

    const results = [
      { a: 10, b: 5,  expected: 75 },
      { a: 6,  b: 2,  expected: 32 },
      { a: 3,  b: 1,  expected: 8  },
    ];

    for (const { a: av, b: bv, expected } of results) {
      const ctx = new Context().set('a', av).set('b', bv);
      assert.strictEqual(expr.interpret(ctx), expected);
    }
  });

  it('toString() produces a fully parenthesised string', () => {
    const expr = new MultiplyExpression(
      new AddExpression(new VariableExpression('a'), new VariableExpression('b')),
      new SubtractExpression(new VariableExpression('a'), new VariableExpression('b')),
    );
    const s = expr.toString();
    assert.ok(s.includes('(a + b)'));
    assert.ok(s.includes('(a - b)'));
    assert.ok(s.startsWith('('));
  });
});


// ── Error propagation ─────────────────────────────────────────
describe('Error propagation through tree', () => {
  it('missing variable in deep sub-tree surfaces the error', () => {
    const expr = new AddExpression(
      new NumberExpression(1),
      new MultiplyExpression(new VariableExpression('missing'), new NumberExpression(2)),
    );
    assert.throws(() => expr.interpret(new Context()), /Undefined variable/);
  });

  it('division by zero in sub-tree surfaces the error', () => {
    const expr = new AddExpression(
      new NumberExpression(1),
      new DivideExpression(new NumberExpression(4), new NumberExpression(0)),
    );
    assert.throws(() => expr.interpret(new Context()), /Division by zero/);
  });
});


// ── Context independence ──────────────────────────────────────
describe('Context independence', () => {
  it('two parallel evaluations with different contexts do not interfere', () => {
    const a    = new VariableExpression('a');
    const b    = new VariableExpression('b');
    const expr = new AddExpression(a, b);

    const ctx1 = new Context().set('a', 1).set('b', 2);
    const ctx2 = new Context().set('a', 100).set('b', 200);

    assert.strictEqual(expr.interpret(ctx1), 3);
    assert.strictEqual(expr.interpret(ctx2), 300);
  });
});


// ── Commutative and associativity checks ─────────────────────
describe('Arithmetic correctness', () => {
  it('addition is commutative', () => {
    const ctx  = new Context().set('a', 3).set('b', 7);
    const ab   = new AddExpression(new VariableExpression('a'), new VariableExpression('b'));
    const ba   = new AddExpression(new VariableExpression('b'), new VariableExpression('a'));
    assert.strictEqual(ab.interpret(ctx), ba.interpret(ctx));
  });

  it('subtraction is not commutative', () => {
    const ctx  = new Context().set('a', 10).set('b', 3);
    const ab   = new SubtractExpression(new VariableExpression('a'), new VariableExpression('b'));
    const ba   = new SubtractExpression(new VariableExpression('b'), new VariableExpression('a'));
    assert.notStrictEqual(ab.interpret(ctx), ba.interpret(ctx));
  });

  it('multiply by zero always gives zero', () => {
    const ctx  = new Context().set('a', 999);
    const expr = new MultiplyExpression(new VariableExpression('a'), new NumberExpression(0));
    assert.strictEqual(expr.interpret(ctx), 0);
  });
});
