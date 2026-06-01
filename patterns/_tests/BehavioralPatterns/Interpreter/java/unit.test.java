// ============================================================
//  Unit Tests — Interpreter: Arithmetic Expression Evaluator (Java)
//
//  Run: javac java.java unit.test.java && java org.junit.runner.JUnitCore InterpreterUnitTests
// ============================================================

import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;
import java.util.NoSuchElementException;

public class InterpreterUnitTests {

    // ── Context ───────────────────────────────────────────────
    @Test
    public void context_storesAndRetrievesVariable() {
        Context ctx = new Context().set("x", 42);
        assertEquals(42.0, ctx.get("x"), 0.001);
    }

    @Test(expected = NoSuchElementException.class)
    public void context_throwsOnMissingVariable() {
        new Context().get("missing");
    }

    @Test
    public void context_overwritesExistingVariable() {
        Context ctx = new Context().set("x", 1).set("x", 99);
        assertEquals(99.0, ctx.get("x"), 0.001);
    }

    @Test
    public void context_setReturnsSelf() {
        Context ctx = new Context();
        assertSame(ctx, ctx.set("a", 1));
    }


    // ── NumberExpression ──────────────────────────────────────
    @Test
    public void number_returnsLiteralValue() {
        assertEquals(7.0, new NumberExpression(7).interpret(new Context()), 0.001);
    }

    @Test
    public void number_ignoresContext() {
        Context ctx = new Context().set("x", 999);
        assertEquals(3.0, new NumberExpression(3).interpret(ctx), 0.001);
    }

    @Test
    public void number_displayRendersInteger() {
        assertEquals("5", new NumberExpression(5).display());
    }


    // ── VariableExpression ────────────────────────────────────
    @Test
    public void variable_resolvesFromContext() {
        Context ctx = new Context().set("a", 10);
        assertEquals(10.0, new VariableExpression("a").interpret(ctx), 0.001);
    }

    @Test(expected = NoSuchElementException.class)
    public void variable_throwsWhenNotInContext() {
        new VariableExpression("z").interpret(new Context());
    }

    @Test
    public void variable_displayReturnsName() {
        assertEquals("a", new VariableExpression("a").display());
    }


    // ── AddExpression ─────────────────────────────────────────
    @Test
    public void add_addsTwoNumbers() {
        Expression expr = new AddExpression(new NumberExpression(3), new NumberExpression(4));
        assertEquals(7.0, expr.interpret(new Context()), 0.001);
    }

    @Test
    public void add_addsTwoVariables() {
        Context ctx = new Context().set("a", 10).set("b", 5);
        Expression expr = new AddExpression(new VariableExpression("a"), new VariableExpression("b"));
        assertEquals(15.0, expr.interpret(ctx), 0.001);
    }

    @Test
    public void add_displayContainsPlusAndParens() {
        Expression expr = new AddExpression(new NumberExpression(1), new NumberExpression(2));
        assertTrue(expr.display().contains("+"));
        assertTrue(expr.display().startsWith("("));
    }


    // ── SubtractExpression ────────────────────────────────────
    @Test
    public void subtract_subtractsRightFromLeft() {
        Expression expr = new SubtractExpression(new NumberExpression(10), new NumberExpression(3));
        assertEquals(7.0, expr.interpret(new Context()), 0.001);
    }

    @Test
    public void subtract_resultCanBeNegative() {
        Expression expr = new SubtractExpression(new NumberExpression(2), new NumberExpression(5));
        assertEquals(-3.0, expr.interpret(new Context()), 0.001);
    }


    // ── MultiplyExpression ────────────────────────────────────
    @Test
    public void multiply_multipliesTwoNumbers() {
        Expression expr = new MultiplyExpression(new NumberExpression(4), new NumberExpression(5));
        assertEquals(20.0, expr.interpret(new Context()), 0.001);
    }

    @Test
    public void multiply_multipliesVariableByNumber() {
        Context ctx = new Context().set("a", 6);
        Expression expr = new MultiplyExpression(new VariableExpression("a"), new NumberExpression(7));
        assertEquals(42.0, expr.interpret(ctx), 0.001);
    }


    // ── DivideExpression ──────────────────────────────────────
    @Test
    public void divide_dividesLeftByRight() {
        Expression expr = new DivideExpression(new NumberExpression(10), new NumberExpression(2));
        assertEquals(5.0, expr.interpret(new Context()), 0.001);
    }

    @Test(expected = ArithmeticException.class)
    public void divide_throwsOnZero() {
        new DivideExpression(new NumberExpression(5), new NumberExpression(0)).interpret(new Context());
    }

    @Test
    public void divide_producesFractionalResult() {
        Expression expr = new DivideExpression(new NumberExpression(10), new NumberExpression(4));
        assertEquals(2.5, expr.interpret(new Context()), 0.001);
    }


    // ── Composite trees ───────────────────────────────────────
    @Test
    public void composite_diffOfSquares() {
        Expression a = new VariableExpression("a");
        Expression b = new VariableExpression("b");
        Context ctx  = new Context().set("a", 10).set("b", 5);
        Expression expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));
        assertEquals(75.0, expr.interpret(ctx), 0.001);
    }

    @Test
    public void composite_sameTreeDifferentContexts() {
        Expression a    = new VariableExpression("a");
        Expression b    = new VariableExpression("b");
        Expression expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));
        assertEquals(75.0, expr.interpret(new Context().set("a", 10).set("b", 5)), 0.001);
        assertEquals(32.0, expr.interpret(new Context().set("a",  6).set("b", 2)), 0.001);
    }

    @Test
    public void composite_literalThreeLevelTree() {
        Expression expr = new MultiplyExpression(
            new AddExpression(new NumberExpression(3), new NumberExpression(4)),
            new NumberExpression(2));
        assertEquals(14.0, expr.interpret(new Context()), 0.001);
    }
}
