// ============================================================
//  Interpreter: Arithmetic Expression Evaluator
//  Run: dotnet script csharp.cs
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  AbstractExpression   IExpression
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

using System;
using System.Collections.Generic;


// SECTION:: Context
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

public class Context {
    private readonly Dictionary<string, double> _vars = new();

    public Context Set(string name, double value) { _vars[name] = value; return this; }

    public double Get(string name) {
        if (!_vars.TryGetValue(name, out double val))
            throw new KeyNotFoundException($"Undefined variable: {name}");
        return val;
    }
}


// SECTION:: Abstract Expression
// ═════════════════════════════════════════════════════════════
//  ABSTRACT EXPRESSION
// ═════════════════════════════════════════════════════════════

public interface IExpression {
    double Interpret(Context ctx);
    string Display();
}


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════
//  TERMINAL: NumberExpression
// ═════════════════════════════════════════════════════════════

public class NumberExpression : IExpression {
    private readonly double _value;
    public NumberExpression(double v) => _value = v;
    public double Interpret(Context _) => _value;
    public string Display() => _value == Math.Floor(_value) ? ((int)_value).ToString() : _value.ToString();
}


// ═════════════════════════════════════════════════════════════
//  TERMINAL: VariableExpression
// ═════════════════════════════════════════════════════════════

public class VariableExpression : IExpression {
    private readonly string _name;
    public VariableExpression(string name) => _name = name;
    public double Interpret(Context ctx) => ctx.Get(_name);
    public string Display() => _name;
}


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AddExpression          _exp rule
// ═════════════════════════════════════════════════════════════

