// ============================================================
//  Interpreter: Arithmetic Expression Evaluator
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  AbstractExpression   Expression
//  TerminalExpression   NumberExpression, VariableExpression
//  NonterminalExpr.     AddExpression, SubtractExpression,
//                       MultiplyExpression, DivideExpression,
//                       FloorDivideExpression, ModuloExpression,
//                       PowerExpression,
//                       AbsExpression, SqrtExpression,
//                       InverseExpression, FactorialExpression,
//                       PowerOfTenExpression, LogExpression,
//                       NegateExpression
//  Context              Context (variable → number map)
//  Client               Entry point
//
//  Grammar mirrored from EBNF_parser
//  ────────────────────────────────────────────────────────
//  _exp     : + -                         AddExpression, SubtractExpression
//  _term    : * / // %                    MultiplyExpression, DivideExpression,
//                                         FloorDivideExpression, ModuloExpression
//  _power   : **                          PowerExpression
//  _function: abs sqrt 1/x n! 10^y log   AbsExpression, SqrtExpression,
//             x^y neg                     InverseExpression, FactorialExpression,
//                                         PowerOfTenExpression, LogExpression,
//                                         PowerExpression, NegateExpression
//  _digit   : literal / variable          NumberExpression, VariableExpression
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Grammar as classes  each rule is a class; trees are first-class objects
//  ✓ Easy to extend      new operations add a class, touch nothing else
//  ✓ Context reuse       one tree, multiple contexts → multiple results
//  ✗ Class explosion     complex grammars produce many small classes
// ============================================================


// SECTION:: Context
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════
//  Carries the variable bindings needed during interpretation.

export class Context {
  private _vars = new Map<string, number>();

  set(name: string, value: number): this {
    this._vars.set(name, value);
    return this;
  }

  get(name: string): number {
    const v = this._vars.get(name);
    if (v === undefined) throw new Error(`Undefined variable: ${name}`);
    return v;
  }
}


// SECTION:: Abstract Expression
// ═════════════════════════════════════════════════════════════
//  ABSTRACT EXPRESSION
// ═════════════════════════════════════════════════════════════

export interface Expression {
  interpret(ctx: Context): number;
  toString(): string;
}


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════
//  TERMINAL: NumberExpression
// ═════════════════════════════════════════════════════════════

export class NumberExpression implements Expression {
  constructor(private readonly value: number) {}

  interpret(_ctx: Context): number { return this.value; }
  toString(): string { return String(this.value); }
}


// ═════════════════════════════════════════════════════════════
//  TERMINAL: VariableExpression
// ═════════════════════════════════════════════════════════════

export class VariableExpression implements Expression {
  constructor(private readonly name: string) {}

  interpret(ctx: Context): number { return ctx.get(this.name); }
  toString(): string { return this.name; }
}


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AddExpression          _exp rule
// ═════════════════════════════════════════════════════════════

