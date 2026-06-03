// ============================================================
//  Chain of Responsibility: Grammar Token Validator
//  Run: dotnet script csharp.cs
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Handler (abstract)   Handler
//  ConcreteHandlers     SolveHandler, ExpHandler, TermHandler,
//                       PowerHandler, FactorHandler,
//                       FunctionHandler, DigitHandler
//  Context              ParseContext
//  Client               build_chain() + top-level statements
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
//  Calling .Build() returns the root IExpression node, which
//  you then evaluate with .Interpret(ctx).
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

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;


// ─────────────────────────────────────────────────────────────
//  Interpreter Expression classes (inlined from Interpreter)
// ─────────────────────────────────────────────────────────────

// SECTION:: Context (Interpreter)
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

public interface IExpression {
    double Interpret(Context ctx);
    string Display();
}


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════

public class NumberExpression : IExpression {
    private readonly double _value;
    public NumberExpression(double v) => _value = v;
    public double Interpret(Context _) => _value;
    public string Display() => _value == Math.Floor(_value) ? ((int)_value).ToString() : _value.ToString();
}

public class VariableExpression : IExpression {
    private readonly string _name;
    public VariableExpression(string name) => _name = name;
    public double Interpret(Context ctx) => ctx.Get(_name);
    public string Display() => _name;
}


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════

public class AddExpression : IExpression {
    private readonly IExpression _l, _r;
    public AddExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) + _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} + {_r.Display()})";
}

public class SubtractExpression : IExpression {
    private readonly IExpression _l, _r;
    public SubtractExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) - _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} - {_r.Display()})";
}

public class MultiplyExpression : IExpression {
    private readonly IExpression _l, _r;
    public MultiplyExpression(IExpression l, IExpression r) { _l = l; _r = r; }
    public double Interpret(Context ctx) => _l.Interpret(ctx) * _r.Interpret(ctx);
    public string Display() => $"({_l.Display()} * {_r.Display()})";
}

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

public class PowerExpression : IExpression {
    private readonly IExpression _base, _exp;
    public PowerExpression(IExpression b, IExpression e) { _base = b; _exp = e; }
    public double Interpret(Context ctx) => Math.Pow(_base.Interpret(ctx), _exp.Interpret(ctx));
    public string Display() => $"({_base.Display()} ** {_exp.Display()})";
}


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════

public class NegateExpression : IExpression {
    private readonly IExpression _child;
    public NegateExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) => -_child.Interpret(ctx);
    public string Display() => $"(-{_child.Display()})";
}

public class AbsExpression : IExpression {
    private readonly IExpression _child;
    public AbsExpression(IExpression c) => _child = c;
    public double Interpret(Context ctx) => Math.Abs(_child.Interpret(ctx));
    public string Display() => $"abs({_child.Display()})";
}

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

public class PowerOfTenExpression : IExpression {
    private readonly IExpression _exp;
    public PowerOfTenExpression(IExpression e) => _exp = e;
    public double Interpret(Context ctx) => Math.Pow(10, _exp.Interpret(ctx));
    public string Display() => $"(10 ** {_exp.Display()})";
}

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


// ─────────────────────────────────────────────────────────────
//  CoR: Constants
// ─────────────────────────────────────────────────────────────

// SECTION:: Constants
// ═════════════════════════════════════════════════════════════
//  CONSTANTS
// ═════════════════════════════════════════════════════════════

public static class CoRConstants {
    public static readonly HashSet<string> Operands = new() {
        "+", "-", "*", "**", "/", "//", "%"
    };
    public static readonly HashSet<string> DefaultFunctions = new() {
        "abs", "sqrt", "neg", "square", "inverse", "factorial", "log"
    };
}


// SECTION:: ParseContext
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

public record ParseContext(
    string? Trailing   = null,
    int     ParenDepth = 0,
    bool    HasDecimal = false
);


// SECTION:: Abstract Handler
// ═════════════════════════════════════════════════════════════
//  ABSTRACT HANDLER
// ═════════════════════════════════════════════════════════════

