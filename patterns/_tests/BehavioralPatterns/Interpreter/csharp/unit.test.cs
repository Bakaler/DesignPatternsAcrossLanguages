// ============================================================
//  Unit Tests — Interpreter: Arithmetic Expression Evaluator (C#)
//
//  Run: dotnet test
// ============================================================

using Xunit;
using System;
using System.Collections.Generic;

// ── Context ───────────────────────────────────────────────────
public class ContextTests {
    [Fact]
    public void StoresAndRetrievesVariable() {
        var ctx = new Context().Set("x", 42);
        Assert.Equal(42, ctx.Get("x"));
    }

    [Fact]
    public void ThrowsOnMissingVariable() {
        var ctx = new Context();
        Assert.Throws<KeyNotFoundException>(() => ctx.Get("missing"));
    }

    [Fact]
    public void OverwritesExistingVariable() {
        var ctx = new Context().Set("x", 1).Set("x", 99);
        Assert.Equal(99, ctx.Get("x"));
    }

    [Fact]
    public void SetReturnsSelfForChaining() {
        var ctx = new Context();
        Assert.Same(ctx, ctx.Set("a", 1));
    }
}


// ── NumberExpression ──────────────────────────────────────────
public class NumberExpressionTests {
    [Fact]
    public void ReturnsLiteralValue() {
        var expr = new NumberExpression(7);
        Assert.Equal(7, expr.Interpret(new Context()));
    }

    [Fact]
    public void IgnoresContext() {
        var ctx  = new Context().Set("x", 999);
        var expr = new NumberExpression(3);
        Assert.Equal(3, expr.Interpret(ctx));
    }

    [Fact]
    public void DisplayRendersInteger() {
        Assert.Equal("5", new NumberExpression(5).Display());
    }
}


// ── VariableExpression ────────────────────────────────────────
public class VariableExpressionTests {
    [Fact]
    public void ResolvesFromContext() {
        var ctx  = new Context().Set("a", 10);
        var expr = new VariableExpression("a");
        Assert.Equal(10, expr.Interpret(ctx));
    }

    [Fact]
    public void ThrowsWhenNotInContext() {
        var expr = new VariableExpression("z");
        Assert.Throws<KeyNotFoundException>(() => expr.Interpret(new Context()));
    }

    [Fact]
    public void DisplayReturnsName() {
        Assert.Equal("a", new VariableExpression("a").Display());
    }
}


// ── AddExpression ─────────────────────────────────────────────
public class AddExpressionTests {
    [Fact]
    public void AddsTwoNumbers() {
        var expr = new AddExpression(new NumberExpression(3), new NumberExpression(4));
        Assert.Equal(7, expr.Interpret(new Context()));
    }

    [Fact]
    public void AddsTwoVariables() {
        var ctx  = new Context().Set("a", 10).Set("b", 5);
        var expr = new AddExpression(new VariableExpression("a"), new VariableExpression("b"));
        Assert.Equal(15, expr.Interpret(ctx));
    }

    [Fact]
    public void DisplayContainsPlusAndParens() {
        var expr = new AddExpression(new NumberExpression(1), new NumberExpression(2));
        Assert.Contains("+", expr.Display());
        Assert.StartsWith("(", expr.Display());
    }
}


// ── SubtractExpression ────────────────────────────────────────
public class SubtractExpressionTests {
    [Fact]
    public void SubtractsRightFromLeft() {
        var expr = new SubtractExpression(new NumberExpression(10), new NumberExpression(3));
        Assert.Equal(7, expr.Interpret(new Context()));
    }

    [Fact]
    public void ResultCanBeNegative() {
        var expr = new SubtractExpression(new NumberExpression(2), new NumberExpression(5));
        Assert.Equal(-3, expr.Interpret(new Context()));
    }
}


// ── MultiplyExpression ────────────────────────────────────────
public class MultiplyExpressionTests {
    [Fact]
    public void MultipliesTwoNumbers() {
        var expr = new MultiplyExpression(new NumberExpression(4), new NumberExpression(5));
        Assert.Equal(20, expr.Interpret(new Context()));
    }

    [Fact]
    public void MultipliesVariableByNumber() {
        var ctx  = new Context().Set("a", 6);
        var expr = new MultiplyExpression(new VariableExpression("a"), new NumberExpression(7));
        Assert.Equal(42, expr.Interpret(ctx));
    }
}


// ── DivideExpression ──────────────────────────────────────────
public class DivideExpressionTests {
    [Fact]
    public void DividesLeftByRight() {
        var expr = new DivideExpression(new NumberExpression(10), new NumberExpression(2));
        Assert.Equal(5, expr.Interpret(new Context()));
    }

    [Fact]
    public void ThrowsOnDivisionByZero() {
        var expr = new DivideExpression(new NumberExpression(5), new NumberExpression(0));
        Assert.Throws<DivideByZeroException>(() => expr.Interpret(new Context()));
    }

    [Fact]
    public void ProducesFractionalResult() {
        var expr = new DivideExpression(new NumberExpression(10), new NumberExpression(4));
        Assert.Equal(2.5, expr.Interpret(new Context()));
    }
}


// ── Composite trees ───────────────────────────────────────────
public class CompositTreeTests {
    [Fact]
    public void DiffOfSquares() {
        IExpression a   = new VariableExpression("a");
        IExpression b   = new VariableExpression("b");
        var ctx = new Context().Set("a", 10).Set("b", 5);
        var expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));
        Assert.Equal(75, expr.Interpret(ctx));
    }

    [Fact]
    public void SameTreeDifferentContexts() {
        IExpression a    = new VariableExpression("a");
        IExpression b    = new VariableExpression("b");
        var expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));
        Assert.Equal(75, expr.Interpret(new Context().Set("a", 10).Set("b", 5)));
        Assert.Equal(32, expr.Interpret(new Context().Set("a",  6).Set("b", 2)));
    }

    [Fact]
    public void LiteralThreeLevelTree() {
        var expr = new MultiplyExpression(
            new AddExpression(new NumberExpression(3), new NumberExpression(4)),
            new NumberExpression(2));
        Assert.Equal(14, expr.Interpret(new Context()));
    }
}
