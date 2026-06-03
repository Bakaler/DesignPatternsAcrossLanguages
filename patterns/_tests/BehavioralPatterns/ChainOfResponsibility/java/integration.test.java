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
//    Invalid token sequences raise IllegalArgumentException
//
//  Compile & run:
//    javac -cp .:junit.jar integration.test.java ../../../../BehavioralPatterns/ChainOfResponsibility/java/java.java
//    java  -cp .:junit.jar org.junit.runner.JUnitCore CoRIntegrationTests
// ============================================================

import org.junit.*;
import org.junit.runner.JUnitCore;
import org.junit.runner.Result;
import org.junit.runner.notification.Failure;
import java.util.*;
import static org.junit.Assert.*;


public class CoRIntegrationTests {

    // ── Helper: feed tokens through chain ────────────────────────
    static List<String[]> feed(Handler chain, List<String> tokens) {
        List<String[]> results = new ArrayList<>();
        ParseContext ctx = new ParseContext();

        for (String tok : tokens) {
            String[] result = chain.handle(tok, ctx);
            results.add(result);
            if (result == null) break;

            String  tokenType  = result[0];
            int     parenDepth = ctx.parenDepth;
            boolean hasDecimal = ctx.hasDecimal;

            if ("(".equals(tok))       { parenDepth++; hasDecimal = false; }
            else if (")".equals(tok))  { parenDepth--; }
            else if ("Exp".equals(tokenType) || "Term".equals(tokenType) || "Power".equals(tokenType))
                                       { hasDecimal = false; }
            else if (".".equals(tok))  { hasDecimal = true; }

            ctx = new ParseContext(tok, parenDepth, hasDecimal);
        }
        return results;
    }

    static List<String> types(List<String[]> results) {
        List<String> types = new ArrayList<>();
        for (String[] r : results) types.add(r == null ? null : r[0]);
        return types;
    }

    Context ctx = new Context();

    double eval(List<String> tokens) {
        return ParseAndBuild.run(tokens).interpret(ctx);
    }


