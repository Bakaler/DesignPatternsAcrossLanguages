// ============================================================
//  Chain of Responsibility: Grammar Token Validator
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Handler (abstract)   Handler
//  ConcreteHandlers     SolveHandler, ExpHandler, TermHandler,
//                       PowerHandler, FactorHandler,
//                       FunctionHandler, DigitHandler
//  Context              ParseContext
//  Client               build_chain() + entry point
//
//  Grammar modelled (mirrors EBNF_parser rule hierarchy)
//  ────────────────────────────────────────────────────────
//  SolveHandler   =          evaluation trigger
//  ExpHandler     + -        lowest precedence binary ops
//  TermHandler    * / // %   medium precedence binary ops
//  PowerHandler   **         high precedence binary op
//  FactorHandler  ( )        grouping
//  FunctionHandler abs sqrt ... named unary functions
//  DigitHandler   0-9  .     terminals
//
//  Each handler either CLAIMS the token (returns a result) or
//  PASSES it down the chain.  A token that reaches the end
//  without being claimed is REJECTED (returns null).
//
//  Pipeline (bottom of file)
//  ────────────────────────────────────────────────────────
//  TreeBuilder consumes the CoR results and constructs an
//  Interpreter expression tree (shunting-yard algorithm).
//  Calling .build() returns the root Expression node, which
//  you then evaluate with .interpret(ctx).
//
//  Full pipeline:
//      tokens → CoR chain → TreeBuilder → Expression tree
//                                       → .interpret(ctx)
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  Decoupled validation  each rule knows only its own tokens
//  Ordered chain         grammar precedence = chain position
//  Easy to extend        add a handler, insert it anywhere
//  Explicit rejection    null propagates back to the caller
//  Composable with Interpreter  CoR validates and classifies;
//                               Interpreter evaluates
// ============================================================

import {
  Context, Expression, NumberExpression,
  AddExpression, SubtractExpression, MultiplyExpression, DivideExpression,
  FloorDivideExpression, ModuloExpression, PowerExpression,
  AbsExpression, SqrtExpression, InverseExpression, FactorialExpression,
  LogExpression, NegateExpression,
} from '../../Interpreter/typescript/typescript';


// SECTION:: Constants
// ═════════════════════════════════════════════════════════════
//  CONSTANTS
// ═════════════════════════════════════════════════════════════

export const OPERANDS = new Set(['+', '-', '*', '**', '/', '//', '%']);
export const DEFAULT_FUNCTIONS = new Set(['abs', 'sqrt', 'neg', 'square', 'inverse', 'factorial', 'log']);


// SECTION:: ParseContext
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

export class ParseContext {
  /**
   * Carries the state each handler needs to make validation decisions.
   *
   * trailing    : the last accepted token string, or null at the start
   * parenDepth  : number of unmatched '(' currently open
   * hasDecimal  : true if the current number segment already has a '.'
   */
  constructor(
    public readonly trailing: string | null = null,
    public readonly parenDepth: number = 0,
    public readonly hasDecimal: boolean = false,
  ) {}
}


// SECTION:: Abstract Handler
// ═════════════════════════════════════════════════════════════
//  ABSTRACT HANDLER
// ═════════════════════════════════════════════════════════════

export abstract class Handler {
  /**
   * Every grammar-rule handler inherits from this class.
   *
   * setNext(handler)   wire the next link in the chain;
   *                    returns the handler so calls can be chained.
   * handle(token, ctx) subclasses implement this.
   *                    Return [tokenType, processedToken] to CLAIM,
   *                    or call _pass() to forward, which ultimately
   *                    returns null if no handler claims the token.
   */
  protected _next: Handler | null = null;

  setNext(handler: Handler): Handler {
    this._next = handler;
    return handler;
  }

  abstract handle(token: string, ctx: ParseContext): [string, string] | null;

  protected _pass(token: string, ctx: ParseContext): [string, string] | null {
    if (this._next) return this._next.handle(token, ctx);
    return null;
  }

  toString(): string { return this.constructor.name; }
}


// SECTION:: Concrete Handlers
// ═════════════════════════════════════════════════════════════
//  SOLVE HANDLER: '='
// ═════════════════════════════════════════════════════════════

export class SolveHandler extends Handler {
  /** Claims '=' unconditionally; it is always a valid evaluation trigger. */
  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (token === '=') return ['Solve', token];
    return this._pass(token, ctx);
  }
}


// ═════════════════════════════════════════════════════════════
//  EXP HANDLER: +  -
// ═════════════════════════════════════════════════════════════

