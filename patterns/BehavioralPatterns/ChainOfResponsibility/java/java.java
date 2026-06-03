// ============================================================
//  Chain of Responsibility: Grammar Token Validator
//  Run: javac java.java && java Main
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Handler (abstract)   Handler
//  ConcreteHandlers     SolveHandler, ExpHandler, TermHandler,
//                       PowerHandler, FactorHandler,
//                       FunctionHandler, DigitHandler
//  Context              ParseContext
//  Client               build_chain() + Main
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
//  Calling .build() returns the root Expression node, which
//  you then evaluate with .interpret(ctx).
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

import java.util.*;
import java.util.function.*;


// ─────────────────────────────────────────────────────────────
//  Interpreter Expression classes (inlined from Interpreter)
// ─────────────────────────────────────────────────────────────

// SECTION:: Context (Interpreter)
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

interface Expression {
    double interpret(Context ctx);
    String display();
}


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════

class NumberExpression implements Expression {
    private final double value;
    NumberExpression(double v) { this.value = v; }
    @Override public double interpret(Context ctx) { return value; }
    @Override public String display() {
        return value == Math.floor(value) ? String.valueOf((int) value) : String.valueOf(value);
    }
}

class VariableExpression implements Expression {
    private final String name;
    VariableExpression(String n) { this.name = n; }
    @Override public double interpret(Context ctx) { return ctx.get(name); }
    @Override public String display() { return name; }
}


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════

class AddExpression implements Expression {
    private final Expression l, r;
    AddExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) + r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " + " + r.display() + ")"; }
}

class SubtractExpression implements Expression {
    private final Expression l, r;
    SubtractExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) - r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " - " + r.display() + ")"; }
}

class MultiplyExpression implements Expression {
    private final Expression l, r;
    MultiplyExpression(Expression l, Expression r) { this.l = l; this.r = r; }
    @Override public double interpret(Context ctx) { return l.interpret(ctx) * r.interpret(ctx); }
    @Override public String display() { return "(" + l.display() + " * " + r.display() + ")"; }
}

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

class PowerExpression implements Expression {
    private final Expression base, exp;
    PowerExpression(Expression b, Expression e) { this.base = b; this.exp = e; }
    @Override public double interpret(Context ctx) { return Math.pow(base.interpret(ctx), exp.interpret(ctx)); }
    @Override public String display() { return "(" + base.display() + " ** " + exp.display() + ")"; }
}


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════

class NegateExpression implements Expression {
    private final Expression child;
    NegateExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) { return -child.interpret(ctx); }
    @Override public String display() { return "(-" + child.display() + ")"; }
}

class AbsExpression implements Expression {
    private final Expression child;
    AbsExpression(Expression c) { this.child = c; }
    @Override public double interpret(Context ctx) { return Math.abs(child.interpret(ctx)); }
    @Override public String display() { return "abs(" + child.display() + ")"; }
}

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

class PowerOfTenExpression implements Expression {
    private final Expression exp;
    PowerOfTenExpression(Expression e) { this.exp = e; }
    @Override public double interpret(Context ctx) { return Math.pow(10, exp.interpret(ctx)); }
    @Override public String display() { return "(10 ** " + exp.display() + ")"; }
}

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


// ─────────────────────────────────────────────────────────────
//  CoR: Constants
// ─────────────────────────────────────────────────────────────

// SECTION:: Constants
// ═════════════════════════════════════════════════════════════
//  CONSTANTS
// ═════════════════════════════════════════════════════════════

class CoRConstants {
    static final Set<String> OPERANDS = new HashSet<>(Arrays.asList(
        "+", "-", "*", "**", "/", "//", "%"
    ));
    static final Set<String> DEFAULT_FUNCTIONS = new HashSet<>(Arrays.asList(
        "abs", "sqrt", "neg", "square", "inverse", "factorial", "log"
    ));
}


// SECTION:: ParseContext
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

