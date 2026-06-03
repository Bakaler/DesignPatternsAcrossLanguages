// ============================================================
//  Integration Tests - Chain of Responsibility: Grammar Token Validator
//
//  What we test here:
//    Full token sequences accepted or rejected end-to-end
//    Invalid sequences fail at the correct chain link
//    Every token type correctly classified in a realistic equation
//    Chain extension does not break existing behaviour
//    Paren depth and decimal flags interact correctly
//
//  Pipeline tests:
//    CoR chain + TreeBuilder + Interpreter evaluate end-to-end
//    Operator precedence is respected through tree shape
//    Grouping with parentheses overrides precedence
//    Unary prefix functions nest correctly
//    Invalid token sequences raise Error before evaluation
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import * as assert from 'assert';
import {
  ParseContext,
  SolveHandler, ExpHandler, TermHandler, PowerHandler,
  FactorHandler, FunctionHandler, DigitHandler,
  DEFAULT_FUNCTIONS,
  buildChain, TreeBuilder, parseAndBuild,
} from '../../../../BehavioralPatterns/ChainOfResponsibility/typescript/typescript';
import { Context } from '../../../../BehavioralPatterns/Interpreter/typescript/typescript';

// ─────────────────────────────────────────────────────────────
//  Helper: feed a token sequence through the chain, updating
//  context automatically after each accepted token.
// ─────────────────────────────────────────────────────────────

function feed(chain: any, tokens: string[]): Array<[string, string] | null> {
  const results: Array<[string, string] | null> = [];
  let ctx = new ParseContext();

  for (const tok of tokens) {
    const result = chain.handle(tok, ctx);
    results.push(result);

    if (!result) break;

    const [tokenType] = result;
    let parenDepth = ctx.parenDepth;
    let hasDecimal = ctx.hasDecimal;

    if (tok === '(') { parenDepth++; hasDecimal = false; }
    else if (tok === ')') { parenDepth--; }
    else if (tokenType === 'Exp' || tokenType === 'Term' || tokenType === 'Power')
      { hasDecimal = false; }
    else if (tok === '.') { hasDecimal = true; }

    ctx = new ParseContext(tok, parenDepth, hasDecimal);
  }

  return results;
}


