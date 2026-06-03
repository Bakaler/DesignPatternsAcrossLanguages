// ============================================================
//  Unit Tests - Chain of Responsibility: Grammar Token Validator
//
//  What we test here:
//    Each handler claims exactly its own tokens
//    Each handler passes foreign tokens to the next link
//      (or returns null when it is the last link)
//    Context validation: trailing, parenDepth, hasDecimal
//    setNext() wiring and toString() identity
//
//  Compile & run:
//    javac -cp .:junit.jar unit.test.java ../../../../BehavioralPatterns/ChainOfResponsibility/java/java.java
//    java  -cp .:junit.jar org.junit.runner.JUnitCore CoRUnitTests
// ============================================================

import org.junit.*;
import org.junit.runner.JUnitCore;
import org.junit.runner.Result;
import org.junit.runner.notification.Failure;
import java.util.*;
import static org.junit.Assert.*;


public class CoRUnitTests {

    // ── Common contexts ──────────────────────────────────────────
    static final ParseContext EMPTY       = new ParseContext();
    static final ParseContext AFTER5      = new ParseContext("5", 0, false);
    static final ParseContext AFTER_OPEN  = new ParseContext("(", 0, false);
    static final ParseContext AFTER_CLOSE = new ParseContext(")", 0, false);


    // ── SolveHandler ──────────────────────────────────────────────
    @Test public void solve_claims_equals() {
        Handler h = new SolveHandler();
        assertArrayEquals(new String[]{"Solve","="}, h.handle("=", EMPTY));
    }

    @Test public void solve_passes_plus() {
        Handler h = new SolveHandler();
        assertNull(h.handle("+", EMPTY));
    }

    @Test public void solve_passes_digit() {
        Handler h = new SolveHandler();
        assertNull(h.handle("5", EMPTY));
    }

    @Test public void solve_tostring() {
        assertEquals("SolveHandler", new SolveHandler().toString());
    }


    // ── ExpHandler ────────────────────────────────────────────────
    @Test public void exp_claims_plus_after_digit() {
        Handler h = new ExpHandler();
        assertArrayEquals(new String[]{"Exp"," + "}, h.handle("+", AFTER5));
    }

    @Test public void exp_claims_minus_after_digit() {
        Handler h = new ExpHandler();
        assertArrayEquals(new String[]{"Exp"," - "}, h.handle("-", AFTER5));
    }

    @Test public void exp_rejects_plus_at_start() {
        assertNull(new ExpHandler().handle("+", EMPTY));
    }

    @Test public void exp_rejects_plus_after_open_paren() {
        assertNull(new ExpHandler().handle("+", AFTER_OPEN));
    }

    @Test public void exp_rejects_plus_after_operator() {
        for (String op : CoRConstants.OPERANDS) {
            ParseContext ctx = new ParseContext(op, 0, false);
            assertNull("Should reject + after " + op,
                new ExpHandler().handle("+", ctx));
        }
    }

    @Test public void exp_passes_multiply() {
        assertNull(new ExpHandler().handle("*", AFTER5));
    }

    @Test public void exp_passes_digit() {
        assertNull(new ExpHandler().handle("7", AFTER5));
    }


    // ── TermHandler ───────────────────────────────────────────────
    @Test public void term_claims_multiply() {
        assertArrayEquals(new String[]{"Term"," * "}, new TermHandler().handle("*", AFTER5));
    }

    @Test public void term_claims_divide() {
        assertArrayEquals(new String[]{"Term"," / "}, new TermHandler().handle("/", AFTER5));
    }

    @Test public void term_claims_floor_divide() {
        assertArrayEquals(new String[]{"Term"," // "}, new TermHandler().handle("//", AFTER5));
    }

    @Test public void term_claims_modulo() {
        assertArrayEquals(new String[]{"Term"," % "}, new TermHandler().handle("%", AFTER5));
    }

    @Test public void term_does_not_claim_power() {
        assertNull(new TermHandler().handle("**", AFTER5));
    }

    @Test public void term_rejects_multiply_at_start() {
        assertNull(new TermHandler().handle("*", EMPTY));
    }

    @Test public void term_rejects_multiply_after_open_paren() {
        assertNull(new TermHandler().handle("*", AFTER_OPEN));
    }

    @Test public void term_passes_plus() {
        assertNull(new TermHandler().handle("+", AFTER5));
    }


    // ── PowerHandler ──────────────────────────────────────────────
    @Test public void power_claims_power() {
        assertArrayEquals(new String[]{"Power"," ** "}, new PowerHandler().handle("**", AFTER5));
    }

    @Test public void power_rejects_at_start() {
        assertNull(new PowerHandler().handle("**", EMPTY));
    }

    @Test public void power_rejects_after_open_paren() {
        assertNull(new PowerHandler().handle("**", AFTER_OPEN));
    }

