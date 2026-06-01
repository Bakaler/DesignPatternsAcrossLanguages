// ============================================================
//  Unit Tests — Interpreter: Arithmetic Expression Evaluator (TypeScript)
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  Context,
  NumberExpression, VariableExpression,
  AddExpression, SubtractExpression, MultiplyExpression, DivideExpression,
  FloorDivideExpression, ModuloExpression, PowerExpression,
  NegateExpression, AbsExpression, SqrtExpression, InverseExpression,
  FactorialExpression, PowerOfTenExpression, LogExpression,
} from '../../../../BehavioralPatterns/Interpreter/typescript/typescript';

const ctx0 = new Context();

// ── Context ───────────────────────────────────────────────────
describe('Context', () => {
  it('stores and retrieves a variable', () => {
    assert.strictEqual(new Context().set('x', 42).get('x'), 42);
  });
  it('throws on undefined variable', () => {
    assert.throws(() => new Context().get('missing'), /Undefined variable/);
  });
  it('overwrites an existing variable', () => {
    assert.strictEqual(new Context().set('x', 1).set('x', 99).get('x'), 99);
  });
  it('set() returns context for chaining', () => {
    const ctx = new Context(); assert.strictEqual(ctx.set('a', 1), ctx);
  });
});


// ── Terminal expressions ──────────────────────────────────────
describe('NumberExpression', () => {
  it('returns its literal value', () => assert.strictEqual(new NumberExpression(7).interpret(ctx0), 7));
  it('ignores the context',       () => assert.strictEqual(new NumberExpression(3).interpret(new Context().set('x', 99)), 3));
  it('toString renders the number', () => assert.strictEqual(new NumberExpression(5).toString(), '5'));
});

describe('VariableExpression', () => {
  it('resolves from context',          () => assert.strictEqual(new VariableExpression('a').interpret(new Context().set('a', 10)), 10));
  it('throws when missing',            () => assert.throws(() => new VariableExpression('z').interpret(ctx0), /Undefined variable/));
  it('toString returns variable name', () => assert.strictEqual(new VariableExpression('a').toString(), 'a'));
});


// ── Binary operators ──────────────────────────────────────────
describe('AddExpression', () => {
  it('adds two numbers',   () => assert.strictEqual(new AddExpression(new NumberExpression(3), new NumberExpression(4)).interpret(ctx0), 7));
  it('display wraps in parens', () => assert.ok(new AddExpression(new NumberExpression(1), new NumberExpression(2)).toString().startsWith('(')));
});

describe('SubtractExpression', () => {
  it('subtracts right from left', () => assert.strictEqual(new SubtractExpression(new NumberExpression(10), new NumberExpression(3)).interpret(ctx0), 7));
  it('result can be negative',    () => assert.strictEqual(new SubtractExpression(new NumberExpression(2), new NumberExpression(5)).interpret(ctx0), -3));
});

describe('MultiplyExpression', () => {
  it('multiplies two numbers', () => assert.strictEqual(new MultiplyExpression(new NumberExpression(4), new NumberExpression(5)).interpret(ctx0), 20));
});

describe('DivideExpression', () => {
  it('divides left by right',      () => assert.strictEqual(new DivideExpression(new NumberExpression(10), new NumberExpression(2)).interpret(ctx0), 5));
  it('throws on division by zero', () => assert.throws(() => new DivideExpression(new NumberExpression(5), new NumberExpression(0)).interpret(ctx0), /Division by zero/));
  it('produces fractional result', () => assert.strictEqual(new DivideExpression(new NumberExpression(10), new NumberExpression(4)).interpret(ctx0), 2.5));
});

describe('FloorDivideExpression', () => {
  it('floors the quotient',        () => assert.strictEqual(new FloorDivideExpression(new NumberExpression(17), new NumberExpression(5)).interpret(ctx0), 3));
  it('throws on division by zero', () => assert.throws(() => new FloorDivideExpression(new NumberExpression(5), new NumberExpression(0)).interpret(ctx0), /Division by zero/));
  it('display contains //',        () => assert.ok(new FloorDivideExpression(new NumberExpression(1), new NumberExpression(2)).toString().includes('//')));
});

describe('ModuloExpression', () => {
  it('returns the remainder',      () => assert.strictEqual(new ModuloExpression(new NumberExpression(17), new NumberExpression(5)).interpret(ctx0), 2));
  it('throws on division by zero', () => assert.throws(() => new ModuloExpression(new NumberExpression(5), new NumberExpression(0)).interpret(ctx0), /Division by zero/));
  it('display contains %',         () => assert.ok(new ModuloExpression(new NumberExpression(1), new NumberExpression(2)).toString().includes('%')));
});

