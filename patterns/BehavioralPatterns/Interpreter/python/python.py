# ============================================================
#  Interpreter: Arithmetic Expression Evaluator
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  AbstractExpression   Expression (ABC)
#  TerminalExpression   NumberExpression, VariableExpression
#  NonterminalExpr.     AddExpression, SubtractExpression,
#                       MultiplyExpression, DivideExpression,
#                       FloorDivideExpression, ModuloExpression,
#                       PowerExpression,
#                       AbsExpression, SqrtExpression,
#                       InverseExpression, FactorialExpression,
#                       PowerOfTenExpression, LogExpression,
#                       NegateExpression
#  Context              Context (variable → number map)
#  Client               Entry point
#
#  Grammar mirrored from EBNF_parser
#  ────────────────────────────────────────────────────────
#  _exp     : + -           AddExpression, SubtractExpression
#  _term    : * / // %      MultiplyExpression, DivideExpression,
#                           FloorDivideExpression, ModuloExpression
#  _power   : **            PowerExpression
#  _function: abs sqrt 1/x  AbsExpression, SqrtExpression,
#             n! 10^y log   InverseExpression, FactorialExpression,
#             x^y neg       PowerOfTenExpression, LogExpression,
#                           PowerExpression, NegateExpression
#  _digit   : literal / var NumberExpression, VariableExpression
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Grammar as classes  each rule is a class; trees are first-class objects
#  ✓ Easy to extend      new operations add a class, touch nothing else
#  ✓ Context reuse       one tree, multiple contexts → multiple results
#  ✗ Class explosion     complex grammars produce many small classes
# ============================================================

from __future__ import annotations
from abc import ABC, abstractmethod
import math


# SECTION:: Context
# ═════════════════════════════════════════════════════════════
#  CONTEXT
# ═════════════════════════════════════════════════════════════

class Context:
    def __init__(self) -> None:
        self._vars: dict[str, float] = {}

    def set(self, name: str, value: float) -> "Context":
        self._vars[name] = value
        return self

    def get(self, name: str) -> float:
        if name not in self._vars:
            raise KeyError(f"Undefined variable: {name}")
        return self._vars[name]


# SECTION:: Abstract Expression
# ═════════════════════════════════════════════════════════════
#  ABSTRACT EXPRESSION
# ═════════════════════════════════════════════════════════════

class Expression(ABC):
    @abstractmethod
    def interpret(self, ctx: Context) -> float: ...

    @abstractmethod
    def __str__(self) -> str: ...


# SECTION:: Terminal Expressions
# ═════════════════════════════════════════════════════════════
#  TERMINAL: NumberExpression
# ═════════════════════════════════════════════════════════════

class NumberExpression(Expression):
    def __init__(self, value: float) -> None:
        self._value = value

    def interpret(self, _ctx: Context) -> float:
        return self._value

    def __str__(self) -> str:
        return str(int(self._value) if self._value == int(self._value) else self._value)


# ═════════════════════════════════════════════════════════════
#  TERMINAL: VariableExpression
# ═════════════════════════════════════════════════════════════

class VariableExpression(Expression):
    def __init__(self, name: str) -> None:
        self._name = name

    def interpret(self, ctx: Context) -> float:
        return ctx.get(self._name)

    def __str__(self) -> str:
        return self._name


# SECTION:: Binary Nonterminal Expressions
# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: AddExpression          _exp rule
# ═════════════════════════════════════════════════════════════

class AddExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        return self._left.interpret(ctx) + self._right.interpret(ctx)

    def __str__(self) -> str:
        return f"({self._left} + {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: SubtractExpression     _exp rule
# ═════════════════════════════════════════════════════════════

class SubtractExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        return self._left.interpret(ctx) - self._right.interpret(ctx)

    def __str__(self) -> str:
        return f"({self._left} - {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: MultiplyExpression     _term rule
# ═════════════════════════════════════════════════════════════

class MultiplyExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        return self._left.interpret(ctx) * self._right.interpret(ctx)

    def __str__(self) -> str:
        return f"({self._left} * {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: DivideExpression       _term rule
# ═════════════════════════════════════════════════════════════

class DivideExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        d = self._right.interpret(ctx)
        if d == 0:
            raise ZeroDivisionError("Division by zero")
        return self._left.interpret(ctx) / d

    def __str__(self) -> str:
        return f"({self._left} / {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: FloorDivideExpression  _term rule  (//)
# ═════════════════════════════════════════════════════════════

class FloorDivideExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        d = self._right.interpret(ctx)
        if d == 0:
            raise ZeroDivisionError("Division by zero")
        return math.floor(self._left.interpret(ctx) / d)

    def __str__(self) -> str:
        return f"({self._left} // {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: ModuloExpression       _term rule  (%)
# ═════════════════════════════════════════════════════════════