    @Test public void power_passes_single_star() {
        assertNull(new PowerHandler().handle("*", AFTER5));
    }

    @Test public void power_passes_digit() {
        assertNull(new PowerHandler().handle("3", AFTER5));
    }


    // ── FactorHandler ─────────────────────────────────────────────
    @Test public void factor_claims_open_paren_empty() {
        assertArrayEquals(new String[]{"Factor","("}, new FactorHandler().handle("(", EMPTY));
    }

    @Test public void factor_claims_open_paren_after_digit() {
        assertArrayEquals(new String[]{"Factor","("}, new FactorHandler().handle("(", AFTER5));
    }

    @Test public void factor_claims_open_paren_after_open() {
        assertArrayEquals(new String[]{"Factor","("}, new FactorHandler().handle("(", AFTER_OPEN));
    }

    @Test public void factor_claims_close_when_open() {
        ParseContext ctx = new ParseContext(null, 1, false);
        assertArrayEquals(new String[]{"Factor",")"}, new FactorHandler().handle(")", ctx));
    }

    @Test public void factor_claims_close_nested() {
        ParseContext ctx = new ParseContext(null, 3, false);
        assertArrayEquals(new String[]{"Factor",")"}, new FactorHandler().handle(")", ctx));
    }

    @Test public void factor_rejects_close_when_none_open() {
        ParseContext ctx = new ParseContext(null, 0, false);
        assertNull(new FactorHandler().handle(")", ctx));
    }

    @Test public void factor_passes_digit() {
        assertNull(new FactorHandler().handle("5", AFTER5));
    }

    @Test public void factor_passes_operator() {
        assertNull(new FactorHandler().handle("+", AFTER5));
    }


    // ── FunctionHandler ───────────────────────────────────────────
    @Test public void function_claims_each_default() {
        Handler h = new FunctionHandler(CoRConstants.DEFAULT_FUNCTIONS);
        for (String fn : CoRConstants.DEFAULT_FUNCTIONS) {
            assertArrayEquals(new String[]{"Function", fn}, h.handle(fn, AFTER5));
        }
    }

    @Test public void function_passes_unknown() {
        assertNull(new FunctionHandler(CoRConstants.DEFAULT_FUNCTIONS).handle("cbrt", AFTER5));
    }

    @Test public void function_passes_digit() {
        assertNull(new FunctionHandler(CoRConstants.DEFAULT_FUNCTIONS).handle("3", AFTER5));
    }

    @Test public void function_custom_set() {
        Set<String> s = new HashSet<>(Arrays.asList("cbrt", "exp"));
        Handler h = new FunctionHandler(s);
        assertArrayEquals(new String[]{"Function","cbrt"}, h.handle("cbrt", AFTER5));
        assertNull(h.handle("abs", AFTER5));
    }


    // ── DigitHandler ──────────────────────────────────────────────
    @Test public void digit_claims_each_digit() {
        Handler h = new DigitHandler();
        for (char c = '0'; c <= '9'; c++) {
            String d = String.valueOf(c);
            assertArrayEquals(new String[]{"Digit", d}, h.handle(d, EMPTY));
        }
    }

    @Test public void digit_rejects_after_close_paren() {
        assertNull(new DigitHandler().handle("5", AFTER_CLOSE));
    }

    @Test public void digit_claims_decimal_no_prior() {
        assertArrayEquals(new String[]{"SoloDec","0."}, new DigitHandler().handle(".", EMPTY));
    }

    @Test public void digit_rejects_second_decimal() {
        ParseContext ctx = new ParseContext("3", 0, true);
        assertNull(new DigitHandler().handle(".", ctx));
    }

    @Test public void digit_rejects_operator() {
        assertNull(new DigitHandler().handle("+", EMPTY));
    }

    @Test public void digit_rejects_unknown_string() {
        assertNull(new DigitHandler().handle("xyz", EMPTY));
    }


    // ── Chain wiring ──────────────────────────────────────────────
    @Test public void chain_set_next_returns_handler() {
        SolveHandler a = new SolveHandler();
        ExpHandler   b = new ExpHandler();
        assertSame(b, a.setNext(b));
    }

    @Test public void chain_token_reaches_next() {
        DigitHandler digit = new DigitHandler();
        SolveHandler head  = new SolveHandler();
        head.setNext(digit);
        assertArrayEquals(new String[]{"Digit","5"}, head.handle("5", EMPTY));
    }

    @Test public void chain_rejected_when_exhausted() {
        SolveHandler head = new SolveHandler();
        assertNull(head.handle("xyz", EMPTY));
    }


    // ── Runner ────────────────────────────────────────────────────
    public static void main(String[] args) {
        Result result = JUnitCore.runClasses(CoRUnitTests.class);
        for (Failure f : result.getFailures()) System.out.println(f);
        if (result.wasSuccessful())
            System.out.println("OK (" + result.getRunCount() + " tests)");
        else
            System.exit(1);
    }
}
