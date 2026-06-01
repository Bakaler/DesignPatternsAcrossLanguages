// ============================================================
//  Integration Tests — Interpreter: Arithmetic Expression Evaluator (C++)
//
//  Compile: g++ -std=c++17 -DTESTING -o integration_test integration.test.cpp \
//               ../../../../BehavioralPatterns/Interpreter/cpp/cpp.cpp
//  Run: ./integration_test
// ============================================================

#define TESTING
#include "../../../../BehavioralPatterns/Interpreter/cpp/cpp.cpp"
#include <cassert>
#include <iostream>
#include <stdexcept>
#include <string>
#include <cmath>

static int passed = 0;
static int failed = 0;

#define TEST(name, body) \
    do { \
        try { body; ++passed; std::cout << "  PASS  " << name << "\n"; } \
        catch (const std::exception& e) { ++failed; std::cout << "  FAIL  " << name << " : " << e.what() << "\n"; } \
        catch (...) { ++failed; std::cout << "  FAIL  " << name << " : unknown exception\n"; } \
    } while (false)

#define ASSERT_NEAR(a, b) do { if (std::abs((a) - (b)) > 0.001) throw std::runtime_error("Values not close"); } while(false)
#define ASSERT_TRUE(cond) do { if (!(cond)) throw std::runtime_error("Assertion failed: " #cond); } while(false)
#define ASSERT_THROWS(expr, ExType) \
    do { bool threw = false; try { expr; } catch (const ExType&) { threw = true; } \
         if (!threw) throw std::runtime_error("Expected exception not thrown"); } while(false)


int main() {
    std::cout << "\n  Integration Tests — Interpreter (C++)\n";
    std::cout << "  " << std::string(50, '-') << "\n\n";

    // ── Full expression evaluation end-to-end ─────────────────
    TEST("Three-level nested tree evaluates correctly", {
        // ((a + b) * (a - b)) / 5  with a=10, b=5  →  15
        auto a = var("a"); auto b = var("b");
        Context ctx; ctx.set("a", 10); ctx.set("b", 5);
        auto expr = div_(mul(add(a, b), sub(a, b)), num(5));
        ASSERT_NEAR(expr->interpret(ctx), 15.0);
    });

    TEST("Tree reuse: three different contexts", {
        auto a = var("a"); auto b = var("b");
        auto expr = mul(add(a, b), sub(a, b));

        struct TC { double av, bv, expected; };
        for (auto [av, bv, expected] : std::initializer_list<TC>{{10,5,75},{6,2,32},{3,1,8}}) {
            Context ctx; ctx.set("a", av); ctx.set("b", bv);
            ASSERT_NEAR(expr->interpret(ctx), expected);
        }
    });

    TEST("Display produces fully parenthesised string", {
        auto expr = mul(add(var("a"), var("b")), sub(var("a"), var("b")));
        std::string s = expr->display();
        ASSERT_TRUE(s.find("(a + b)") != std::string::npos);
        ASSERT_TRUE(s.find("(a - b)") != std::string::npos);
        ASSERT_TRUE(s[0] == '(');
    });

    // ── Error propagation ─────────────────────────────────────
    TEST("Missing variable in deep subtree surfaces", {
        auto expr = add(num(1), mul(var("missing"), num(2)));
        Context ctx;
        ASSERT_THROWS(expr->interpret(ctx), std::runtime_error);
    });

    TEST("Division by zero in subtree surfaces", {
        auto expr = add(num(1), div_(num(4), num(0)));
        Context ctx;
        ASSERT_THROWS(expr->interpret(ctx), std::runtime_error);
    });

    // ── Context independence ───────────────────────────────────
    TEST("Parallel evaluations do not interfere", {
        auto expr = add(var("a"), var("b"));
        Context ctx1; ctx1.set("a", 1);   ctx1.set("b", 2);
        Context ctx2; ctx2.set("a", 100); ctx2.set("b", 200);
        ASSERT_NEAR(expr->interpret(ctx1),   3.0);
        ASSERT_NEAR(expr->interpret(ctx2), 300.0);
    });

    // ── Arithmetic correctness ─────────────────────────────────
    TEST("Addition is commutative", {
        Context ctx; ctx.set("a", 3); ctx.set("b", 7);
        auto ab = add(var("a"), var("b"));
        auto ba = add(var("b"), var("a"));
        ASSERT_NEAR(ab->interpret(ctx), ba->interpret(ctx));
    });

    TEST("Multiply by zero gives zero", {
        Context ctx; ctx.set("a", 999);
        ASSERT_NEAR(mul(var("a"), num(0))->interpret(ctx), 0.0);
    });

    TEST("Divide by one gives same value", {
        Context ctx; ctx.set("a", 42);
        ASSERT_NEAR(div_(var("a"), num(1))->interpret(ctx), 42.0);
    });

    // ── Summary ───────────────────────────────────────────────
    std::cout << "\n  " << std::string(50, '-') << "\n";
    std::cout << "  " << passed << " passed, " << failed << " failed\n\n";
    return failed > 0 ? 1 : 0;
}
