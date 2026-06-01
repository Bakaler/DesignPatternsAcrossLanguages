# ============================================================
#  Unit Tests - Interpreter: Arithmetic Expression Evaluator
#
#  Run: pytest unit.test.py -v
# ============================================================

import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__),
                                '../../../../BehavioralPatterns/Interpreter/python'))
from python import (
    Context,
    NumberExpression, VariableExpression,
    AddExpression, SubtractExpression, MultiplyExpression, DivideExpression,
    FloorDivideExpression, ModuloExpression, PowerExpression,
    NegateExpression, AbsExpression, SqrtExpression, InverseExpression,
    FactorialExpression, PowerOfTenExpression, LogExpression,
)
import pytest

CTX = Context()


# ── Context ───────────────────────────────────────────────────
class TestContext:
    def test_stores_and_retrieves(self): assert Context().set("x", 42).get("x") == 42
    def test_raises_on_missing(self):
        with pytest.raises(KeyError): Context().get("z")
    def test_overwrites(self): assert Context().set("x", 1).set("x", 99).get("x") == 99
    def test_set_returns_self(self):
        ctx = Context(); assert ctx.set("a", 1) is ctx


# ── Terminal expressions ──────────────────────────────────────
class TestNumberExpression:
    def test_returns_value(self): assert NumberExpression(7).interpret(CTX) == 7
    def test_ignores_context(self): assert NumberExpression(3).interpret(Context().set("x", 99)) == 3
    def test_str_integer(self): assert str(NumberExpression(5)) == "5"

class TestVariableExpression:
    def test_resolves(self): assert VariableExpression("a").interpret(Context().set("a", 10)) == 10
    def test_raises_missing(self):
        with pytest.raises(KeyError): VariableExpression("z").interpret(CTX)
    def test_str_name(self): assert str(VariableExpression("a")) == "a"


# ── Binary operators ──────────────────────────────────────────
class TestAddExpression:
    def test_adds(self): assert AddExpression(NumberExpression(3), NumberExpression(4)).interpret(CTX) == 7

class TestSubtractExpression:
    def test_subtracts(self): assert SubtractExpression(NumberExpression(10), NumberExpression(3)).interpret(CTX) == 7
    def test_negative(self):  assert SubtractExpression(NumberExpression(2), NumberExpression(5)).interpret(CTX) == -3

class TestMultiplyExpression:
    def test_multiplies(self): assert MultiplyExpression(NumberExpression(4), NumberExpression(5)).interpret(CTX) == 20

class TestDivideExpression:
    def test_divides(self):   assert DivideExpression(NumberExpression(10), NumberExpression(2)).interpret(CTX) == 5
    def test_zero_raises(self):
        with pytest.raises(ZeroDivisionError): DivideExpression(NumberExpression(5), NumberExpression(0)).interpret(CTX)
    def test_fractional(self): assert DivideExpression(NumberExpression(10), NumberExpression(4)).interpret(CTX) == 2.5

class TestFloorDivideExpression:
    def test_floors(self):     assert FloorDivideExpression(NumberExpression(17), NumberExpression(5)).interpret(CTX) == 3
    def test_zero_raises(self):
        with pytest.raises(ZeroDivisionError): FloorDivideExpression(NumberExpression(5), NumberExpression(0)).interpret(CTX)
    def test_str_contains_slashes(self): assert "//" in str(FloorDivideExpression(NumberExpression(1), NumberExpression(2)))

class TestModuloExpression:
    def test_remainder(self):  assert ModuloExpression(NumberExpression(17), NumberExpression(5)).interpret(CTX) == 2
    def test_zero_raises(self):
        with pytest.raises(ZeroDivisionError): ModuloExpression(NumberExpression(5), NumberExpression(0)).interpret(CTX)
    def test_str_contains_percent(self): assert "%" in str(ModuloExpression(NumberExpression(1), NumberExpression(2)))

