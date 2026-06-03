# ============================================================
#  Integration Tests - Interpreter: Arithmetic Expression Evaluator
#
#  What we test here:
#    · Multi-level nested trees evaluate correctly end-to-end
#    · Tree reuse: same tree, multiple contexts → multiple results
#    · Error propagation from deep sub-trees surfaces correctly
#    · Context independence: parallel evaluations don't interfere
#    · Arithmetic correctness: commutativity, associativity, identity
#    · Complex real-world equations
#
#  Run: pytest integration.test.py -v --import-mode=importlib
# ============================================================

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__),
                                '../../../../BehavioralPatterns/Interpreter/python'))
from python import (
    Context,
    NumberExpression, VariableExpression,
    AddExpression, SubtractExpression,
    MultiplyExpression, DivideExpression,
    FloorDivideExpression, ModuloExpression, PowerExpression,
    NegateExpression, AbsExpression, SqrtExpression,
    FactorialExpression, PowerOfTenExpression, LogExpression,
)
import pytest


# ── Full expression evaluation end-to-end ────────────────────
class TestEndToEnd:
    def test_three_level_nested_tree(self):
        # ((a + b) * (a - b)) / 5  with a=10, b=5  →  75/5 = 15
        a   = VariableExpression("a")
        b   = VariableExpression("b")
        ctx = Context().set("a", 10).set("b", 5)
        expr = DivideExpression(
            MultiplyExpression(AddExpression(a, b), SubtractExpression(a, b)),
            NumberExpression(5),
        )
        assert expr.interpret(ctx) == 15

    def test_tree_reuse_three_contexts(self):
        a    = VariableExpression("a")
        b    = VariableExpression("b")
        expr = MultiplyExpression(AddExpression(a, b), SubtractExpression(a, b))

        cases = [(10, 5, 75), (6, 2, 32), (3, 1, 8)]
        for av, bv, expected in cases:
            ctx = Context().set("a", av).set("b", bv)
            assert expr.interpret(ctx) == expected

    def test_str_produces_fully_parenthesised_string(self):
        expr = MultiplyExpression(
            AddExpression(VariableExpression("a"), VariableExpression("b")),
            SubtractExpression(VariableExpression("a"), VariableExpression("b")),
        )
        s = str(expr)
        assert "(a + b)" in s
        assert "(a - b)" in s
        assert s.startswith("(")


# ── Error propagation ─────────────────────────────────────────
class TestErrorPropagation:
    def test_missing_variable_in_deep_subtree(self):
        expr = AddExpression(
            NumberExpression(1),
            MultiplyExpression(VariableExpression("missing"), NumberExpression(2)),
        )
        with pytest.raises(KeyError, match="Undefined variable"):
            expr.interpret(Context())

    def test_division_by_zero_in_subtree(self):
        expr = AddExpression(
            NumberExpression(1),
            DivideExpression(NumberExpression(4), NumberExpression(0)),
        )
        with pytest.raises(ZeroDivisionError):
            expr.interpret(Context())


# ── Context independence ──────────────────────────────────────
class TestContextIndependence:
    def test_parallel_evaluations_do_not_interfere(self):
        a    = VariableExpression("a")
        b    = VariableExpression("b")
        expr = AddExpression(a, b)

        ctx1 = Context().set("a", 1).set("b", 2)
        ctx2 = Context().set("a", 100).set("b", 200)

        assert expr.interpret(ctx1) == 3
        assert expr.interpret(ctx2) == 300


# ── Arithmetic correctness ────────────────────────────────────
class TestArithmeticCorrectness:
    def test_addition_is_commutative(self):
        ctx = Context().set("a", 3).set("b", 7)
        ab  = AddExpression(VariableExpression("a"), VariableExpression("b"))
        ba  = AddExpression(VariableExpression("b"), VariableExpression("a"))
        assert ab.interpret(ctx) == ba.interpret(ctx)

    def test_subtraction_is_not_commutative(self):
        ctx = Context().set("a", 10).set("b", 3)
        ab  = SubtractExpression(VariableExpression("a"), VariableExpression("b"))
        ba  = SubtractExpression(VariableExpression("b"), VariableExpression("a"))
        assert ab.interpret(ctx) != ba.interpret(ctx)

    def test_multiply_by_zero_gives_zero(self):
        ctx  = Context().set("a", 999)
        expr = MultiplyExpression(VariableExpression("a"), NumberExpression(0))
        assert expr.interpret(ctx) == 0

    def test_divide_by_one_gives_same_value(self):
        ctx  = Context().set("a", 42)
        expr = DivideExpression(VariableExpression("a"), NumberExpression(1))
        assert expr.interpret(ctx) == 42