export class ExpHandler extends Handler {
  /**
   * _exp rule.  Claims '+' and '-'.
   *
   * Valid   : trailing is a digit, ')', or a function name
   *           (i.e. there is a left-hand operand)
   * Invalid : nothing entered yet, or trailing is '(' or an operator
   */
  private static readonly TOKENS = new Set(['+', '-']);

  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (!ExpHandler.TOKENS.has(token)) return this._pass(token, ctx);

    if (ctx.trailing === null) return null;                // nothing on the left
    if (ctx.trailing === '(' || OPERANDS.has(ctx.trailing)) return null;  // no left-hand value

    return ['Exp', ` ${token} `];
  }
}


// ═════════════════════════════════════════════════════════════
//  TERM HANDLER: *  /  //  %
// ═════════════════════════════════════════════════════════════

export class TermHandler extends Handler {
  /**
   * _term rule.  Claims '*', '/', '//', '%'.
   * Same left-operand requirement as ExpHandler.
   * Note: '**' is a distinct token and passes through here unclaimed.
   */
  private static readonly TOKENS = new Set(['*', '/', '//', '%']);

  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (!TermHandler.TOKENS.has(token)) return this._pass(token, ctx);

    if (ctx.trailing === null) return null;
    if (ctx.trailing === '(' || OPERANDS.has(ctx.trailing)) return null;

    return ['Term', ` ${token} `];
  }
}


// ═════════════════════════════════════════════════════════════
//  POWER HANDLER: **
// ═════════════════════════════════════════════════════════════

export class PowerHandler extends Handler {
  /**
   * _power rule.  Claims '**'.
   * Passes '*' through so TermHandler catches single-star multiplication.
   */
  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (token !== '**') return this._pass(token, ctx);

    if (ctx.trailing === null) return null;
    if (ctx.trailing === '(' || OPERANDS.has(ctx.trailing)) return null;

    return ['Power', ` ${token} `];
  }
}


// ═════════════════════════════════════════════════════════════
//  FACTOR HANDLER: (  )
// ═════════════════════════════════════════════════════════════

export class FactorHandler extends Handler {
  /**
   * _factor rule.  Claims '(' and ')'.
   *
   * '(' is always accepted (open a new group).
   * ')' requires at least one unmatched '(' to be open (parenDepth > 0).
   */
  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (token === '(') return ['Factor', token];

    if (token === ')') {
      if (ctx.parenDepth <= 0) return null;   // nothing to close
      return ['Factor', token];
    }

    return this._pass(token, ctx);
  }
}


// ═════════════════════════════════════════════════════════════
//  FUNCTION HANDLER: abs  sqrt  neg  ...
// ═════════════════════════════════════════════════════════════

export class FunctionHandler extends Handler {
  /**
   * _function rule.  Claims any token in the supplied function set.
   * The set is injected at construction so the handler stays open for
   * extension without modification.
   */
  constructor(private readonly functions: Set<string>) { super(); }

  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (this.functions.has(token)) return ['Function', token];
    return this._pass(token, ctx);
  }
}


// ═════════════════════════════════════════════════════════════
//  DIGIT HANDLER: 0-9  .
// ═════════════════════════════════════════════════════════════

export class DigitHandler extends Handler {
  /**
   * _digit rule.  Terminal handler; end of the chain.
   *
   * Single digits 0-9 are always accepted unless trailing is ')'.
   * '.' is accepted when the current number has no decimal yet;
   *      a bare '.' is prefixed with '0' → returned as ["SoloDec", "0."].
   * Everything else falls off the chain as null (rejected).
   */
  handle(token: string, ctx: ParseContext): [string, string] | null {
    if (ctx.trailing === ')') return null;   // digit after ')' needs explicit '*' first

    if (/^\d$/.test(token)) return ['Digit', token];

    if (token === '.') {
      if (ctx.hasDecimal) return null;       // second decimal in same number
      return ['SoloDec', '0.'];
    }

    return null;                             // unrecognised; chain exhausted
  }
}


// SECTION:: Chain Factory
// ═════════════════════════════════════════════════════════════
//  CHAIN FACTORY
// ═════════════════════════════════════════════════════════════

export function buildChain(functions?: Set<string>): Handler {
  /**
   * Assemble the validation chain and return its head.
   *
   * Chain order mirrors grammar precedence (lowest to highest):
   *   SolveHandler
   *     → ExpHandler        (+ -)
   *     → TermHandler       (* / // %)
   *     → PowerHandler      (**)
   *     → FactorHandler     ( )
   *     → FunctionHandler   (abs sqrt ...)
   *     → DigitHandler      (0-9 .)
   */
  const fns = functions ?? DEFAULT_FUNCTIONS;

  const head  = new SolveHandler();
  const exp   = new ExpHandler();
  const term  = new TermHandler();
  const power = new PowerHandler();
  const fact  = new FactorHandler();
  const func  = new FunctionHandler(fns);
  const digit = new DigitHandler();

  head.setNext(exp)
      .setNext(term)
      .setNext(power)
      .setNext(fact)
      .setNext(func)
      .setNext(digit);

  return head;
}