describe('CoR Integration', () => {

  // ── Valid sequences ─────────────────────────────────────────
  describe('Valid sequences', () => {

    it('simple addition', () => {
      const r = feed(buildChain(), ['5', '+', '3', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'Exp', 'Digit', 'Solve']);
    });

    it('order of operations', () => {
      const r = feed(buildChain(), ['2', '+', '3', '*', '4', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'Exp', 'Digit', 'Term', 'Digit', 'Solve']);
    });

    it('parenthesised expression', () => {
      const r = feed(buildChain(), ['(', '6', '-', '2', ')', '*', '3', '=']);
      assert.deepStrictEqual(r.map(x => x![0]),
        ['Factor', 'Digit', 'Exp', 'Digit', 'Factor', 'Term', 'Digit', 'Solve']);
    });

    it('power expression', () => {
      const r = feed(buildChain(), ['2', '**', '8', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'Power', 'Digit', 'Solve']);
    });

    it('function wrapping digit', () => {
      const r = feed(buildChain(), ['abs', '9', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Function', 'Digit', 'Solve']);
    });

    it('nested functions', () => {
      const r = feed(buildChain(), ['neg', 'abs', '7', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Function', 'Function', 'Digit', 'Solve']);
    });

    it('decimal number', () => {
      const r = feed(buildChain(), ['3', '.', '1', '4', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'SoloDec', 'Digit', 'Digit', 'Solve']);
    });

    it('floor divide', () => {
      const r = feed(buildChain(), ['1', '7', '//', '5', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'Digit', 'Term', 'Digit', 'Solve']);
    });

    it('modulo', () => {
      const r = feed(buildChain(), ['1', '7', '%', '5', '=']);
      assert.deepStrictEqual(r.map(x => x![0]), ['Digit', 'Digit', 'Term', 'Digit', 'Solve']);
    });

    it('complex equation 234 + (12 / 3)', () => {
      const r = feed(buildChain(), ['2','3','4','+','(','1','2','/','3',')','=']);
      assert.deepStrictEqual(r.map(x => x![0]),
        ['Digit','Digit','Digit','Exp','Factor','Digit','Digit','Term','Digit','Factor','Solve']);
    });

    it('solve only', () => {
      assert.deepStrictEqual(buildChain().handle('=', new ParseContext()), ['Solve', '=']);
    });
  });


  // ── Invalid sequences ────────────────────────────────────────
  describe('Invalid sequences', () => {

    it('leading plus rejected', () => {
      assert.strictEqual(feed(buildChain(), ['+', '5'])[0], null);
    });

    it('double operator rejected', () => {
      const r = feed(buildChain(), ['1', '2', '+', '+']);
      assert.notStrictEqual(r[0], null);
      assert.strictEqual(r[3], null);
    });

    it('operator after open paren rejected', () => {
      assert.strictEqual(feed(buildChain(), ['(', '+'])[1], null);
    });

    it('unmatched close paren rejected', () => {
      assert.strictEqual(buildChain().handle(')', new ParseContext(null, 0)), null);
    });

    it('second decimal rejected', () => {
      assert.strictEqual(feed(buildChain(), ['1', '.', '5', '.'])[3], null);
    });

    it('digit after close paren rejected', () => {
      assert.strictEqual(feed(buildChain(), ['(', '3', ')', '5'])[3], null);
    });

    it('unknown token rejected', () => {
      assert.strictEqual(buildChain().handle('xyz', new ParseContext('5')), null);
    });

    it('leading multiply rejected', () => {
      assert.strictEqual(buildChain().handle('*', new ParseContext()), null);
    });
  });


  // ── Processed token values ───────────────────────────────────
  describe('Processed token values', () => {

    it('exp adds spaces around +', () => {
      assert.strictEqual(buildChain().handle('+', new ParseContext('5'))![1], ' + ');
    });

    it('term adds spaces around *', () => {
      assert.strictEqual(buildChain().handle('*', new ParseContext('3'))![1], ' * ');
    });

    it('power adds spaces around **', () => {
      assert.strictEqual(buildChain().handle('**', new ParseContext('2'))![1], ' ** ');
    });

    it('factor open paren has no spaces', () => {
      assert.strictEqual(buildChain().handle('(', new ParseContext())![1], '(');
    });

    it('solo decimal prefixes zero', () => {
      assert.strictEqual(buildChain().handle('.', new ParseContext())![1], '0.');
    });

    it('digit returned as-is', () => {
      assert.strictEqual(buildChain().handle('7', new ParseContext())![1], '7');
    });
  });


  // ── Chain extension ──────────────────────────────────────────
  describe('Chain extension', () => {

    it('new function accepted in extended chain', () => {
      const extended = buildChain(new Set([...DEFAULT_FUNCTIONS, 'cbrt']));
      assert.deepStrictEqual(
        extended.handle('cbrt', new ParseContext('8')), ['Function', 'cbrt']);
    });

    it('new function rejected in default chain', () => {
      assert.strictEqual(buildChain().handle('cbrt', new ParseContext('8')), null);
    });

    it('existing functions still work after extension', () => {
      const extended = buildChain(new Set([...DEFAULT_FUNCTIONS, 'cbrt']));
      for (const fn of DEFAULT_FUNCTIONS) {
        assert.deepStrictEqual(
          extended.handle(fn, new ParseContext('5')), ['Function', fn]);
      }
    });
  });


  // ── Pipeline: CoR → TreeBuilder → Interpreter ────────────────
  describe('Pipeline', () => {
    const ctx = new Context();

    function ev(tokens: string[]) {
      return parseAndBuild(tokens).interpret(ctx);
    }

    it('simple addition', () => assert.strictEqual(ev(['3','+','4','=']), 7));
    it('simple subtraction', () => assert.strictEqual(ev(['9','-','4','=']), 5));
    it('simple multiplication', () => assert.strictEqual(ev(['6','*','7','=']), 42));
    it('simple division', () => assert.strictEqual(ev(['8','/','4','=']), 2));

    it('operator precedence mul over add', () => {
      // 2 + 3 * 4 = 14 (not 20)
      assert.strictEqual(ev(['2','+','3','*','4','=']), 14);
    });

    it('parentheses override precedence', () => {
      assert.strictEqual(ev(['(','2','+','3',')','*','4','=']), 20);
    });

    it('power', () => assert.strictEqual(ev(['2','**','8','=']), 256));

    it('floor divide', () => assert.strictEqual(ev(['1','7','//','5','=']), 3));

    it('modulo', () => assert.strictEqual(ev(['1','7','%','5','=']), 2));

    it('unary sqrt', () => assert.strictEqual(ev(['sqrt','9','=']), 3.0));

    it('abs of neg', () => assert.strictEqual(ev(['abs','neg','5','=']), 5.0));

    it('nested unary functions', () => {
      assert.strictEqual(ev(['abs','neg','abs','neg','7','=']), 7.0);
    });

    it('function over group (Pythagorean)', () => {
      assert.strictEqual(
        ev(['sqrt','(','3','**','2','+','4','**','2',')','=']), 5.0);
    });

    it('multidigit number', () => {
      assert.strictEqual(ev(['2','3','4','+','0','=']), 234);
    });

    it('decimal number', () => {
      const r = ev(['3','.','1','4','+','0','=']);
      assert.ok(Math.abs(r - 3.14) < 1e-9);
    });

    it('invalid token raises Error', () => {
      assert.throws(() => parseAndBuild(['+', '5']), /Invalid token/);
    });

    it('tree str reflects structure', () => {
      const tree = parseAndBuild(['(','2','+','3',')','*','4','=']);
      const s = tree.toString();
      assert.ok(s.includes('*'));
      assert.ok(s.includes('+'));
    });
  });

});
