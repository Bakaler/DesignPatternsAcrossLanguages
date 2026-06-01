// ============================================================
//  Integration Tests — Interpreter: Arithmetic Expression Evaluator (Java)
//
//  Run: javac java.java integration.test.java && java org.junit.runner.JUnitCore InterpreterIntegrationTests
// ============================================================

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.NoSuchElementException;

public class InterpreterIntegrationTests {

    // ── Full expression evaluation end-to-end ─────────────────
    @Test
    public void threeLevelNestedTreeEvaluatesCorrectly() {
        // ((a + b) * (a - b)) / 5  with a=10, b=5  →  75/5 = 15
        Expression a   = new VariableExpression("a");
        Expression b   = new VariableExpression("b");
        Context ctx    = new Context().set("a", 10).set("b", 5);

        Expression expr = new DivideExpression(
            new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b)),
            new NumberExpression(5));

        assertEquals(15.0, expr.interpret(ctx), 0.001);
    }

    @Test
    public void treeReuseThreeContexts() {
        Expression a    = new VariableExpression("a");
        Expression b    = new VariableExpression("b");
        Expression expr = new MultiplyExpression(new AddExpression(a, b), new SubtractExpression(a, b));

        assertEquals(75.0, expr.interpret(new Context().set("a", 10).set("b", 5)), 0.001);
        assertEquals(32.0, expr.interpret(new Context().set("a",  6).set("b", 2)), 0.001);
        assertEquals( 8.0, expr.interpret(new Context().set("a",  3).set("b", 1)), 0.001);
    }

    @Test
    public void displayProducesFullyParenthesisedString() {
        Expression expr = new MultiplyExpression(
            new AddExpression(new VariableExpression("a"), new VariableExpression("b")),
            new SubtractExpression(new VariableExpression("a"), new VariableExpression("b")));

        String s = expr.display();
        assertTrue(s.contains("(a + b)"));
        assertTrue(s.contains("(a - b)"));
        assertTrue(s.startsWith("("));
    }


    // ── Error propagation ─────────────────────────────────────
    @Test(expected = NoSuchElementException.class)
    public void missingVariableInDeepSubtreeSurfaces() {
        Expression expr = new AddExpression(
            new NumberExpression(1),
            new MultiplyExpression(new VariableExpression("missing"), new NumberExpression(2)));
        expr.interpret(new Context());
    }

    @Test(expected = ArithmeticException.class)
    public void divisionByZeroInSubtreeSurfaces() {
        Expression expr = new AddExpression(
            new NumberExpression(1),
            new DivideExpression(new NumberExpression(4), new NumberExpression(0)));
        expr.interpret(new Context());
    }


    // ── Context independence ───────────────────────────────────
    @Test
    public void parallelEvaluationsDoNotInterfere() {
        Expression a    = new VariableExpression("a");
        Expression b    = new VariableExpression("b");
        Expression expr = new AddExpression(a, b);

        Context ctx1 = new Context().set("a", 1).set("b", 2);
        Context ctx2 = new Context().set("a", 100).set("b", 200);

        assertEquals(  3.0, expr.interpret(ctx1), 0.001);
        assertEquals(300.0, expr.interpret(ctx2), 0.001);
    }


    // ── Arithmetic correctness ─────────────────────────────────
    @Test
    public void additionIsCommutative() {
        Context ctx = new Context().set("a", 3).set("b", 7);
        Expression ab = new AddExpression(new VariableExpression("a"), new VariableExpression("b"));
        Expression ba = new AddExpression(new VariableExpression("b"), new VariableExpression("a"));
        assertEquals(ab.interpret(ctx), ba.interpret(ctx), 0.001);
    }

    @Test
    public void multiplyByZeroGivesZero() {
        Context ctx  = new Context().set("a", 999);
        Expression expr = new MultiplyExpression(new VariableExpression("a"), new NumberExpression(0));
        assertEquals(0.0, expr.interpret(ctx), 0.001);
    }
}