describe('PowerExpression', () => {
  it('raises base to exponent',  () => assert.strictEqual(new PowerExpression(new NumberExpression(2), new NumberExpression(10)).interpret(ctx0), 1024));
  it('handles fractional power', () => assert.ok(Math.abs(new PowerExpression(new NumberExpression(4), new NumberExpression(0.5)).interpret(ctx0) - 2) < 0.001));
  it('display contains **',      () => assert.ok(new PowerExpression(new NumberExpression(2), new NumberExpression(3)).toString().includes('**')));
});


// ── Unary functions ───────────────────────────────────────────
describe('NegateExpression', () => {
  it('negates positive', () => assert.strictEqual(new NegateExpression(new NumberExpression(5)).interpret(ctx0), -5));
  it('negates negative', () => assert.strictEqual(new NegateExpression(new NumberExpression(-3)).interpret(ctx0), 3));
});

describe('AbsExpression', () => {
  it('returns absolute value of negative', () => assert.strictEqual(new AbsExpression(new NumberExpression(-9)).interpret(ctx0), 9));
  it('leaves positive unchanged',          () => assert.strictEqual(new AbsExpression(new NumberExpression(7)).interpret(ctx0), 7));
});

describe('SqrtExpression', () => {
  it('returns correct square root',    () => assert.strictEqual(new SqrtExpression(new NumberExpression(100)).interpret(ctx0), 10));
  it('throws on negative input',       () => assert.throws(() => new SqrtExpression(new NumberExpression(-1)).interpret(ctx0), /negative/));
});

describe('InverseExpression', () => {
  it('returns 1/x',               () => assert.strictEqual(new InverseExpression(new NumberExpression(4)).interpret(ctx0), 0.25));
  it('throws on zero',            () => assert.throws(() => new InverseExpression(new NumberExpression(0)).interpret(ctx0), /Division by zero/));
});

describe('FactorialExpression', () => {
  it('computes 0! = 1',  () => assert.strictEqual(new FactorialExpression(new NumberExpression(0)).interpret(ctx0), 1));
  it('computes 5! = 120',() => assert.strictEqual(new FactorialExpression(new NumberExpression(5)).interpret(ctx0), 120));
  it('computes 6! = 720',() => assert.strictEqual(new FactorialExpression(new NumberExpression(6)).interpret(ctx0), 720));
  it('throws on negative',() => assert.throws(() => new FactorialExpression(new NumberExpression(-1)).interpret(ctx0), /negative/));
});

describe('PowerOfTenExpression', () => {
  it('10^2 = 100',  () => assert.strictEqual(new PowerOfTenExpression(new NumberExpression(2)).interpret(ctx0), 100));
  it('10^0 = 1',    () => assert.strictEqual(new PowerOfTenExpression(new NumberExpression(0)).interpret(ctx0), 1));
});

describe('LogExpression', () => {
  it('log(100) = 2',  () => assert.strictEqual(new LogExpression(new NumberExpression(100)).interpret(ctx0), 2));
  it('log(1) = 0',    () => assert.strictEqual(new LogExpression(new NumberExpression(1)).interpret(ctx0), 0));
  it('throws on zero',() => assert.throws(() => new LogExpression(new NumberExpression(0)).interpret(ctx0), /non-positive/));
  it('throws on negative',() => assert.throws(() => new LogExpression(new NumberExpression(-5)).interpret(ctx0), /non-positive/));
});


// ── Composite trees ───────────────────────────────────────────
describe('Composite expression trees', () => {
  it('(a + b) * (a - b) equals a² - b²', () => {
    const a = new VariableExpression('a'), b = new VariableExpression('b');
    const ctx = new Context().set('a', 10).set('b', 5);
    assert.strictEqual(new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b)).interpret(ctx), 75);
  });

  it('sqrt(abs(a - b)) composes correctly', () => {
    const a = new VariableExpression('a'), b = new VariableExpression('b');
    const ctx = new Context().set('a', 7).set('b', 23);
    const expr = new SqrtExpression(new AbsExpression(new SubtractExpression(a, b)));
    assert.strictEqual(expr.interpret(ctx), 4);
  });

  it('same tree, different contexts', () => {
    const a = new VariableExpression('a'), b = new VariableExpression('b');
    const expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));
    assert.strictEqual(expr.interpret(new Context().set('a', 10).set('b', 5)), 75);
    assert.strictEqual(expr.interpret(new Context().set('a', 6).set('b', 2)), 32);
  });

  it('10^abs(b) composes PowerOfTen with Abs', () => {
    const b = new VariableExpression('b');
    const ctx = new Context().set('b', -3);
    assert.strictEqual(new PowerOfTenExpression(new AbsExpression(b)).interpret(ctx), 1000);
  });
});
