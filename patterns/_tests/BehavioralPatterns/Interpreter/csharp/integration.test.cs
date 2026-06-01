// ============================================================
//  Integration Tests — Interpreter: Arithmetic Expression Evaluator (C#)
//
//  Run: dotnet test
// ============================================================

using Xunit;
using System;
using System.Collections.Generic;

public class IntegrationTests {

    // ── Full expression evaluation end-to-end ──────────────────
    [Fact]
    public void ThreeLevelNestedTreeEvaluatesCorrectly() {
        // ((a + b) * (a - b)) / 5  with a=10, b=5  →  75/5 = 15
        IExpression a   = new VariableExpression("a");
        IExpression b   = new VariableExpression("b");
        var ctx = new Context().Set("a", 10).Set("b", 5);

        var expr = new DivideExpression(
            new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b)),
            new NumberExpression(5));

        Assert.Equal(15, expr.Interpret(ctx));
    }

    [Fact]
    public void TreeReuseThreeContexts() {
        IExpression a    = new VariableExpression("a");
        IExpression b    = new VariableExpression("b");
        var expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));

        var cases = new[] {
            (a: 10.0, b: 5.0, expected: 75.0),
            (a:  6.0, b: 2.0, expected: 32.0),
            (a:  3.0, b: 1.0, expected:  8.0),
        };

        foreach (var (av, bv, expected) in cases) {
            var ctx = new Context().Set("a", av).Set("b", bv);
            Assert.Equal(expected, expr.Interpret(ctx));
        }
    }

    [Fact]
    public void DisplayProducesFullyParenthesisedString() {
        var expr = new MultiplyExpression(
            new AddExpression(new VariableExpression("a"), new VariableExpression("b")),
            new SubtractExpression(new VariableExpression("a"), new VariableExpression("b")));

        var s = expr.Display();
        Assert.Contains("(a + b)", s);
        Assert.Contains("(a - b)", s);
        Assert.StartsWith("(", s);
    }

    // ── Error propagation ──────────────────────────────────────
    [Fact]
    public void MissingVariableInDeepSubtreeSurfaces() {
        var expr = new AddExpression(
            new NumberExpression(1),
            new MultiplyExpression(new VariableExpression("missing"), new NumberExpression(2)));
        Assert.Throws<KeyNotFoundException>(() => expr.Interpret(new Context()));
    }

    [Fact]
    public void DivisionByZeroInSubtreeSurfaces() {
        var expr = new AddExpression(
            new NumberExpression(1),
            new DivideExpression(new NumberExpression(4), new NumberExpression(0)));
        Assert.Throws<DivideByZeroException>(() => expr.Interpret(new Context()));
    }

    // ── Context independence ───────────────────────────────────
    [Fact]
    public void ParallelEvaluationsDoNotInterfere() {
        IExpression a    = new VariableExpression("a");
        IExpression b    = new VariableExpression("b");
        var expr = new AddExpression(a, b);

        var ctx1 = new Context().Set("a", 1).Set("b", 2);
        var ctx2 = new Context().Set("a", 100).Set("b", 200);

        Assert.Equal(3,   expr.Interpret(ctx1));
        Assert.Equal(300, expr.Interpret(ctx2));
    }

    // ── Arithmetic correctness ─────────────────────────────────
    [Fact]
    public void AdditionIsCommutative() {
        var ctx = new Context().Set("a", 3).Set("b", 7);
        var ab  = new AddExpression(new VariableExpression("a"), new VariableExpression("b"));
        var ba  = new AddExpression(new VariableExpression("b"), new VariableExpression("a"));
        Assert.Equal(ab.Interpret(ctx), ba.Interpret(ctx));
    }

    [Fact]
    public void MultiplyByZeroGivesZero() {
        var ctx  = new Context().Set("a", 999);
        var expr = new MultiplyExpression(new VariableExpression("a"), new NumberExpression(0));
        Assert.Equal(0, expr.Interpret(ctx));
    }
}
