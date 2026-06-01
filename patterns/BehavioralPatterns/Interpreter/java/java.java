// ============================================================
//  Interpreter: Arithmetic Expression Evaluator
//  Run: javac java.java && java Main
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
//  Client               Main
//
//  Grammar mirrored from EBNF_parser
//  ────────────────────────────────────────────────────────
//  _exp     : + -           AddExpression, SubtractExpression
//  _term    : * / // %      MultiplyExpression, DivideExpression,
//                           FloorDivideExpression, ModuloExpression
//  _power   : **            PowerExpression
//  _function: abs sqrt 1/x  AbsExpression, SqrtExpression,
//             n! 10^y log   InverseExpression, FactorialExpression,
//             x^y neg       PowerOfTenExpression, LogExpression,
//                           PowerExpression, NegateExpression
//  _digit   : literal / var NumberExpression, VariableExpression
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Grammar as classes  each rule is a class; trees are first-class objects
//  ✓ Easy to extend      new operations add a class, touch nothing else
//  ✓ Context reuse       one tree, multiple contexts → multiple results
//  ✗ Class explosion     complex grammars produce many small classes
// ============================================================

import java.util.*;


// SECTION:: Context
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

class Context {
    private final Map<String, Double> vars = new HashMap<>();

    public Context set(String name, double value) { vars.put(name, value); return this; }

    public double get(String name) {
        if (!vars.containsKey(name))
            throw new NoSuchElementException("Undefined variable: " + name);
        return vars.get(name);
    }
}


// SECTION:: Abstract Expression
// ═════════════════════════════════════════════════════════════
//  ABSTRACT EXPRESSION
// ═════════════════════════════════════════════════════════════

interface Expression {
    double interpret(Context ctx);
    String display();
}


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════
//  TERMINAL: NumberExpression
// ═════════════════════════════════════════════════════════════

class NumberExpression implements Expression {
    private final double value;
    NumberExpression(double v) { this.value = v; }
    @Override public double interpret(Context ctx) { return value; }
    @Override public String display() {
        return value == Math.floor(value) ? String.valueOf((int) value) : String.valueOf(value);
    }
}


// ═════════════════════════════════════════════════════════════
//  TERMINAL: VariableExpression
// ═════════════════════════════════════════════════════════════

class VariableExpression implements Expression {
    private final String name;
    VariableExpression(String n) { this.name = n; }
    @Override public double interpret(Context ctx) { return ctx.get(name); }
    @Override public String display() { return name; }
}


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AddExpression          _exp rule
// ═════════════════════════════════════════════════════════════

class AddExpression implements Expression {
    private final Expression l, r;
    AddExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) + r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " + " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SubtractExpression     _exp rule
// ═════════════════════════════════════════════════════════════

class SubtractExpression implements Expression {
    private final Expression l, r;
    SubtractExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) - r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " - " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: MultiplyExpression     _term rule
// ═════════════════════════════════════════════════════════════

class MultiplyExpression implements Expression {
    private final Expression l, r;
    MultiplyExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) * r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " * " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: DivideExpression       _term rule
// ═════════════════════════════════════════════════════════════