// SECTION:: TreeBuilder
// ═════════════════════════════════════════════════════════════
//  TREE BUILDER: CoR + Interpreter pipeline
// ═════════════════════════════════════════════════════════════

// Precedence table for binary operators
const PRECEDENCE: Record<string, number> = {
  '+': 1, '-': 1,
  '*': 2, '/': 2, '//': 2, '%': 2,
  '**': 3,
};

// Map token → binary Expression constructor
type BinaryCtor = (l: Expression, r: Expression) => Expression;
const BINARY: Record<string, BinaryCtor> = {
  '+':  (l, r) => new AddExpression(l, r),
  '-':  (l, r) => new SubtractExpression(l, r),
  '*':  (l, r) => new MultiplyExpression(l, r),
  '/':  (l, r) => new DivideExpression(l, r),
  '//': (l, r) => new FloorDivideExpression(l, r),
  '%':  (l, r) => new ModuloExpression(l, r),
  '**': (l, r) => new PowerExpression(l, r),
};

// Map function name → unary Expression constructor
type UnaryCtor = (x: Expression) => Expression;
const UNARY: Record<string, UnaryCtor> = {
  'abs':       x => new AbsExpression(x),
  'sqrt':      x => new SqrtExpression(x),
  'neg':       x => new NegateExpression(x),
  'square':    x => new PowerExpression(x, new NumberExpression(2)),
  'inverse':   x => new InverseExpression(x),
  'factorial': x => new FactorialExpression(x),
  'log':       x => new LogExpression(x),
};

export class TreeBuilder {
  /**
   * Consumes [tokenType, processedToken] pairs (exactly what the
   * CoR chain returns) and builds an Interpreter expression tree using
   * the shunting-yard algorithm.
   *
   * Usage:
   *   const builder = new TreeBuilder();
   *   const chain   = buildChain();
   *   let   ctx     = new ParseContext();
   *
   *   for (const token of tokens) {
   *     const result = chain.handle(token, ctx);
   *     if (!result) throw new Error(`Invalid token: ${token}`);
   *     builder.push(...result);
   *     ctx = updateCtx(ctx, token, result);
   *   }
   *
   *   const tree = builder.build();
   *   console.log(tree.interpret(new Context()));
   */

  private output: Expression[] = [];
  private ops: string[] = [];
  private pending: string = '';

  push(tokenType: string, token: string): void {
    const stripped = token.trim();

    if (tokenType === 'Digit') {
      this.pending += stripped;

    } else if (tokenType === 'SoloDec') {
      // '.' after existing digits → extend; solo → start at '0.'
      this.pending += this.pending ? '.' : '0.';

    } else if (tokenType === 'Exp' || tokenType === 'Term' || tokenType === 'Power') {
      this._flushPending();
      const prec = PRECEDENCE[stripped];
      // Pop higher-or-equal-precedence binary ops before pushing
      while (
        this.ops.length > 0 &&
        this.ops[this.ops.length - 1] !== '(' &&
        !(this.ops[this.ops.length - 1] in UNARY) &&
        (PRECEDENCE[this.ops[this.ops.length - 1]] ?? 0) >= prec
      ) {
        this._applyBinary();
      }
      this.ops.push(stripped);

    } else if (tokenType === 'Function') {
      this._flushPending();
      this.ops.push(stripped);

    } else if (tokenType === 'Factor') {
      if (stripped === '(') {
        this._flushPending();
        this.ops.push('(');
      } else {   // ')'
        this._flushPending();
        while (this.ops.length > 0 && this.ops[this.ops.length - 1] !== '(') {
          this._applyTop();
        }
        if (this.ops.length > 0) this.ops.pop();  // discard '('
        // If a function sits just outside the group, apply it now
        if (this.ops.length > 0 && this.ops[this.ops.length - 1] in UNARY) {
          this._applyUnary();
        }
      }

    } else if (tokenType === 'Solve') {
      this._flushPending();
      while (this.ops.length > 0) this._applyTop();
    }
  }

  build(): Expression {
    /**
     * Flush any remaining state and return the root Expression node.
     * Call this after all tokens (including '=') have been pushed.
     */
    this._flushPending();
    while (this.ops.length > 0) this._applyTop();
    return this.output.length > 0 ? this.output[this.output.length - 1] : new NumberExpression(0);
  }