public abstract class Handler {
    protected Handler? Next;

    public Handler SetNext(Handler h) { Next = h; return h; }

    public abstract (string, string)? Handle(string token, ParseContext ctx);

    protected (string, string)? Pass(string token, ParseContext ctx)
        => Next?.Handle(token, ctx);

    public override string ToString() => GetType().Name;
}


// SECTION:: Concrete Handlers
// ═════════════════════════════════════════════════════════════
//  SOLVE HANDLER: '='
// ═════════════════════════════════════════════════════════════

public class SolveHandler : Handler {
    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (token == "=") return ("Solve", token);
        return Pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  EXP HANDLER: +  -
// ═════════════════════════════════════════════════════════════

public class ExpHandler : Handler {
    private static readonly HashSet<string> Tokens = new() { "+", "-" };

    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (!Tokens.Contains(token)) return Pass(token, ctx);

        if (ctx.Trailing is null) return null;
        if (ctx.Trailing == "(" || CoRConstants.Operands.Contains(ctx.Trailing)) return null;

        return ("Exp", $" {token} ");
    }
}


// ═════════════════════════════════════════════════════════════
//  TERM HANDLER: *  /  //  %
// ═════════════════════════════════════════════════════════════

public class TermHandler : Handler {
    private static readonly HashSet<string> Tokens = new() { "*", "/", "//", "%" };

    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (!Tokens.Contains(token)) return Pass(token, ctx);

        if (ctx.Trailing is null) return null;
        if (ctx.Trailing == "(" || CoRConstants.Operands.Contains(ctx.Trailing)) return null;

        return ("Term", $" {token} ");
    }
}


// ═════════════════════════════════════════════════════════════
//  POWER HANDLER: **
// ═════════════════════════════════════════════════════════════

public class PowerHandler : Handler {
    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (token != "**") return Pass(token, ctx);

        if (ctx.Trailing is null) return null;
        if (ctx.Trailing == "(" || CoRConstants.Operands.Contains(ctx.Trailing)) return null;

        return ("Power", $" {token} ");
    }
}


// ═════════════════════════════════════════════════════════════
//  FACTOR HANDLER: (  )
// ═════════════════════════════════════════════════════════════

public class FactorHandler : Handler {
    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (token == "(") return ("Factor", token);

        if (token == ")") {
            if (ctx.ParenDepth <= 0) return null;
            return ("Factor", token);
        }

        return Pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  FUNCTION HANDLER: abs  sqrt  neg  ...
// ═════════════════════════════════════════════════════════════

public class FunctionHandler : Handler {
    private readonly HashSet<string> _functions;
    public FunctionHandler(HashSet<string> functions) => _functions = functions;

    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (_functions.Contains(token)) return ("Function", token);
        return Pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  DIGIT HANDLER: 0-9  .
// ═════════════════════════════════════════════════════════════

public class DigitHandler : Handler {
    public override (string, string)? Handle(string token, ParseContext ctx) {
        if (ctx.Trailing == ")") return null;

        if (token.Length == 1 && char.IsDigit(token[0]))
            return ("Digit", token);

        if (token == ".") {
            if (ctx.HasDecimal) return null;
            return ("SoloDec", "0.");
        }

        return null;
    }
}


// SECTION:: Chain Factory
// ═════════════════════════════════════════════════════════════
//  CHAIN FACTORY
// ═════════════════════════════════════════════════════════════

public static class ChainFactory {
    public static Handler BuildChain(HashSet<string>? functions = null) {
        functions ??= CoRConstants.DefaultFunctions;

        var head  = new SolveHandler();
        var exp   = new ExpHandler();
        var term  = new TermHandler();
        var power = new PowerHandler();
        var fact  = new FactorHandler();
        var func  = new FunctionHandler(functions);
        var digit = new DigitHandler();

        head.SetNext(exp)
            .SetNext(term)
            .SetNext(power)
            .SetNext(fact)
            .SetNext(func)
            .SetNext(digit);

        return head;
    }
}


// SECTION:: TreeBuilder
// ═════════════════════════════════════════════════════════════
//  TREE BUILDER: CoR + Interpreter pipeline
// ═════════════════════════════════════════════════════════════

public class TreeBuilder {
    private static readonly Dictionary<string, int> Precedence = new() {
        ["+"] = 1, ["-"] = 1,
        ["*"] = 2, ["/"] = 2, ["//"] = 2, ["%"] = 2,
        ["**"] = 3,
    };