class ParseContext {
    /**
     * Carries the state each handler needs to make validation decisions.
     *
     * trailing   : the last accepted token string, or null at the start
     * parenDepth : number of unmatched '(' currently open
     * hasDecimal : true if the current number segment already has a '.'
     */
    final String  trailing;
    final int     parenDepth;
    final boolean hasDecimal;

    ParseContext() { this(null, 0, false); }
    ParseContext(String trailing, int parenDepth, boolean hasDecimal) {
        this.trailing   = trailing;
        this.parenDepth = parenDepth;
        this.hasDecimal = hasDecimal;
    }
}


// SECTION:: Abstract Handler
// ═════════════════════════════════════════════════════════════
//  ABSTRACT HANDLER
// ═════════════════════════════════════════════════════════════

abstract class Handler {
    /**
     * Every grammar-rule handler inherits from this class.
     *
     * setNext(handler)   wire the next link in the chain;
     *                    returns the handler so calls can be chained.
     * handle(token, ctx) subclasses implement this.
     *                    Return String[]{type, processed} to CLAIM,
     *                    or call _pass() to forward.  Returns null
     *                    if no handler claims the token.
     */
    protected Handler next = null;

    Handler setNext(Handler h) { this.next = h; return h; }

    abstract String[] handle(String token, ParseContext ctx);

    protected String[] _pass(String token, ParseContext ctx) {
        if (next != null) return next.handle(token, ctx);
        return null;
    }

    @Override public String toString() { return getClass().getSimpleName(); }
}


// SECTION:: Concrete Handlers
// ═════════════════════════════════════════════════════════════
//  SOLVE HANDLER: '='
// ═════════════════════════════════════════════════════════════