  private _flushPending(): void {
    if (this.pending) {
      this.output.push(new NumberExpression(parseFloat(this.pending)));
      this.pending = '';
    }
  }

  private _applyTop(): void {
    const top = this.ops[this.ops.length - 1];
    if (top in UNARY) this._applyUnary();
    else this._applyBinary();
  }

  private _applyBinary(): void {
    const op    = this.ops.pop()!;
    const right = this.output.pop()!;
    const left  = this.output.pop()!;
    this.output.push(BINARY[op](left, right));
  }

  private _applyUnary(): void {
    const fn      = this.ops.pop()!;
    const operand = this.output.pop()!;
    this.output.push(UNARY[fn](operand));
  }
}


export function parseAndBuild(tokens: string[], functions?: Set<string>): Expression {
  /**
   * Convenience function: feed a token list through the full pipeline
   * and return the root Expression node ready for .interpret().
   *
   * Throws Error on the first invalid token.
   */
  const chain   = buildChain(functions);
  const builder = new TreeBuilder();
  let   ctx     = new ParseContext();

  for (const tok of tokens) {
    const result = chain.handle(tok, ctx);
    if (!result) throw new Error(`Invalid token ${JSON.stringify(tok)} after ${JSON.stringify(ctx.trailing)}`);
    builder.push(...result);

    const [tokenType] = result;
    let parenDepth = ctx.parenDepth;
    let hasDecimal = ctx.hasDecimal;

    if (tok === '(') { parenDepth += 1; hasDecimal = false; }
    else if (tok === ')') { parenDepth -= 1; }
    else if (tokenType === 'Exp' || tokenType === 'Term' || tokenType === 'Power') { hasDecimal = false; }
    else if (tok === '.') { hasDecimal = true; }

    ctx = new ParseContext(tok, parenDepth, hasDecimal);
  }

  return builder.build();
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
  const SEP = '═'.repeat(64);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Chain of Responsibility + Interpreter: Full Pipeline        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const ctx = new Context();

  // ── Part 1: CoR validation chain alone ──────────────────────
  console.log(`\n${SEP}`);
  console.log('  Part 1 - CoR chain: validate and classify tokens');
  console.log(SEP);

  const chain = buildChain();
  const demos: [string[], string][] = [
    [['2','3','4','+','(','1','2','/','3',')','='], '234 + (12 / 3)'],
    [['+', '5'],                                     "leading '+'   rejected"],
    [['1','2','+','+'],                              '12 + +        rejected'],
  ];
  for (const [tokens, label] of demos) {
    console.log(`\n  ${label}`);
    let c = new ParseContext();
    for (const tok of tokens) {
      const r = chain.handle(tok, c);
      console.log(`    ${JSON.stringify(tok).padEnd(7)} → ${JSON.stringify(r)}`);
      if (!r) break;
      const [tt] = r;
      let pd = c.parenDepth + (tok === '(' ? 1 : tok === ')' ? -1 : 0);
      const hd = (c.hasDecimal || tok === '.') && tt !== 'Exp' && tt !== 'Term' && tt !== 'Power';
      c = new ParseContext(tok, pd, hd);
    }
  }

  // ── Part 2: Full pipeline ────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log('  Part 2 - Full pipeline: tokens → CoR → tree → interpret()');
  console.log(SEP);

  const examples: [string[], string][] = [
    [['3','+','4','='],                               '3 + 4'],
    [['2','+','3','*','4','='],                        '2 + 3 * 4  (precedence)'],
    [['(','2','+','3',')','*','4','='],                '(2 + 3) * 4'],
    [['2','**','8','='],                               '2 ** 8'],
    [['sqrt','9','='],                                 'sqrt 9'],
    [['abs','neg','5','='],                            'abs(neg(5))'],
    [['sqrt','(','3','**','2','+','4','**','2',')','='], 'sqrt(3^2 + 4^2)  Pythagorean'],
    [['1','7','%','5','='],                            '17 % 5'],
    [['1','5','//','4','='],                           '15 // 4'],
  ];

  for (const [tokens, label] of examples) {
    const tree   = parseAndBuild(tokens);
    const result = tree.interpret(ctx);
    const display = (result === Math.floor(result)) ? result.toFixed(0) : result;
    console.log(`  ${label.padEnd(35)}  tree: ${tree.toString().padEnd(40)}  = ${display}`);
  }

  console.log(`\n${SEP}`);
  console.log('  CoR owns VALIDATION.  Interpreter owns EVALUATION.');
  console.log('  TreeBuilder is the only piece that knows about both.');
  console.log(SEP);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Done                                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}