class ModuloExpression(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left, self._right = left, right

    def interpret(self, ctx: Context) -> float:
        d = self._right.interpret(ctx)
        if d == 0:
            raise ZeroDivisionError("Division by zero")
        return self._left.interpret(ctx) % d

    def __str__(self) -> str:
        return f"({self._left} % {self._right})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
# ═════════════════════════════════════════════════════════════

class PowerExpression(Expression):
    def __init__(self, base: Expression, exponent: Expression) -> None:
        self._base, self._exponent = base, exponent

    def interpret(self, ctx: Context) -> float:
        return self._base.interpret(ctx) ** self._exponent.interpret(ctx)

    def __str__(self) -> str:
        return f"({self._base} ** {self._exponent})"


# SECTION:: Unary Nonterminal Expressions
# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: NegateExpression       _function rule  (neg)
# ═════════════════════════════════════════════════════════════

class NegateExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        return -self._child.interpret(ctx)

    def __str__(self) -> str:
        return f"(-{self._child})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: AbsExpression          _function rule  (abs)
# ═════════════════════════════════════════════════════════════

class AbsExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        return abs(self._child.interpret(ctx))

    def __str__(self) -> str:
        return f"abs({self._child})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
# ═════════════════════════════════════════════════════════════

class SqrtExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        v = self._child.interpret(ctx)
        if v < 0:
            raise ValueError("Square root of negative number")
        return math.sqrt(v)

    def __str__(self) -> str:
        return f"sqrt({self._child})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: InverseExpression      _function rule  (1/x)
# ═════════════════════════════════════════════════════════════

class InverseExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        v = self._child.interpret(ctx)
        if v == 0:
            raise ZeroDivisionError("Division by zero")
        return 1 / v

    def __str__(self) -> str:
        return f"(1 / {self._child})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: FactorialExpression    _function rule  (n!)
# ═════════════════════════════════════════════════════════════

class FactorialExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        n = round(self._child.interpret(ctx))
        if n < 0:
            raise ValueError("Factorial of negative number")
        return float(math.factorial(n))

    def __str__(self) -> str:
        return f"({self._child}!)"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
# ═════════════════════════════════════════════════════════════

class PowerOfTenExpression(Expression):
    def __init__(self, exponent: Expression) -> None:
        self._exponent = exponent

    def interpret(self, ctx: Context) -> float:
        return 10 ** self._exponent.interpret(ctx)

    def __str__(self) -> str:
        return f"(10 ** {self._exponent})"


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: LogExpression          _function rule  (log)
# ═════════════════════════════════════════════════════════════

class LogExpression(Expression):
    def __init__(self, child: Expression) -> None:
        self._child = child

    def interpret(self, ctx: Context) -> float:
        v = self._child.interpret(ctx)
        if v <= 0:
            raise ValueError("Logarithm of non-positive number")
        return math.log10(v)

    def __str__(self) -> str:
        return f"log({self._child})"


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "═" * 64

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║       Interpreter: Arithmetic Expression Evaluator           ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    a = VariableExpression("a")
    b = VariableExpression("b")

    # ── Example 1: basic arithmetic ──────────────────────────────
    expr1 = MultiplyExpression(
        AddExpression(NumberExpression(3), NumberExpression(4)),
        NumberExpression(2),
    )
    print(f"\n{SEP}")
    print("  Example 1: Basic arithmetic  (3 + 4) * 2")
    print(SEP)
    print(f"  Expression : {expr1}")
    print(f"  Result     : {int(expr1.interpret(Context()))}")

    # ── Example 2: floor divide and modulo ───────────────────────
    ctx2     = Context().set("a", 17).set("b", 5)
    floor_div = FloorDivideExpression(a, b)
    modulo    = ModuloExpression(a, b)
    print(f"\n{SEP}")
    print("  Example 2: Floor divide and modulo   a=17, b=5")
    print(SEP)
    print(f"  {floor_div}  →  {int(floor_div.interpret(ctx2))}   (17 // 5)")
    print(f"  {modulo}    →  {int(modulo.interpret(ctx2))}    (17 % 5)")

    # ── Example 3: power ─────────────────────────────────────────
    ctx3  = Context().set("a", 2).set("b", 10)
    power = PowerExpression(a, b)
    print(f"\n{SEP}")
    print("  Example 3: Power   a=2, b=10")
    print(SEP)
    print(f"  {power}  →  {int(power.interpret(ctx3))}")

    # ── Example 4: unary functions ───────────────────────────────
    ctx4 = Context().set("a", 100).set("b", -9)
    print(f"\n{SEP}")
    print("  Example 4: Unary functions   a=100, b=-9")
    print(SEP)
    print(f"  sqrt(a)       →  {int(SqrtExpression(a).interpret(ctx4))}")
    print(f"  abs(b)        →  {int(AbsExpression(b).interpret(ctx4))}")
    print(f"  neg(a)        →  {int(NegateExpression(a).interpret(ctx4))}")
    print(f"  1/x (a)       →  {InverseExpression(a).interpret(ctx4)}")
    print(f"  log(a)        →  {int(LogExpression(a).interpret(ctx4))}")
    print(f"  10^b (abs(b)) →  {int(PowerOfTenExpression(AbsExpression(b)).interpret(ctx4))}")

    # ── Example 5: factorial ─────────────────────────────────────
    ctx5 = Context().set("n", 6)
    n    = VariableExpression("n")
    fact = FactorialExpression(n)
    print(f"\n{SEP}")
    print("  Example 5: Factorial   n=6")
    print(SEP)
    print(f"  {fact}  →  {int(fact.interpret(ctx5))}")

    # ── Example 6: composition ───────────────────────────────────
    ctx6   = Context().set("a", 7).set("b", 23)
    nested = SqrtExpression(AbsExpression(SubtractExpression(a, b)))
    print(f"\n{SEP}")
    print("  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23")
    print(SEP)
    print(f"  {nested}  →  {int(nested.interpret(ctx6))}")

    print(f"\n{SEP}")
    print("  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg")
    print("  Each operator and function is its own class.")
    print("  Trees compose freely: any node can nest inside any other.")
    print(SEP)

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Done                                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