class SolveHandler extends Handler {
    /** Claims '=' unconditionally; it is always a valid evaluation trigger. */
    @Override public String[] handle(String token, ParseContext ctx) {
        if ("=".equals(token)) return new String[]{"Solve", token};
        return _pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  EXP HANDLER: +  -
// ═════════════════════════════════════════════════════════════

class ExpHandler extends Handler {
    /**
     * _exp rule.  Claims '+' and '-'.
     *
     * Valid   : trailing is a digit, ')', or a function name
     * Invalid : nothing entered yet, or trailing is '(' or an operator
     */
    private static final Set<String> TOKENS = new HashSet<>(Arrays.asList("+", "-"));

    @Override public String[] handle(String token, ParseContext ctx) {
        if (!TOKENS.contains(token)) return _pass(token, ctx);

        if (ctx.trailing == null) return null;
        if ("(".equals(ctx.trailing) || CoRConstants.OPERANDS.contains(ctx.trailing)) return null;

        return new String[]{"Exp", " " + token + " "};
    }
}


// ═════════════════════════════════════════════════════════════
//  TERM HANDLER: *  /  //  %
// ═════════════════════════════════════════════════════════════

class TermHandler extends Handler {
    /**
     * _term rule.  Claims '*', '/', '//', '%'.
     * Note: '**' is a distinct token and passes through here unclaimed.
     */
    private static final Set<String> TOKENS = new HashSet<>(Arrays.asList("*", "/", "//", "%"));

    @Override public String[] handle(String token, ParseContext ctx) {
        if (!TOKENS.contains(token)) return _pass(token, ctx);

        if (ctx.trailing == null) return null;
        if ("(".equals(ctx.trailing) || CoRConstants.OPERANDS.contains(ctx.trailing)) return null;

        return new String[]{"Term", " " + token + " "};
    }
}


// ═════════════════════════════════════════════════════════════
//  POWER HANDLER: **
// ═════════════════════════════════════════════════════════════

class PowerHandler extends Handler {
    /**
     * _power rule.  Claims '**'.
     * Passes '*' through so TermHandler catches single-star multiplication.
     */
    @Override public String[] handle(String token, ParseContext ctx) {
        if (!"**".equals(token)) return _pass(token, ctx);

        if (ctx.trailing == null) return null;
        if ("(".equals(ctx.trailing) || CoRConstants.OPERANDS.contains(ctx.trailing)) return null;

        return new String[]{"Power", " " + token + " "};
    }
}


// ═════════════════════════════════════════════════════════════
//  FACTOR HANDLER: (  )
// ═════════════════════════════════════════════════════════════

class FactorHandler extends Handler {
    /**
     * _factor rule.  Claims '(' and ')'.
     *
     * '(' is always accepted (open a new group).
     * ')' requires at least one unmatched '(' to be open (parenDepth > 0).
     */
    @Override public String[] handle(String token, ParseContext ctx) {
        if ("(".equals(token)) return new String[]{"Factor", token};

        if (")".equals(token)) {
            if (ctx.parenDepth <= 0) return null;
            return new String[]{"Factor", token};
        }

        return _pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  FUNCTION HANDLER: abs  sqrt  neg  ...
// ═════════════════════════════════════════════════════════════

class FunctionHandler extends Handler {
    /**
     * _function rule.  Claims any token in the supplied function set.
     * The set is injected at construction so the handler stays open for
     * extension without modification.
     */
    private final Set<String> functions;

    FunctionHandler(Set<String> functions) { this.functions = functions; }

    @Override public String[] handle(String token, ParseContext ctx) {
        if (functions.contains(token)) return new String[]{"Function", token};
        return _pass(token, ctx);
    }
}


// ═════════════════════════════════════════════════════════════
//  DIGIT HANDLER: 0-9  .
// ═════════════════════════════════════════════════════════════

class DigitHandler extends Handler {
    /**
     * _digit rule.  Terminal handler; end of the chain.
     *
     * Single digits 0-9 are always accepted unless trailing is ')'.
     * '.' is accepted when the current number has no decimal yet;
     *      a bare '.' is prefixed with '0' → returned as ["SoloDec", "0."].
     * Everything else falls off the chain as null (rejected).
     */
    @Override public String[] handle(String token, ParseContext ctx) {
        if (")".equals(ctx.trailing)) return null;

        if (token.length() == 1 && Character.isDigit(token.charAt(0)))
            return new String[]{"Digit", token};

        if (".".equals(token)) {
            if (ctx.hasDecimal) return null;
            return new String[]{"SoloDec", "0."};
        }

        return null;
    }
}


// SECTION:: Chain Factory
// ═════════════════════════════════════════════════════════════
//  CHAIN FACTORY
// ═════════════════════════════════════════════════════════════

class ChainFactory {
    /**
     * Assemble the validation chain and return its head.
     *
     * Chain order mirrors grammar precedence (lowest to highest):
     *   SolveHandler
     *     → ExpHandler        (+ -)
     *     → TermHandler       (* / // %)
     *     → PowerHandler      (**)
     *     → FactorHandler     ( )
     *     → FunctionHandler   (abs sqrt ...)
     *     → DigitHandler      (0-9 .)
     */
    static Handler buildChain(Set<String> functions) {
        if (functions == null) functions = CoRConstants.DEFAULT_FUNCTIONS;

        Handler head  = new SolveHandler();
        Handler exp   = new ExpHandler();
        Handler term  = new TermHandler();
        Handler power = new PowerHandler();
        Handler fact  = new FactorHandler();
        Handler func  = new FunctionHandler(functions);
        Handler digit = new DigitHandler();

        head.setNext(exp)
            .setNext(term)
            .setNext(power)
            .setNext(fact)
            .setNext(func)
            .setNext(digit);

        return head;
    }

    static Handler buildChain() { return buildChain(null); }
}


// SECTION:: TreeBuilder
// ═════════════════════════════════════════════════════════════
//  TREE BUILDER: CoR + Interpreter pipeline
// ═════════════════════════════════════════════════════════════

class TreeBuilder {
    /**
     * Consumes String[]{tokenType, processedToken} pairs (exactly what the
     * CoR chain returns) and builds an Interpreter expression tree using
     * the shunting-yard algorithm.
     */

    // Precedence table for binary operators
    private static final Map<String, Integer> PRECEDENCE = new HashMap<>();
    static {
        PRECEDENCE.put("+", 1); PRECEDENCE.put("-", 1);
        PRECEDENCE.put("*", 2); PRECEDENCE.put("/", 2);
        PRECEDENCE.put("//", 2); PRECEDENCE.put("%", 2);
        PRECEDENCE.put("**", 3);
    }

    // Set of known unary function names
    private static final Set<String> UNARY_NAMES = new HashSet<>(Arrays.asList(
        "abs", "sqrt", "neg", "square", "inverse", "factorial", "log"
    ));

    private final Deque<Expression> output  = new ArrayDeque<>();
    private final Deque<String>     ops     = new ArrayDeque<>();
    private       String            pending = "";

    void push(String tokenType, String token) {
        String stripped = token.trim();

        if ("Digit".equals(tokenType)) {
            pending += stripped;

        } else if ("SoloDec".equals(tokenType)) {
            pending += pending.isEmpty() ? "0." : ".";

        } else if ("Exp".equals(tokenType) || "Term".equals(tokenType) || "Power".equals(tokenType)) {
            flushPending();
            int prec = PRECEDENCE.getOrDefault(stripped, 0);
            while (!ops.isEmpty()
                    && !"(".equals(ops.peek())
                    && !UNARY_NAMES.contains(ops.peek())
                    && PRECEDENCE.getOrDefault(ops.peek(), 0) >= prec) {
                applyBinary();
            }
            ops.push(stripped);

        } else if ("Function".equals(tokenType)) {
            flushPending();
            ops.push(stripped);

        } else if ("Factor".equals(tokenType)) {
            if ("(".equals(stripped)) {
                flushPending();
                ops.push("(");
            } else {   // ')'
                flushPending();
                while (!ops.isEmpty() && !"(".equals(ops.peek())) {
                    applyTop();
                }
                if (!ops.isEmpty()) ops.pop();   // discard '('
                if (!ops.isEmpty() && UNARY_NAMES.contains(ops.peek())) {
                    applyUnary();
                }
            }

        } else if ("Solve".equals(tokenType)) {
            flushPending();
            while (!ops.isEmpty()) applyTop();
        }
    }

    Expression build() {
        flushPending();
        while (!ops.isEmpty()) applyTop();
        return output.isEmpty() ? new NumberExpression(0) : output.peek();
    }

    private void flushPending() {
        if (!pending.isEmpty()) {
            output.push(new NumberExpression(Double.parseDouble(pending)));
            pending = "";
        }
    }

    private void applyTop() {
        if (UNARY_NAMES.contains(ops.peek())) applyUnary();
        else applyBinary();
    }

    private void applyBinary() {
        String op    = ops.pop();
        Expression r = output.pop();
        Expression l = output.pop();
        switch (op) {
            case "+":  output.push(new AddExpression(l, r));         break;
            case "-":  output.push(new SubtractExpression(l, r));    break;
            case "*":  output.push(new MultiplyExpression(l, r));    break;
            case "/":  output.push(new DivideExpression(l, r));      break;
            case "//": output.push(new FloorDivideExpression(l, r)); break;
            case "%":  output.push(new ModuloExpression(l, r));      break;
            case "**": output.push(new PowerExpression(l, r));       break;
        }
    }

    private void applyUnary() {
        String fn     = ops.pop();
        Expression x  = output.pop();
        switch (fn) {
            case "abs":       output.push(new AbsExpression(x));                                          break;
            case "sqrt":      output.push(new SqrtExpression(x));                                         break;
            case "neg":       output.push(new NegateExpression(x));                                       break;
            case "square":    output.push(new PowerExpression(x, new NumberExpression(2)));                break;
            case "inverse":   output.push(new InverseExpression(x));                                      break;
            case "factorial": output.push(new FactorialExpression(x));                                    break;
            case "log":       output.push(new LogExpression(x));                                          break;
        }
    }
}


class ParseAndBuild {
    /**
     * Convenience method: feed a token list through the full pipeline
     * and return the root Expression node ready for .interpret().
     *
     * Throws IllegalArgumentException on the first invalid token.
     */
    static Expression run(List<String> tokens, Set<String> functions) {
        Handler     chain   = ChainFactory.buildChain(functions);
        TreeBuilder builder = new TreeBuilder();
        ParseContext ctx    = new ParseContext();

        for (String tok : tokens) {
            String[] result = chain.handle(tok, ctx);
            if (result == null)
                throw new IllegalArgumentException(
                    "Invalid token \"" + tok + "\" after \"" + ctx.trailing + "\"");
            builder.push(result[0], result[1]);

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

        return builder.build();
    }

    static Expression run(List<String> tokens) { return run(tokens, null); }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

class Main {
    private static final String SEP = "═".repeat(64);

    static String fmt(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Chain of Responsibility + Interpreter: Full Pipeline        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        Context ctx = new Context();

        // ── Part 1: CoR validation chain alone ──────────────────────
        System.out.println("\n" + SEP);
        System.out.println("  Part 1 - CoR chain: validate and classify tokens");
        System.out.println(SEP);

        Handler chain = ChainFactory.buildChain();
        Object[][] demos = {
            { Arrays.asList("2","3","4","+","(","1","2","/","3",")","="), "234 + (12 / 3)" },
            { Arrays.asList("+", "5"),                                     "leading '+'   rejected" },
            { Arrays.asList("1","2","+","+"),                              "12 + +        rejected" },
        };
        for (Object[] demo : demos) {
            @SuppressWarnings("unchecked")
            List<String> tokens = (List<String>) demo[0];
            String label = (String) demo[1];
            System.out.println("\n  " + label);
            ParseContext c = new ParseContext();
            for (String tok : tokens) {
                String[] r = chain.handle(tok, c);
                System.out.println("    " + String.format("%-7s", "\"" + tok + "\"") +
                    " → " + (r == null ? "null" : Arrays.toString(r)));
                if (r == null) break;
                String tt = r[0];
                int pd = c.parenDepth + ("(".equals(tok) ? 1 : ")".equals(tok) ? -1 : 0);
                boolean hd = (c.hasDecimal || ".".equals(tok)) &&
                             !("Exp".equals(tt) || "Term".equals(tt) || "Power".equals(tt));
                c = new ParseContext(tok, pd, hd);
            }
        }

        // ── Part 2: Full pipeline ────────────────────────────────────
        System.out.println("\n" + SEP);
        System.out.println("  Part 2 - Full pipeline: tokens → CoR → tree → interpret()");
        System.out.println(SEP);

        Object[][] examples = {
            { Arrays.asList("3","+","4","="),                               "3 + 4" },
            { Arrays.asList("2","+","3","*","4","="),                        "2 + 3 * 4  (precedence)" },
            { Arrays.asList("(","2","+","3",")","*","4","="),                "(2 + 3) * 4" },
            { Arrays.asList("2","**","8","="),                               "2 ** 8" },
            { Arrays.asList("sqrt","9","="),                                 "sqrt 9" },
            { Arrays.asList("abs","neg","5","="),                            "abs(neg(5))" },
            { Arrays.asList("sqrt","(","3","**","2","+","4","**","2",")","="), "sqrt(3^2 + 4^2)  Pythagorean" },
            { Arrays.asList("1","7","%","5","="),                            "17 % 5" },
            { Arrays.asList("1","5","//","4","="),                           "15 // 4" },
        };

        for (Object[] ex : examples) {
            @SuppressWarnings("unchecked")
            List<String> tokens = (List<String>) ex[0];
            String label = (String) ex[1];
            Expression tree   = ParseAndBuild.run(tokens);
            double     result = tree.interpret(ctx);
            System.out.printf("  %-35s  tree: %-40s  = %s%n",
                label, tree.display(), fmt(result));
        }

        System.out.println("\n" + SEP);
        System.out.println("  CoR owns VALIDATION.  Interpreter owns EVALUATION.");
        System.out.println("  TreeBuilder is the only piece that knows about both.");
        System.out.println(SEP);

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}
