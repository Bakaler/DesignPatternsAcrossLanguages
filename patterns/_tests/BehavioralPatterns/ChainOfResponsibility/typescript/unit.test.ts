// ============================================================
//  Unit Tests - Chain of Responsibility: Grammar Token Validator
//
//  What we test here:
//    Each handler claims exactly its own tokens
//    Each handler passes foreign tokens to the next link
//      (or returns null when it is the last link)
//    Context validation: trailing, parenDepth, hasDecimal
//    setNext() wiring and toString() identity
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import * as assert from 'assert';
import {
  ParseContext, Handler,
  SolveHandler, ExpHandler, TermHandler, PowerHandler,
  FactorHandler, FunctionHandler, DigitHandler,
  OPERANDS, DEFAULT_FUNCTIONS,
} from '../../../../BehavioralPatterns/ChainOfResponsibility/typescript/typescript';

// ─────────────────────────────────────────────────────────────
//  Helper: isolated handler (no next link -> pass returns null)
// ─────────────────────────────────────────────────────────────

const EMPTY       = new ParseContext();
const AFTER5      = new ParseContext('5');
const AFTER_OPEN  = new ParseContext('(');
const AFTER_CLOSE = new ParseContext(')', 0);


describe('CoR Handlers', () => {

  // ── SolveHandler ──────────────────────────────────────────────
  describe('SolveHandler', () => {
    const h = new SolveHandler();

    it('claims equals', () => {
      assert.deepStrictEqual(h.handle('=', EMPTY), ['Solve', '=']);
    });

    it('passes plus (returns null when isolated)', () => {
      assert.strictEqual(h.handle('+', EMPTY), null);
    });

    it('passes digit (returns null when isolated)', () => {
      assert.strictEqual(h.handle('5', EMPTY), null);
    });

    it('toString returns class name', () => {
      assert.strictEqual(h.toString(), 'SolveHandler');
    });
  });


  // ── ExpHandler ────────────────────────────────────────────────
  describe('ExpHandler', () => {
    const h = new ExpHandler();

    it('claims plus after digit', () => {
      assert.deepStrictEqual(h.handle('+', AFTER5), ['Exp', ' + ']);
    });

    it('claims minus after digit', () => {
      assert.deepStrictEqual(h.handle('-', AFTER5), ['Exp', ' - ']);
    });

    it('rejects plus at start', () => {
      assert.strictEqual(h.handle('+', EMPTY), null);
    });

    it('rejects plus after open paren', () => {
      assert.strictEqual(h.handle('+', AFTER_OPEN), null);
    });

    it('rejects plus after operator', () => {
      for (const op of OPERANDS) {
        const ctx = new ParseContext(op);
        assert.strictEqual(h.handle('+', ctx), null, `should reject + after ${op}`);
      }
    });

    it('passes multiply (returns null when isolated)', () => {
      assert.strictEqual(h.handle('*', AFTER5), null);
    });

    it('passes digit (returns null when isolated)', () => {
      assert.strictEqual(h.handle('7', AFTER5), null);
    });
  });


  // ── TermHandler ───────────────────────────────────────────────
  describe('TermHandler', () => {
    const h = new TermHandler();

    it('claims multiply', () => {
      assert.deepStrictEqual(h.handle('*', AFTER5), ['Term', ' * ']);
    });

    it('claims divide', () => {
      assert.deepStrictEqual(h.handle('/', AFTER5), ['Term', ' / ']);
    });

    it('claims floor divide', () => {
      assert.deepStrictEqual(h.handle('//', AFTER5), ['Term', ' // ']);
    });

    it('claims modulo', () => {
      assert.deepStrictEqual(h.handle('%', AFTER5), ['Term', ' % ']);
    });

    it('does not claim power (**)', () => {
      assert.strictEqual(h.handle('**', AFTER5), null);
    });

    it('rejects multiply at start', () => {
      assert.strictEqual(h.handle('*', EMPTY), null);
    });

    it('rejects multiply after open paren', () => {
      assert.strictEqual(h.handle('*', AFTER_OPEN), null);
    });

    it('passes plus (returns null when isolated)', () => {
      assert.strictEqual(h.handle('+', AFTER5), null);
    });
  });


  // ── PowerHandler ──────────────────────────────────────────────
  describe('PowerHandler', () => {
    const h = new PowerHandler();

    it('claims power', () => {
      assert.deepStrictEqual(h.handle('**', AFTER5), ['Power', ' ** ']);
    });

    it('rejects power at start', () => {
      assert.strictEqual(h.handle('**', EMPTY), null);
    });

    it('rejects power after open paren', () => {
      assert.strictEqual(h.handle('**', AFTER_OPEN), null);
    });

    it('passes single star (returns null when isolated)', () => {
      assert.strictEqual(h.handle('*', AFTER5), null);
    });

    it('passes digit (returns null when isolated)', () => {
      assert.strictEqual(h.handle('3', AFTER5), null);
    });
  });


  // ── FactorHandler ─────────────────────────────────────────────
  describe('FactorHandler', () => {
    const h = new FactorHandler();

    it('claims open paren always (empty ctx)', () => {
      assert.deepStrictEqual(h.handle('(', EMPTY), ['Factor', '(']);
    });

    it('claims open paren always (after digit)', () => {
      assert.deepStrictEqual(h.handle('(', AFTER5), ['Factor', '(']);
    });

    it('claims open paren always (after open paren)', () => {
      assert.deepStrictEqual(h.handle('(', AFTER_OPEN), ['Factor', '(']);
    });

    it('claims close paren when depth > 0', () => {
      const ctx = new ParseContext(null, 1);
      assert.deepStrictEqual(h.handle(')', ctx), ['Factor', ')']);
    });

    it('claims close paren at nested depth', () => {
      const ctx = new ParseContext(null, 3);
      assert.deepStrictEqual(h.handle(')', ctx), ['Factor', ')']);
    });

    it('rejects close paren when no paren open', () => {
      const ctx = new ParseContext(null, 0);
      assert.strictEqual(h.handle(')', ctx), null);
    });

    it('passes digit (returns null when isolated)', () => {
      assert.strictEqual(h.handle('5', AFTER5), null);
    });

    it('passes operator (returns null when isolated)', () => {
      assert.strictEqual(h.handle('+', AFTER5), null);
    });
  });


  // ── FunctionHandler ───────────────────────────────────────────
  describe('FunctionHandler', () => {
    const h = new FunctionHandler(DEFAULT_FUNCTIONS);

    it('claims each default function', () => {
      for (const fn of DEFAULT_FUNCTIONS) {
        assert.deepStrictEqual(h.handle(fn, AFTER5), ['Function', fn]);
      }
    });

    it('passes unknown token (returns null when isolated)', () => {
      assert.strictEqual(h.handle('cbrt', AFTER5), null);
    });

    it('passes digit (returns null when isolated)', () => {
      assert.strictEqual(h.handle('3', AFTER5), null);
    });

    it('custom function set claims cbrt but not abs', () => {
      const h2 = new FunctionHandler(new Set(['cbrt', 'exp']));
      assert.deepStrictEqual(h2.handle('cbrt', AFTER5), ['Function', 'cbrt']);
      assert.strictEqual(h2.handle('abs', AFTER5), null);
    });
  });


  // ── DigitHandler ──────────────────────────────────────────────
  describe('DigitHandler', () => {
    const h = new DigitHandler();

    it('claims each digit 0-9', () => {
      for (const d of '0123456789') {
        assert.deepStrictEqual(h.handle(d, EMPTY), ['Digit', d]);
      }
    });

    it('rejects digit after close paren', () => {
      assert.strictEqual(h.handle('5', AFTER_CLOSE), null);
    });

    it('claims decimal with no prior decimal', () => {
      assert.deepStrictEqual(h.handle('.', EMPTY), ['SoloDec', '0.']);
    });

    it('rejects second decimal', () => {
      const ctx = new ParseContext('3', 0, true);
      assert.strictEqual(h.handle('.', ctx), null);
    });

    it('rejects operator', () => {
      assert.strictEqual(h.handle('+', EMPTY), null);
    });

    it('rejects unknown string', () => {
      assert.strictEqual(h.handle('xyz', EMPTY), null);
    });
  });


  // ── setNext / chain wiring ────────────────────────────────────
  describe('Chain wiring', () => {
    it('setNext returns the handler', () => {
      const a = new SolveHandler();
      const b = new ExpHandler();
      assert.strictEqual(a.setNext(b), b);
    });

    it('token reaches next handler', () => {
      const digit = new DigitHandler();
      const head  = new SolveHandler();
      head.setNext(digit);
      assert.deepStrictEqual(head.handle('5', EMPTY), ['Digit', '5']);
    });

    it('token rejected when chain exhausted', () => {
      const head = new SolveHandler();
      assert.strictEqual(head.handle('xyz', EMPTY), null);
    });
  });

});