class TestPowerExpression:
    def test_power(self):           assert PowerExpression(NumberExpression(2), NumberExpression(10)).interpret(CTX) == 1024
    def test_fractional_exponent(self):
        assert abs(PowerExpression(NumberExpression(4), NumberExpression(0.5)).interpret(CTX) - 2) < 0.001
    def test_str_contains_stars(self): assert "**" in str(PowerExpression(NumberExpression(2), NumberExpression(3)))


# ── Unary functions ───────────────────────────────────────────
class TestNegateExpression:
    def test_negates_positive(self): assert NegateExpression(NumberExpression(5)).interpret(CTX) == -5
    def test_negates_negative(self): assert NegateExpression(NumberExpression(-3)).interpret(CTX) == 3

class TestAbsExpression:
    def test_abs_negative(self): assert AbsExpression(NumberExpression(-9)).interpret(CTX) == 9
    def test_abs_positive(self): assert AbsExpression(NumberExpression(7)).interpret(CTX) == 7

class TestSqrtExpression:
    def test_sqrt(self): assert SqrtExpression(NumberExpression(100)).interpret(CTX) == 10
    def test_negative_raises(self):
        with pytest.raises(ValueError): SqrtExpression(NumberExpression(-1)).interpret(CTX)

class TestInverseExpression:
    def test_inverse(self): assert InverseExpression(NumberExpression(4)).interpret(CTX) == 0.25
    def test_zero_raises(self):
        with pytest.raises(ZeroDivisionError): InverseExpression(NumberExpression(0)).interpret(CTX)

class TestFactorialExpression:
    def test_zero(self):     assert FactorialExpression(NumberExpression(0)).interpret(CTX) == 1
    def test_five(self):     assert FactorialExpression(NumberExpression(5)).interpret(CTX) == 120
    def test_six(self):      assert FactorialExpression(NumberExpression(6)).interpret(CTX) == 720
    def test_negative_raises(self):
        with pytest.raises(ValueError): FactorialExpression(NumberExpression(-1)).interpret(CTX)

class TestPowerOfTenExpression:
    def test_ten_squared(self): assert PowerOfTenExpression(NumberExpression(2)).interpret(CTX) == 100
    def test_ten_to_zero(self): assert PowerOfTenExpression(NumberExpression(0)).interpret(CTX) == 1

class TestLogExpression:
    def test_log_100(self):    assert LogExpression(NumberExpression(100)).interpret(CTX) == 2
    def test_log_1(self):      assert LogExpression(NumberExpression(1)).interpret(CTX) == 0
    def test_zero_raises(self):
        with pytest.raises(ValueError): LogExpression(NumberExpression(0)).interpret(CTX)
    def test_negative_raises(self):
        with pytest.raises(ValueError): LogExpression(NumberExpression(-5)).interpret(CTX)


# ── Composite trees ───────────────────────────────────────────
class TestCompositeTrees:
    def test_diff_of_squares(self):
        a, b = VariableExpression("a"), VariableExpression("b")
        ctx = Context().set("a", 10).set("b", 5)
        expr = MultiplyExpression(AddExpression(a, b), SubtractExpression(a, b))
        assert expr.interpret(ctx) == 75

    def test_sqrt_abs_composition(self):
        a, b = VariableExpression("a"), VariableExpression("b")
        ctx = Context().set("a", 7).set("b", 23)
        expr = SqrtExpression(AbsExpression(SubtractExpression(a, b)))
        assert expr.interpret(ctx) == 4

    def test_same_tree_different_contexts(self):
        a, b = VariableExpression("a"), VariableExpression("b")
        expr = MultiplyExpression(AddExpression(a, b), SubtractExpression(a, b))
        assert expr.interpret(Context().set("a", 10).set("b", 5)) == 75
        assert expr.interpret(Context().set("a", 6).set("b", 2))  == 32

    def test_pow10_abs_composition(self):
        b = VariableExpression("b")
        ctx = Context().set("b", -3)
        assert PowerOfTenExpression(AbsExpression(b)).interpret(ctx) == 1000