public class AddExpression : IExpression {
    private readonly IExpression _l, _r;
    public AddExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) + _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} + {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SubtractExpression     _exp rule
// ═════════════════════════════════════════════════════════════

public class SubtractExpression : IExpression {
    private readonly IExpression _l, _r;
    public SubtractExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) - _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} - {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: MultiplyExpression     _term rule
// ═════════════════════════════════════════════════════════════

public class MultiplyExpression : IExpression {
    private readonly IExpression _l, _r;
    public MultiplyExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) * _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} * {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: DivideExpression       _term rule
// ═════════════════════════════════════════════════════════════

public class DivideExpression : IExpression {
    private readonly IExpression _l, _r;
    public DivideExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) {
        double d = _r.Interpret(ctx);
        if (d == 0) throw new DivideByZeroException("Division by zero");
        return _l.Interpret(ctx) / d;
    }
    public string Display() => $"({_l.Display()} / {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FloorDivideExpression  _term rule  (//)
// ═════════════════════════════════════════════════════════════

public class FloorDivideExpression : IExpression {
    private readonly IExpression _l, _r;
    public FloorDivideExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) {
        double d = _r.Interpret(ctx);
        if (d == 0) throw new DivideByZeroException("Division by zero");
        return Math.Floor(_l.Interpret(ctx) / d);
    }
    public string Display() => $"({_l.Display()} // {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: ModuloExpression       _term rule  (%)
// ═════════════════════════════════════════════════════════════

public class ModuloExpression : IExpression {
    private readonly IExpression _l, _r;
    public ModuloExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) {
        double d = _r.Interpret(ctx);
        if (d == 0) throw new DivideByZeroException("Division by zero");
        return _l.Interpret(ctx) % d;
    }
    public string Display() => $"({_l.Display()} % {_r.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
// ═════════════════════════════════════════════════════════════

public class PowerExpression : IExpression {
    private readonly IExpression _base, _exp;
    public PowerExpression(IExpression b, IExpression e) { _base = b; _exp = e; }
    public double Interpret(Context ctx) => Math.Pow(_base.Interpret(ctx), _exp.Interpret(ctx));
    public string Display() => $"({_base.Display()} ** {_exp.Display()})";
}


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: NegateExpression       _function rule  (neg)
// ═════════════════════════════════════════════════════════════

public class NegateExpression : IExpression {
    private readonly IExpression _child;
    public NegateExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) => -_child.Interpret(ctx);
    public string Display() => $"(-{_child.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AbsExpression          _function rule  (abs)
// ═════════════════════════════════════════════════════════════

public class AbsExpression : IExpression {
    private readonly IExpression _child;
    public AbsExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) => Math.Abs(_child.Interpret(ctx));
    public string Display() => $"abs({_child.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
// ═════════════════════════════════════════════════════════════

public class SqrtExpression : IExpression {
    private readonly IExpression _child;
    public SqrtExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) {
        double v = _child.Interpret(ctx);
        if (v < 0) throw new ArithmeticException("Square root of negative number");
        return Math.Sqrt(v);
    }
    public string Display() => $"sqrt({_child.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: InverseExpression      _function rule  (1/x)
// ═════════════════════════════════════════════════════════════

public class InverseExpression : IExpression {
    private readonly IExpression _child;
    public InverseExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) {
        double v = _child.Interpret(ctx);
        if (v == 0) throw new DivideByZeroException("Division by zero");
        return 1.0 / v;
    }
    public string Display() => $"(1 / {_child.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FactorialExpression    _function rule  (n!)
// ═════════════════════════════════════════════════════════════

public class FactorialExpression : IExpression {
    private readonly IExpression _child;
    public FactorialExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) {
        int n = (int)Math.Round(_child.Interpret(ctx));
        if (n < 0) throw new ArithmeticException("Factorial of negative number");
        double result = 1;
        for (int i = 2; i <= n; i++) result *= i;
        return result;
    }
    public string Display() => $"({_child.Display()}!)";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
// ═════════════════════════════════════════════════════════════

public class PowerOfTenExpression : IExpression {
    private readonly IExpression _exp;
    public PowerOfTenExpression(IExpression e) => _exp = e;
    public double Interpret(Context ctx) => Math.Pow(10, _exp.Interpret(ctx));
    public string Display() => $"(10 ** {_exp.Display()})";
}


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: LogExpression          _function rule  (log)
// ═════════════════════════════════════════════════════════════

public class LogExpression : IExpression {
    private readonly IExpression _child;
    public LogExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) {
        double v = _child.Interpret(ctx);
        if (v <= 0) throw new ArithmeticException("Logarithm of non-positive number");
        return Math.Log10(v);
    }
    public string Display() => $"log({_child.Display()})";
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
#if !TESTING

var SEP = new string('═', 64);

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║       Interpreter: Arithmetic Expression Evaluator           ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

IExpression a = new VariableExpression("a");
IExpression b = new VariableExpression("b");

// ── Example 1: basic arithmetic ──────────────────────────────
var expr1 = new MultiplyExpression(
    new AddExpression(new NumberExpression(3), new NumberExpression(4)),
    new NumberExpression(2));
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 1: Basic arithmetic  (3 + 4) * 2");
Console.WriteLine(SEP);
Console.WriteLine($"  Expression : {expr1.Display()}");
Console.WriteLine($"  Result     : {expr1.Interpret(new Context())}");

// ── Example 2: floor divide and modulo ───────────────────────
var ctx2     = new Context().Set("a", 17).Set("b", 5);
var floorDiv = new FloorDivideExpression(a, b);
var modulo   = new ModuloExpression(a, b);
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 2: Floor divide and modulo   a=17, b=5");
Console.WriteLine(SEP);
Console.WriteLine($"  {floorDiv.Display()}  →  {floorDiv.Interpret(ctx2)}   (17 // 5)");
Console.WriteLine($"  {modulo.Display()}    →  {modulo.Interpret(ctx2)}    (17 % 5)");

// ── Example 3: power ─────────────────────────────────────────
var ctx3  = new Context().Set("a", 2).Set("b", 10);
var power = new PowerExpression(a, b);
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 3: Power   a=2, b=10");
Console.WriteLine(SEP);
Console.WriteLine($"  {power.Display()}  →  {power.Interpret(ctx3)}");

// ── Example 4: unary functions ───────────────────────────────
var ctx4 = new Context().Set("a", 100).Set("b", -9);
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 4: Unary functions   a=100, b=-9");
Console.WriteLine(SEP);
Console.WriteLine($"  sqrt(a)       →  {new SqrtExpression(a).Interpret(ctx4)}");
Console.WriteLine($"  abs(b)        →  {new AbsExpression(b).Interpret(ctx4)}");
Console.WriteLine($"  neg(a)        →  {new NegateExpression(a).Interpret(ctx4)}");
Console.WriteLine($"  1/x (a)       →  {new InverseExpression(a).Interpret(ctx4)}");
Console.WriteLine($"  log(a)        →  {new LogExpression(a).Interpret(ctx4)}");
Console.WriteLine($"  10^b (abs(b)) →  {new PowerOfTenExpression(new AbsExpression(b)).Interpret(ctx4)}");

// ── Example 5: factorial ─────────────────────────────────────
var ctx5 = new Context().Set("n", 6);
IExpression n = new VariableExpression("n");
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 5: Factorial   n=6");
Console.WriteLine(SEP);
Console.WriteLine($"  {new FactorialExpression(n).Display()}  →  {new FactorialExpression(n).Interpret(ctx5)}");

// ── Example 6: composition ───────────────────────────────────
var ctx6   = new Context().Set("a", 7).Set("b", 23);
var nested = new SqrtExpression(new AbsExpression(new SubtractExpression(a, b)));
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23");
Console.WriteLine(SEP);
Console.WriteLine($"  {nested.Display()}  →  {nested.Interpret(ctx6)}");

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg");
Console.WriteLine("  Each operator and function is its own class.");
Console.WriteLine("  Trees compose freely: any node can nest inside any other.");
Console.WriteLine(SEP);

Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Done                                                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

#endif // !TESTING