# ── Complex real-world equations ──────────────────────────────
class TestComplexEquations:
    def test_pythagorean_triple(self):
        # sqrt(3² + 4²) = 5
        expr = SqrtExpression(
            AddExpression(
                PowerExpression(NumberExpression(3), NumberExpression(2)),
                PowerExpression(NumberExpression(4), NumberExpression(2)),
            )
        )
        assert expr.interpret(Context()) == 5.0

    def test_quadratic_discriminant(self):
        # sqrt(b² - 4ac)  with  a=1, b=5, c=6  →  sqrt(25 - 24) = 1
        a = VariableExpression("a")
        b = VariableExpression("b")
        c = VariableExpression("c")
        ctx = Context().set("a", 1).set("b", 5).set("c", 6)
        expr = SqrtExpression(
            SubtractExpression(
                PowerExpression(b, NumberExpression(2)),
                MultiplyExpression(MultiplyExpression(NumberExpression(4), a), c),
            )
        )
        assert expr.interpret(ctx) == 1.0

    def test_log_identity(self):
        # 10 ^ log10(a) = a  with  a = 1000
        ctx  = Context().set("a", 1000)
        expr = PowerOfTenExpression(LogExpression(VariableExpression("a")))
        assert expr.interpret(ctx) == 1000

    def test_binomial_coefficient(self):
        # C(n, k) = n! / (k! * (n-k)!)  with  n=5, k=2  →  10
        n   = VariableExpression("n")
        k   = VariableExpression("k")
        ctx = Context().set("n", 5).set("k", 2)
        expr = FloorDivideExpression(
            FactorialExpression(n),
            MultiplyExpression(
                FactorialExpression(k),
                FactorialExpression(SubtractExpression(n, k)),
            ),
        )
        assert expr.interpret(ctx) == 10

    def test_geometric_series_sum(self):
        # a * (r^n - 1) / (r - 1)  with  a=1, r=2, n=4  →  15
        a   = VariableExpression("a")
        r   = VariableExpression("r")
        n   = VariableExpression("n")
        ctx = Context().set("a", 1).set("r", 2).set("n", 4)
        expr = MultiplyExpression(
            a,
            DivideExpression(
                SubtractExpression(PowerExpression(r, n), NumberExpression(1)),
                SubtractExpression(r, NumberExpression(1)),
            ),
        )
        assert expr.interpret(ctx) == 15

    def test_triangular_number(self):
        # n*(n+1) // 2  with  n=10  →  55   (sum 1..10)
        n   = VariableExpression("n")
        ctx = Context().set("n", 10)
        expr = FloorDivideExpression(
            MultiplyExpression(n, AddExpression(n, NumberExpression(1))),
            NumberExpression(2),
        )
        assert expr.interpret(ctx) == 55

    def test_abs_neg_abs_neg_cancels(self):
        # abs(neg(abs(neg(x)))) = |x|  with  x = -7  →  7
        x    = VariableExpression("x")
        ctx  = Context().set("x", -7)
        expr = AbsExpression(NegateExpression(AbsExpression(NegateExpression(x))))
        assert expr.interpret(ctx) == 7

    def test_modulo_after_power(self):
        # (a² - 1) % b  with  a=4, b=5  →  15 % 5 = 0
        a   = VariableExpression("a")
        b   = VariableExpression("b")
        ctx = Context().set("a", 4).set("b", 5)
        expr = ModuloExpression(
            SubtractExpression(PowerExpression(a, NumberExpression(2)), NumberExpression(1)),
            b,
        )
        assert expr.interpret(ctx) == 0

    def test_complex_str_representation(self):
        # Verify the full tree renders as a fully-parenthesised string
        # sqrt(b² - 4ac)
        a    = VariableExpression("a")
        b    = VariableExpression("b")
        c    = VariableExpression("c")
        expr = SqrtExpression(
            SubtractExpression(
                PowerExpression(b, NumberExpression(2)),
                MultiplyExpression(MultiplyExpression(NumberExpression(4), a), c),
            )
        )
        s = str(expr)
        assert s.startswith("sqrt(")
        assert "(b ** 2)" in s
        assert "(4 * a)" in s