    private static readonly HashSet<string> UnaryNames = new() {
        "abs", "sqrt", "neg", "square", "inverse", "factorial", "log"
    };

    private readonly Stack<IExpression> _output = new();
    private readonly Stack<string>      _ops    = new();
    private string _pending = "";

    public void Push(string tokenType, string token) {
        var stripped = token.Trim();

        if (tokenType == "Digit") {
            _pending += stripped;

        } else if (tokenType == "SoloDec") {
            _pending += _pending.Length > 0 ? "." : "0.";

        } else if (tokenType is "Exp" or "Term" or "Power") {
            FlushPending();
            int prec = Precedence.GetValueOrDefault(stripped, 0);
            while (_ops.Count > 0
                   && _ops.Peek() != "("
                   && !UnaryNames.Contains(_ops.Peek())
                   && Precedence.GetValueOrDefault(_ops.Peek(), 0) >= prec) {
                ApplyBinary();
            }
            _ops.Push(stripped);

        } else if (tokenType == "Function") {
            FlushPending();
            _ops.Push(stripped);

        } else if (tokenType == "Factor") {
            if (stripped == "(") {
                FlushPending();
                _ops.Push("(");
            } else {
                FlushPending();
                while (_ops.Count > 0 && _ops.Peek() != "(") ApplyTop();
                if (_ops.Count > 0) _ops.Pop();   // discard '('
                if (_ops.Count > 0 && UnaryNames.Contains(_ops.Peek())) ApplyUnary();
            }

        } else if (tokenType == "Solve") {
            FlushPending();
            while (_ops.Count > 0) ApplyTop();
        }
    }

    public IExpression Build() {
        FlushPending();
        while (_ops.Count > 0) ApplyTop();
        return _output.Count > 0 ? _output.Peek() : new NumberExpression(0);
    }

    private void FlushPending() {
        if (_pending.Length > 0) {
            _output.Push(new NumberExpression(double.Parse(_pending)));
            _pending = "";
        }
    }

    private void ApplyTop() {
        if (UnaryNames.Contains(_ops.Peek())) ApplyUnary();
        else ApplyBinary();
    }

    private void ApplyBinary() {
        var op = _ops.Pop();
        var r  = _output.Pop();
        var l  = _output.Pop();
        _output.Push(op switch {
            "+"  => new AddExpression(l, r),
            "-"  => new SubtractExpression(l, r),
            "*"  => new MultiplyExpression(l, r),
            "/"  => new DivideExpression(l, r),
            "//" => new FloorDivideExpression(l, r),
            "%"  => new ModuloExpression(l, r),
            "**" => new PowerExpression(l, r),
            _    => throw new InvalidOperationException($"Unknown operator: {op}"),
        });
    }

