# ============================================================
#  Integration Tests - Interpreter: Arithmetic Expression Evaluator
#
#  What we test here:
#    · Multi-level nested trees evaluate correctly end-to-end
#    · Tree reuse: same tree, multiple contexts → multiple results
#    · Error propagation from deep sub-trees surfaces correctly
#    · Context independence: parallel evaluations don't interfere
#    · Arithmetic correctness: commutativity, associativity, identity
#
#  Run: pytest integration.test.py -v
# ============================================================

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__),
                                '../../../../BehavioralPatterns/Interpreter/python'))
from python import (
    Context,
    NumberExpression, VariableExpression,
    AddExpression, SubtractExpression,
    MultiplyExpression, DivideExpression,
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