class DivideExpression implements Expression {
    private final Expression l, r;
    DivideExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) {
        double d = r.interpret(ctx);
        if (d == 0) throw new ArithmeticException("Division by zero");
        return l.interpret(ctx) / d;
    }
    @Override public String display() { return "(" + l.display() + " / " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FloorDivideExpression  _term rule  (//)
// ═════════════════════════════════════════════════════════════

class FloorDivideExpression implements Expression {
    private final Expression l, r;
    FloorDivideExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) {
        double d = r.interpret(ctx);
        if (d == 0) throw new ArithmeticException("Division by zero");
        return Math.floor(l.interpret(ctx) / d);
    }
    @Override public String display() { return "(" + l.display() + " // " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: ModuloExpression       _term rule  (%)
// ═════════════════════════════════════════════════════════════

class ModuloExpression implements Expression {
    private final Expression l, r;
    ModuloExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) {
        double d = r.interpret(ctx);
        if (d == 0) throw new ArithmeticException("Division by zero");
        return l.interpret(ctx) % d;
    }
    @Override public String display() { return "(" + l.display() + " % " + r.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
// ═════════════════════════════════════════════════════════════

class PowerExpression implements Expression {
    private final Expression base, exp;
    PowerExpression(Expression b, Expression e) { this.base = b; this.exp = e; }
    @Override public double interpret(Context ctx) { return Math.pow(base.interpret(ctx), exp.interpret(ctx)); }
    @Override public String display() { return "(" + base.display() + " ** " + exp.display() + ")"; }
}


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: NegateExpression       _function rule  (neg)
// ═════════════════════════════════════════════════════════════

class NegateExpression implements Expression {
    private final Expression child;
    NegateExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) { return -child.interpret(ctx); }
    @Override public String display() { return "(-" + child.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AbsExpression          _function rule  (abs)
// ═════════════════════════════════════════════════════════════

class AbsExpression implements Expression {
    private final Expression child;
    AbsExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) { return Math.abs(child.interpret(ctx)); }
    @Override public String display() { return "abs(" + child.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
// ═════════════════════════════════════════════════════════════

class SqrtExpression implements Expression {
    private final Expression child;
    SqrtExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) {
        double v = child.interpret(ctx);
        if (v < 0) throw new ArithmeticException("Square root of negative number");
        return Math.sqrt(v);
    }
    @Override public String display() { return "sqrt(" + child.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: InverseExpression      _function rule  (1/x)
// ═════════════════════════════════════════════════════════════

class InverseExpression implements Expression {
    private final Expression child;
    InverseExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) {
        double v = child.interpret(ctx);
        if (v == 0) throw new ArithmeticException("Division by zero");
        return 1.0 / v;
    }
    @Override public String display() { return "(1 / " + child.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FactorialExpression    _function rule  (n!)
// ═════════════════════════════════════════════════════════════

class FactorialExpression implements Expression {
    private final Expression child;
    FactorialExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) {
        int n = (int) Math.round(child.interpret(ctx));
        if (n < 0) throw new ArithmeticException("Factorial of negative number");
        double result = 1;
        for (int i = 2; i <= n; i++) result *= i;
        return result;
    }
    @Override public String display() { return "(" + child.display() + "!)"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
// ═════════════════════════════════════════════════════════════

class PowerOfTenExpression implements Expression {
    private final Expression exp;
    PowerOfTenExpression(Expression e) { this.exp = e; }
    @Override public double interpret(Context ctx) { return Math.pow(10, exp.interpret(ctx)); }
    @Override public String display() { return "(10 ** " + exp.display() + ")"; }
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: LogExpression          _function rule  (log)
// ═════════════════════════════════════════════════════════════

class LogExpression implements Expression {
    private final Expression child;
    LogExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) {
        double v = child.interpret(ctx);
        if (v <= 0) throw new ArithmeticException("Logarithm of non-positive number");
        return Math.log10(v);
    }
    @Override public String display() { return "log(" + child.display() + ")"; }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

class Main {
    private static final String SEP = "═".repeat(64);

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║       Interpreter: Arithmetic Expression Evaluator           ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        Expression a = new VariableExpression("a");
        Expression b = new VariableExpression("b");

        // ── Example 1: basic arithmetic ──────────────────────────────
        Expression expr1 = new MultiplyExpression(
            new AddExpression(new NumberExpression(3), new NumberExpression(4)),
            new NumberExpression(2));
        System.out.println("\n" + SEP);
        System.out.println("  Example 1: Basic arithmetic  (3 + 4) * 2");
        System.out.println(SEP);
        System.out.println("  Expression : " + expr1.display());
        System.out.println("  Result     : " + (int) expr1.interpret(new Context()));

        // ── Example 2: floor divide and modulo ───────────────────────
        Context ctx2     = new Context().set("a", 17).set("b", 5);
        Expression floorDiv = new FloorDivideExpression(a, b);
        Expression modulo   = new ModuloExpression(a, b);
        System.out.println("\n" + SEP);
        System.out.println("  Example 2: Floor divide and modulo   a=17, b=5");
        System.out.println(SEP);
        System.out.println("  " + floorDiv.display() + "  →  " + (int) floorDiv.interpret(ctx2) + "   (17 // 5)");
        System.out.println("  " + modulo.display()   + "    →  " + (int) modulo.interpret(ctx2)   + "    (17 % 5)");

        // ── Example 3: power ─────────────────────────────────────────
        Context ctx3  = new Context().set("a", 2).set("b", 10);
        Expression power = new PowerExpression(a, b);
        System.out.println("\n" + SEP);
        System.out.println("  Example 3: Power   a=2, b=10");
        System.out.println(SEP);
        System.out.println("  " + power.display() + "  →  " + (int) power.interpret(ctx3));

        // ── Example 4: unary functions ───────────────────────────────
        Context ctx4 = new Context().set("a", 100).set("b", -9);
        System.out.println("\n" + SEP);
        System.out.println("  Example 4: Unary functions   a=100, b=-9");
        System.out.println(SEP);
        System.out.println("  sqrt(a)       →  " + (int) new SqrtExpression(a).interpret(ctx4));
        System.out.println("  abs(b)        →  " + (int) new AbsExpression(b).interpret(ctx4));
        System.out.println("  neg(a)        →  " + (int) new NegateExpression(a).interpret(ctx4));
        System.out.println("  1/x (a)       →  " + new InverseExpression(a).interpret(ctx4));
        System.out.println("  log(a)        →  " + (int) new LogExpression(a).interpret(ctx4));
        System.out.println("  10^b (abs(b)) →  " + (int) new PowerOfTenExpression(new AbsExpression(b)).interpret(ctx4));

        // ── Example 5: factorial ─────────────────────────────────────
        Context ctx5 = new Context().set("n", 6);
        Expression n = new VariableExpression("n");
        System.out.println("\n" + SEP);
        System.out.println("  Example 5: Factorial   n=6");
        System.out.println(SEP);
        System.out.println("  " + new FactorialExpression(n).display() + "  →  " + (int) new FactorialExpression(n).interpret(ctx5));

        // ── Example 6: composition ───────────────────────────────────
        Context ctx6   = new Context().set("a", 7).set("b", 23);
        Expression nested = new SqrtExpression(new AbsExpression(new SubtractExpression(a, b)));
        System.out.println("\n" + SEP);
        System.out.println("  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23");
        System.out.println(SEP);
        System.out.println("  " + nested.display() + "  →  " + (int) nested.interpret(ctx6));

        System.out.println("\n" + SEP);
        System.out.println("  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg");
        System.out.println("  Each operator and function is its own class.");
        System.out.println("  Trees compose freely: any node can nest inside any other.");
        System.out.println(SEP);

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}