    private void ApplyUnary() {
        var fn = _ops.Pop();
        var x  = _output.Pop();
        _output.Push(fn switch {
            "abs"       => (IExpression) new AbsExpression(x),
            "sqrt"      => new SqrtExpression(x),
            "neg"       => new NegateExpression(x),
            "square"    => new PowerExpression(x, new NumberExpression(2)),
            "inverse"   => new InverseExpression(x),
            "factorial" => new FactorialExpression(x),
            "log"       => new LogExpression(x),
            _           => throw new InvalidOperationException($"Unknown function: {fn}"),
        });
    }
}


public static class PipelineHelper {
    public static IExpression ParseAndBuild(
        IList<string> tokens,
        HashSet<string>? functions = null)
    {
        var chain   = ChainFactory.BuildChain(functions);
        var builder = new TreeBuilder();
        var ctx     = new ParseContext();

        foreach (var tok in tokens) {
            var result = chain.Handle(tok, ctx);
            if (result is null)
                throw new ArgumentException($"Invalid token \"{tok}\" after \"{ctx.Trailing}\"");
            builder.Push(result.Value.Item1, result.Value.Item2);

            var tokenType  = result.Value.Item1;
            var parenDepth = ctx.ParenDepth;
            var hasDecimal = ctx.HasDecimal;

            if      (tok == "(") { parenDepth++; hasDecimal = false; }
            else if (tok == ")") { parenDepth--; }
            else if (tokenType is "Exp" or "Term" or "Power") { hasDecimal = false; }
            else if (tok == ".") { hasDecimal = true; }

            ctx = new ParseContext(tok, parenDepth, hasDecimal);
        }

        return builder.Build();
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
#if !TESTING

var SEP = new string('═', 64);

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Chain of Responsibility + Interpreter: Full Pipeline        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

var ctx = new Context();

// ── Part 1: CoR validation chain alone ──────────────────────
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Part 1 - CoR chain: validate and classify tokens");
Console.WriteLine(SEP);

var chain = ChainFactory.BuildChain();
var demos = new (List<string> tokens, string label)[] {
    (new(){"2","3","4","+","(","1","2","/","3",")","="}, "234 + (12 / 3)"),
    (new(){"+","5"},                                      "leading '+'   rejected"),
    (new(){"1","2","+","+"},                              "12 + +        rejected"),
};
foreach (var (tokens, label) in demos) {
    Console.WriteLine($"\n  {label}");
    var c = new ParseContext();
    foreach (var tok in tokens) {
        var r = chain.Handle(tok, c);
        var rStr = r is null ? "null" : $"[\"{r.Value.Item1}\", \"{r.Value.Item2}\"]";
        Console.WriteLine($"    {("\"" + tok + "\""),-7} → {rStr}");
        if (r is null) break;
        var tt = r.Value.Item1;
        int pd = c.ParenDepth + (tok == "(" ? 1 : tok == ")" ? -1 : 0);
        bool hd = (c.HasDecimal || tok == ".") && tt is not ("Exp" or "Term" or "Power");
        c = new ParseContext(tok, pd, hd);
    }
}

// ── Part 2: Full pipeline ────────────────────────────────────
Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Part 2 - Full pipeline: tokens → CoR → tree → interpret()");
Console.WriteLine(SEP);

var examples = new (List<string> tokens, string label)[] {
    (new(){"3","+","4","="},                                "3 + 4"),
    (new(){"2","+","3","*","4","="},                         "2 + 3 * 4  (precedence)"),
    (new(){"(","2","+","3",")","*","4","="},                 "(2 + 3) * 4"),
    (new(){"2","**","8","="},                                "2 ** 8"),
    (new(){"sqrt","9","="},                                  "sqrt 9"),
    (new(){"abs","neg","5","="},                             "abs(neg(5))"),
    (new(){"sqrt","(","3","**","2","+","4","**","2",")","="}, "sqrt(3^2 + 4^2)  Pythagorean"),
    (new(){"1","7","%","5","="},                             "17 % 5"),
    (new(){"1","5","//","4","="},                            "15 // 4"),
};

foreach (var (tokens, label) in examples) {
    var tree   = PipelineHelper.ParseAndBuild(tokens);
    var result = tree.Interpret(ctx);
    var display = result == Math.Floor(result) ? ((long)result).ToString() : result.ToString();
    Console.WriteLine($"  {label,-35}  tree: {tree.Display(),-40}  = {display}");
}

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  CoR owns VALIDATION.  Interpreter owns EVALUATION.");
Console.WriteLine("  TreeBuilder is the only piece that knows about both.");
Console.WriteLine(SEP);

Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Done                                                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
#endif // !TESTING