export class AddExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number { return this.left.interpret(ctx) + this.right.interpret(ctx); }
  toString(): string { return `(${this.left} + ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SubtractExpression     _exp rule
// ═════════════════════════════════════════════════════════════

export class SubtractExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number { return this.left.interpret(ctx) - this.right.interpret(ctx); }
  toString(): string { return `(${this.left} - ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: MultiplyExpression     _term rule
// ═════════════════════════════════════════════════════════════

export class MultiplyExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number { return this.left.interpret(ctx) * this.right.interpret(ctx); }
  toString(): string { return `(${this.left} * ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: DivideExpression       _term rule
// ═════════════════════════════════════════════════════════════

export class DivideExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number {
    const d = this.right.interpret(ctx);
    if (d === 0) throw new Error('Division by zero');
    return this.left.interpret(ctx) / d;
  }
  toString(): string { return `(${this.left} / ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FloorDivideExpression  _term rule  (//)
// ═════════════════════════════════════════════════════════════

export class FloorDivideExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number {
    const d = this.right.interpret(ctx);
    if (d === 0) throw new Error('Division by zero');
    return Math.floor(this.left.interpret(ctx) / d);
  }
  toString(): string { return `(${this.left} // ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: ModuloExpression       _term rule  (%)
// ═════════════════════════════════════════════════════════════

export class ModuloExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}

  interpret(ctx: Context): number {
    const d = this.right.interpret(ctx);
    if (d === 0) throw new Error('Division by zero');
    return this.left.interpret(ctx) % d;
  }
  toString(): string { return `(${this.left} % ${this.right})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
// ═════════════════════════════════════════════════════════════

export class PowerExpression implements Expression {
  constructor(private readonly base: Expression, private readonly exponent: Expression) {}

  interpret(ctx: Context): number {
    return Math.pow(this.base.interpret(ctx), this.exponent.interpret(ctx));
  }
  toString(): string { return `(${this.base} ** ${this.exponent})`; }
}


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: NegateExpression       _function rule  (neg)
// ═════════════════════════════════════════════════════════════

export class NegateExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number { return -this.child.interpret(ctx); }
  toString(): string { return `(-${this.child})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AbsExpression          _function rule  (abs)
// ═════════════════════════════════════════════════════════════

export class AbsExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number { return Math.abs(this.child.interpret(ctx)); }
  toString(): string { return `abs(${this.child})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
// ═════════════════════════════════════════════════════════════

export class SqrtExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number {
    const v = this.child.interpret(ctx);
    if (v < 0) throw new Error('Square root of negative number');
    return Math.sqrt(v);
  }
  toString(): string { return `sqrt(${this.child})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: InverseExpression      _function rule  (1/x)
// ═════════════════════════════════════════════════════════════

export class InverseExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number {
    const v = this.child.interpret(ctx);
    if (v === 0) throw new Error('Division by zero');
    return 1 / v;
  }
  toString(): string { return `(1 / ${this.child})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FactorialExpression    _function rule  (n!)
// ═════════════════════════════════════════════════════════════

export class FactorialExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number {
    const n = Math.round(this.child.interpret(ctx));
    if (n < 0) throw new Error('Factorial of negative number');
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }
  toString(): string { return `(${this.child}!)`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
// ═════════════════════════════════════════════════════════════

export class PowerOfTenExpression implements Expression {
  constructor(private readonly exponent: Expression) {}

  interpret(ctx: Context): number { return Math.pow(10, this.exponent.interpret(ctx)); }
  toString(): string { return `(10 ** ${this.exponent})`; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: LogExpression          _function rule  (log)
// ═════════════════════════════════════════════════════════════

export class LogExpression implements Expression {
  constructor(private readonly child: Expression) {}

  interpret(ctx: Context): number {
    const v = this.child.interpret(ctx);
    if (v <= 0) throw new Error('Logarithm of non-positive number');
    return Math.log10(v);
  }
  toString(): string { return `log(${this.child})`; }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
  const SEP = '═'.repeat(64);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Interpreter: Arithmetic Expression Evaluator           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const a = new VariableExpression('a');
  const b = new VariableExpression('b');

  // ── Example 1: basic arithmetic ──────────────────────────────
  const expr1 = new MultiplyExpression(
    new AddExpression(new NumberExpression(3), new NumberExpression(4)),
    new NumberExpression(2),
  );
  console.log(`\n${SEP}`);
  console.log('  Example 1: Basic arithmetic  (3 + 4) * 2');
  console.log(SEP);
  console.log(`  Expression : ${expr1}`);
  console.log(`  Result     : ${expr1.interpret(new Context())}`);

  // ── Example 2: floor divide and modulo ───────────────────────
  const ctx2 = new Context().set('a', 17).set('b', 5);
  const floorDiv = new FloorDivideExpression(a, b);
  const modulo   = new ModuloExpression(a, b);
  console.log(`\n${SEP}`);
  console.log('  Example 2: Floor divide and modulo   a=17, b=5');
  console.log(SEP);
  console.log(`  ${floorDiv}  →  ${floorDiv.interpret(ctx2)}   (17 // 5)`);
  console.log(`  ${modulo}    →  ${modulo.interpret(ctx2)}    (17 % 5)`);

  // ── Example 3: power ─────────────────────────────────────────
  const ctx3  = new Context().set('a', 2).set('b', 10);
  const power = new PowerExpression(a, b);
  console.log(`\n${SEP}`);
  console.log('  Example 3: Power   a=2, b=10');
  console.log(SEP);
  console.log(`  ${power}  →  ${power.interpret(ctx3)}`);

  // ── Example 4: unary functions ───────────────────────────────
  const ctx4 = new Context().set('a', 100).set('b', -9);
  console.log(`\n${SEP}`);
  console.log('  Example 4: Unary functions   a=100, b=-9');
  console.log(SEP);
  console.log(`  sqrt(a)       →  ${new SqrtExpression(a).interpret(ctx4)}`);
  console.log(`  abs(b)        →  ${new AbsExpression(b).interpret(ctx4)}`);
  console.log(`  neg(a)        →  ${new NegateExpression(a).interpret(ctx4)}`);
  console.log(`  1/x (a)       →  ${new InverseExpression(a).interpret(ctx4)}`);
  console.log(`  log(a)        →  ${new LogExpression(a).interpret(ctx4)}`);
  console.log(`  10^b (abs(b)) →  ${new PowerOfTenExpression(new AbsExpression(b)).interpret(ctx4)}`);

  // ── Example 5: factorial ─────────────────────────────────────
  const ctx5 = new Context().set('n', 6);
  const n    = new VariableExpression('n');
  console.log(`\n${SEP}`);
  console.log('  Example 5: Factorial   n=6');
  console.log(SEP);
  console.log(`  ${new FactorialExpression(n)}  →  ${new FactorialExpression(n).interpret(ctx5)}`);

  // ── Example 6: composition ───────────────────────────────────
  // sqrt(abs(a - b))  with a=7, b=23
  const ctx6   = new Context().set('a', 7).set('b', 23);
  const nested = new SqrtExpression(new AbsExpression(new SubtractExpression(a, b)));
  console.log(`\n${SEP}`);
  console.log('  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23');
  console.log(SEP);
  console.log(`  ${nested}  →  ${nested.interpret(ctx6)}`);

  console.log(`\n${SEP}`);
  console.log('  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg');
  console.log('  Each operator and function is its own class.');
  console.log('  Trees compose freely: any node can nest inside any other.');
  console.log(SEP);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Done                                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
} // require.main === module