    // ── Valid sequences ──────────────────────────────────────────
    @Test public void valid_simple_addition() {
        assertEquals(Arrays.asList("Digit","Exp","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("5","+","3","="))));
    }

    @Test public void valid_order_of_operations() {
        assertEquals(Arrays.asList("Digit","Exp","Digit","Term","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("2","+","3","*","4","="))));
    }

    @Test public void valid_parenthesised() {
        assertEquals(Arrays.asList("Factor","Digit","Exp","Digit","Factor","Term","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("(","6","-","2",")","*","3","="))));
    }

    @Test public void valid_power() {
        assertEquals(Arrays.asList("Digit","Power","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("2","**","8","="))));
    }

    @Test public void valid_function_wrapping() {
        assertEquals(Arrays.asList("Function","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("abs","9","="))));
    }

    @Test public void valid_nested_functions() {
        assertEquals(Arrays.asList("Function","Function","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("neg","abs","7","="))));
    }

    @Test public void valid_decimal() {
        assertEquals(Arrays.asList("Digit","SoloDec","Digit","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("3",".","1","4","="))));
    }

    @Test public void valid_floor_divide() {
        assertEquals(Arrays.asList("Digit","Digit","Term","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("1","7","//","5","="))));
    }

    @Test public void valid_modulo() {
        assertEquals(Arrays.asList("Digit","Digit","Term","Digit","Solve"),
            types(feed(ChainFactory.buildChain(), Arrays.asList("1","7","%","5","="))));
    }

    @Test public void valid_complex() {
        assertEquals(Arrays.asList("Digit","Digit","Digit","Exp","Factor","Digit","Digit","Term","Digit","Factor","Solve"),
            types(feed(ChainFactory.buildChain(),
                Arrays.asList("2","3","4","+","(","1","2","/","3",")","="))));
    }

    @Test public void valid_solve_only() {
        assertArrayEquals(new String[]{"Solve","="},
            ChainFactory.buildChain().handle("=", new ParseContext()));
    }


    // ── Invalid sequences ────────────────────────────────────────
    @Test public void invalid_leading_plus() {
        assertNull(feed(ChainFactory.buildChain(), Arrays.asList("+","5")).get(0));
    }

    @Test public void invalid_double_operator() {
        List<String[]> r = feed(ChainFactory.buildChain(), Arrays.asList("1","2","+","+"));
        assertNotNull(r.get(0));
        assertNull(r.get(3));
    }

    @Test public void invalid_operator_after_open_paren() {
        assertNull(feed(ChainFactory.buildChain(), Arrays.asList("(","+")).get(1));
    }

    @Test public void invalid_unmatched_close_paren() {
        assertNull(ChainFactory.buildChain().handle(")", new ParseContext(null, 0, false)));
    }

    @Test public void invalid_second_decimal() {
        assertNull(feed(ChainFactory.buildChain(), Arrays.asList("1",".","5",".")).get(3));
    }

    @Test public void invalid_digit_after_close_paren() {
        assertNull(feed(ChainFactory.buildChain(), Arrays.asList("(","3",")","5")).get(3));
    }

    @Test public void invalid_unknown_token() {
        assertNull(ChainFactory.buildChain().handle("xyz", new ParseContext("5", 0, false)));
    }

    @Test public void invalid_leading_multiply() {
        assertNull(ChainFactory.buildChain().handle("*", new ParseContext()));
    }


    // ── Processed token values ───────────────────────────────────
    @Test public void processed_exp_spaces() {
        assertEquals(" + ", ChainFactory.buildChain().handle("+", new ParseContext("5",0,false))[1]);
    }

    @Test public void processed_term_spaces() {
        assertEquals(" * ", ChainFactory.buildChain().handle("*", new ParseContext("3",0,false))[1]);
    }

    @Test public void processed_power_spaces() {
        assertEquals(" ** ", ChainFactory.buildChain().handle("**", new ParseContext("2",0,false))[1]);
    }

    @Test public void processed_factor_no_spaces() {
        assertEquals("(", ChainFactory.buildChain().handle("(", new ParseContext())[1]);
    }

    @Test public void processed_solo_decimal() {
        assertEquals("0.", ChainFactory.buildChain().handle(".", new ParseContext())[1]);
    }

    @Test public void processed_digit_as_is() {
        assertEquals("7", ChainFactory.buildChain().handle("7", new ParseContext())[1]);
    }


    // ── Chain extension ──────────────────────────────────────────
    @Test public void extension_new_function_accepted() {
        Set<String> fns = new HashSet<>(CoRConstants.DEFAULT_FUNCTIONS);
        fns.add("cbrt");
        Handler ext = ChainFactory.buildChain(fns);
        assertArrayEquals(new String[]{"Function","cbrt"},
            ext.handle("cbrt", new ParseContext("8",0,false)));
    }

    @Test public void extension_new_function_rejected_in_default() {
        assertNull(ChainFactory.buildChain().handle("cbrt", new ParseContext("8",0,false)));
    }

    @Test public void extension_existing_functions_still_work() {
        Set<String> fns = new HashSet<>(CoRConstants.DEFAULT_FUNCTIONS);
        fns.add("cbrt");
        Handler ext = ChainFactory.buildChain(fns);
        for (String fn : CoRConstants.DEFAULT_FUNCTIONS) {
            assertArrayEquals(new String[]{"Function", fn},
                ext.handle(fn, new ParseContext("5",0,false)));
        }
    }


    // ── Pipeline ─────────────────────────────────────────────────
    @Test public void pipeline_simple_addition()     { assertEquals(7.0,  eval(Arrays.asList("3","+","4","=")), 1e-12); }
    @Test public void pipeline_simple_subtraction()  { assertEquals(5.0,  eval(Arrays.asList("9","-","4","=")), 1e-12); }
    @Test public void pipeline_simple_multiply()     { assertEquals(42.0, eval(Arrays.asList("6","*","7","=")), 1e-12); }
    @Test public void pipeline_simple_divide()       { assertEquals(2.0,  eval(Arrays.asList("8","/","4","=")), 1e-12); }

    @Test public void pipeline_precedence() {
        // 2 + 3 * 4 = 14
        assertEquals(14.0, eval(Arrays.asList("2","+","3","*","4","=")), 1e-12);
    }

    @Test public void pipeline_parens_override() {
        assertEquals(20.0, eval(Arrays.asList("(","2","+","3",")","*","4","=")), 1e-12);
    }

    @Test public void pipeline_power()        { assertEquals(256.0, eval(Arrays.asList("2","**","8","=")), 1e-12); }
    @Test public void pipeline_floor_divide() { assertEquals(3.0,   eval(Arrays.asList("1","7","//","5","=")), 1e-12); }
    @Test public void pipeline_modulo()       { assertEquals(2.0,   eval(Arrays.asList("1","7","%","5","=")), 1e-12); }
    @Test public void pipeline_sqrt()         { assertEquals(3.0,   eval(Arrays.asList("sqrt","9","=")), 1e-12); }

    @Test public void pipeline_abs_neg() {
        assertEquals(5.0, eval(Arrays.asList("abs","neg","5","=")), 1e-12);
    }

    @Test public void pipeline_nested_unary() {
        assertEquals(7.0, eval(Arrays.asList("abs","neg","abs","neg","7","=")), 1e-12);
    }

    @Test public void pipeline_pythagorean() {
        assertEquals(5.0, eval(Arrays.asList("sqrt","(","3","**","2","+","4","**","2",")","=")), 1e-12);
    }

    @Test public void pipeline_multidigit() {
        assertEquals(234.0, eval(Arrays.asList("2","3","4","+","0","=")), 1e-12);
    }

    @Test public void pipeline_decimal() {
        assertEquals(3.14, eval(Arrays.asList("3",".","1","4","+","0","=")), 1e-9);
    }

    @Test(expected = IllegalArgumentException.class)
    public void pipeline_invalid_raises() {
        ParseAndBuild.run(Arrays.asList("+","5"));
    }

    @Test public void pipeline_tree_str() {
        Expression tree = ParseAndBuild.run(Arrays.asList("(","2","+","3",")","*","4","="));
        assertTrue(tree.display().contains("*"));
        assertTrue(tree.display().contains("+"));
    }


    // ── Runner ────────────────────────────────────────────────────
    public static void main(String[] args) {
        Result result = JUnitCore.runClasses(CoRIntegrationTests.class);
        for (Failure f : result.getFailures()) System.out.println(f);
        if (result.wasSuccessful())
            System.out.println("OK (" + result.getRunCount() + " tests)");
        else
            System.exit(1);
    }
}
