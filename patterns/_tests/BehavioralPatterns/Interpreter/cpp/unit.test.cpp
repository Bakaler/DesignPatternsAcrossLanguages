// ============================================================
//  Unit Tests — Interpreter: Arithmetic Expression Evaluator (C++)
//
//  Compile: g++ -std=c++17 -DTESTING -o unit_test unit.test.cpp \
//               ../../../../BehavioralPatterns/Interpreter/cpp/cpp.cpp
//  Run: ./unit_test
// ============================================================

#define TESTING
#include "../../../../BehavioralPatterns/Interpreter/cpp/cpp.cpp"
#include <cassert>
#include <iostream>
#include <stdexcept>
#include <string>

static int passed = 0;
static int failed = 0;

#define TEST(name, body) \
    do { \
        try { body; ++passed; std::cout << "  PASS  " << name << "\n"; } \
        catch (const std::exception& e) { ++failed; std::cout << "  FAIL  " << name << " : " << e.what() << "\n"; } \
        catch (...) { ++failed; std::cout << "  FAIL  " << name << " : unknown exception\n"; } \
    } while (false)

#define ASSERT_EQ(a, b)   do { if (!((a) == (b))) throw std::runtime_error("Expected " #a " == " #b); } while(false)
#define ASSERT_NEAR(a, b) do { if (std::abs((a) - (b)) > 0.001) throw std::runtime_error("Values not close: " #a " vs " #b); } while(false)
#define ASSERT_THROWS(expr, ExType) \
    do { bool threw = false; try { expr; } catch (const ExType&) { threw = true; } \
         if (!threw) throw std::runtime_error("Expected exception " #ExType " not thrown"); } while(false)


int main() {
    std::cout << "\n  Unit Tests — Interpreter (C++)\n";
    std::cout << "  " << std::string(50, '-') << "\n\n";

    // ── Context ───────────────────────────────────────────────
    TEST("Context: stores and retrieves variable", {
        Context ctx; ctx.set("x", 42);
        ASSERT_NEAR(ctx.get("x"), 42.0);
    });

    TEST("Context: throws on missing variable", {
        Context ctx;
        ASSERT_THROWS(ctx.get("missing"), std::runtime_error);
    });

    TEST("Context: overwrites existing variable", {
        Context ctx; ctx.set("x", 1); ctx.set("x", 99);
        ASSERT_NEAR(ctx.get("x"), 99.0);
    });

    // ── NumberExpression ──────────────────────────────────────
    TEST("NumberExpression: returns literal value", {
        Context ctx;
        ASSERT_NEAR(num(7)->interpret(ctx), 7.0);
    });

    TEST("NumberExpression: ignores context", {
        Context ctx; ctx.set("x", 999);
        ASSERT_NEAR(num(3)->interpret(ctx), 3.0);
    });

    TEST("NumberExpression: display renders integer", {
        ASSERT_EQ(num(5)->display(), std::string("5"));
    });

    // ── VariableExpression ────────────────────────────────────
    TEST("VariableExpression: resolves from context", {
        Context ctx; ctx.set("a", 10);
        ASSERT_NEAR(var("a")->interpret(ctx), 10.0);
    });

    TEST("VariableExpression: throws when not in context", {
        Context ctx;
        ASSERT_THROWS(var("z")->interpret(ctx), std::runtime_error);
    });

    TEST("VariableExpression: display returns name", {
        ASSERT_EQ(var("a")->display(), std::string("a"));
    });

    // ── AddExpression ─────────────────────────────────────────
    TEST("AddExpression: adds two numbers", {
        Context ctx;
        ASSERT_NEAR(add(num(3), num(4))->interpret(ctx), 7.0);
    });

    TEST("AddExpression: adds two variables", {
        Context ctx; ctx.set("a", 10); ctx.set("b", 5);
        ASSERT_NEAR(add(var("a"), var("b"))->interpret(ctx), 15.0);
    });

    // ── SubtractExpression ────────────────────────────────────
    TEST("SubtractExpression: subtracts right from left", {
        Context ctx;
        ASSERT_NEAR(sub(num(10), num(3))->interpret(ctx), 7.0);
    });

    TEST("SubtractExpression: result can be negative", {
        Context ctx;
        ASSERT_NEAR(sub(num(2), num(5))->interpret(ctx), -3.0);
    });

    // ── MultiplyExpression ────────────────────────────────────
    TEST("MultiplyExpression: multiplies two numbers", {
        Context ctx;
        ASSERT_NEAR(mul(num(4), num(5))->interpret(ctx), 20.0);
    });

    TEST("MultiplyExpression: multiplies variable by number", {
        Context ctx; ctx.set("a", 6);
        ASSERT_NEAR(mul(var("a"), num(7))->interpret(ctx), 42.0);
    });

    // ── DivideExpression ──────────────────────────────────────
    TEST("DivideExpression: divides left by right", {
        Context ctx;
        ASSERT_NEAR(div_(num(10), num(2))->interpret(ctx), 5.0);
    });

    TEST("DivideExpression: throws on zero", {
        Context ctx;
        ASSERT_THROWS(div_(num(5), num(0))->interpret(ctx), std::runtime_error);
    });

    TEST("DivideExpression: produces fractional result", {
        Context ctx;
        ASSERT_NEAR(div_(num(10), num(4))->interpret(ctx), 2.5);
    });

    // ── Composite trees ───────────────────────────────────────
    TEST("Composite: diff of squares (a+b)*(a-b) = 75", {
        Context ctx; ctx.set("a", 10); ctx.set("b", 5);
        auto expr = mul(add(var("a"), var("b")), sub(var("a"), var("b")));
        ASSERT_NEAR(expr->interpret(ctx), 75.0);
    });

    TEST("Composite: same tree, different contexts", {
        auto a = var("a"); auto b = var("b");
        auto expr = mul(add(a, b), sub(a, b));
        Context c1; c1.set("a", 10); c1.set("b", 5);
        Context c2; c2.set("a",  6); c2.set("b", 2);
        ASSERT_NEAR(expr->interpret(c1), 75.0);
        ASSERT_NEAR(expr->interpret(c2), 32.0);
    });

    TEST("Composite: (3+4)*2 = 14", {
        Context ctx;
        ASSERT_NEAR(mul(add(num(3), num(4)), num(2))->interpret(ctx), 14.0);
    });

    // ── Summary ───────────────────────────────────────────────
    std::cout << "\n  " << std::string(50, '-') << "\n";
    std::cout << "  " << passed << " passed, " << failed << " failed\n\n";
    return failed > 0 ? 1 : 0;
}
