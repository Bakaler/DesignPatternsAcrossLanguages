# ============================================================
#  Chain of Responsibility: Grammar Token Validator
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Handler (ABC)        Handler
#  ConcreteHandlers     SolveHandler, ExpHandler, TermHandler,
#                       PowerHandler, FactorHandler,
#                       FunctionHandler, DigitHandler
#  Context              ParseContext
#  Client               build_chain() + entry point
#
#  Grammar modelled (mirrors EBNF_parser rule hierarchy)
#  ────────────────────────────────────────────────────────
#  SolveHandler   =          evaluation trigger
#  ExpHandler     + -        lowest precedence binary ops
#  TermHandler    * / // %   medium precedence binary ops
#  PowerHandler   **         high precedence binary op
#  FactorHandler  ( )        grouping
#  FunctionHandler abs sqrt … named unary functions
#  DigitHandler   0-9  .     terminals
#
#  Each handler either CLAIMS the token (returns a result) or
#  PASSES it down the chain.  A token that reaches the end
#  without being claimed is REJECTED (returns None).
#
#  Pipeline (bottom of file)
#  ────────────────────────────────────────────────────────
#  TreeBuilder consumes the CoR results and constructs an
#  Interpreter expression tree (shunting-yard algorithm).
#  Calling .build() returns the root Expression node, which
#  you then evaluate with .interpret(ctx).
#
#  Full pipeline:
#      tokens → CoR chain → TreeBuilder → Expression tree
#                                       → .interpret(ctx)
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Decoupled validation  each rule knows only its own tokens
#  ✓ Ordered chain         grammar precedence = chain position
#  ✓ Easy to extend        add a handler, insert it anywhere
#  ✓ Explicit rejection    None propagates back to the caller
#  ✓ Composable with Interpreter  CoR validates & classifies;
#                                 Interpreter evaluates
# ============================================================

from __future__ import annotations
from abc import ABC, abstractmethod
import re, sys, os, importlib.util

# ── Import Interpreter expression classes ────────────────────
_interp_file = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'Interpreter', 'python', 'python.py'))
_spec   = importlib.util.spec_from_file_location("interp", _interp_file)
_interp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_interp)


# ─────────────────────────────────────────────────────────────
#  Constants
# ─────────────────────────────────────────────────────────────

OPERANDS          = {"+", "-", "*", "**", "/", "//", "%"}
DEFAULT_FUNCTIONS = {"abs", "sqrt", "neg", "square", "inverse", "factorial", "log"}


# SECTION:: ParseContext
# ═════════════════════════════════════════════════════════════
#  CONTEXT
# ═════════════════════════════════════════════════════════════

class ParseContext:
    """
    Carries the state each handler needs to make validation decisions.

    trailing    : the last accepted token string, or None at the start
    paren_depth : number of unmatched '(' currently open
    has_decimal : True if the current number segment already has a '.'
    """

    def __init__(
        self,
        trailing: str | None = None,
        paren_depth: int = 0,
        has_decimal: bool = False,
    ) -> None:
        self.trailing    = trailing
        self.paren_depth = paren_depth
        self.has_decimal = has_decimal


# SECTION:: Abstract Handler
# ═════════════════════════════════════════════════════════════
#  ABSTRACT HANDLER
# ═════════════════════════════════════════════════════════════

class Handler(ABC):
    """
    Every grammar-rule handler inherits from this class.

    •  set_next(handler)  –  wire the next link in the chain;
                             returns the handler so calls can be chained.
    •  handle(token, ctx) –  subclasses implement this.
                             Return (token_type, processed_token) to CLAIM,
                             or call _pass() to forward, which ultimately
                             returns None if no handler claims the token.
    """

    def __init__(self) -> None:
        self._next: Handler | None = None

    def set_next(self, handler: Handler) -> Handler:
        self._next = handler
        return handler

    @abstractmethod
    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        ...

    def _pass(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        """Forward to next handler, or return None at end of chain."""
        if self._next:
            return self._next.handle(token, ctx)
        return None

    def __str__(self) -> str:
        return self.__class__.__name__


# SECTION:: Concrete Handlers
# ═════════════════════════════════════════════════════════════
#  SOLVE HANDLER  —  '='
# ═════════════════════════════════════════════════════════════

class SolveHandler(Handler):
    """Claims '=' unconditionally — it is always a valid evaluation trigger."""

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token == "=":
            return ("Solve", token)
        return self._pass(token, ctx)


# ═════════════════════════════════════════════════════════════
#  EXP HANDLER  —  +  -
# ═════════════════════════════════════════════════════════════

class ExpHandler(Handler):
    """
    _exp rule.  Claims '+' and '-'.

    Valid   : trailing is a digit, ')', or a function name
              (i.e. there is a left-hand operand)
    Invalid : nothing entered yet, or trailing is '(' or an operator
              — '1 2 + +' is rejected here on the second '+'
    """

    _TOKENS = {"+", "-"}

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token not in self._TOKENS:
            return self._pass(token, ctx)

        if ctx.trailing is None:
            return None                             # nothing on the left
        if ctx.trailing == "(" or ctx.trailing in OPERANDS:
            return None                             # no left-hand value

        return ("Exp", f" {token} ")


# ═════════════════════════════════════════════════════════════
#  TERM HANDLER  —  *  /  //  %
# ═════════════════════════════════════════════════════════════

class TermHandler(Handler):
    """
    _term rule.  Claims '*', '/', '//', '%'.
    Same left-operand requirement as ExpHandler.
    Note: '**' is a distinct token and passes through here unclaimed.
    """

    _TOKENS = {"*", "/", "//", "%"}

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token not in self._TOKENS:
            return self._pass(token, ctx)

        if ctx.trailing is None:
            return None
        if ctx.trailing == "(" or ctx.trailing in OPERANDS:
            return None

        return ("Term", f" {token} ")


# ═════════════════════════════════════════════════════════════
#  POWER HANDLER  —  **
# ═════════════════════════════════════════════════════════════

class PowerHandler(Handler):
    """
    _power rule.  Claims '**'.
    Passes '*' through so TermHandler catches single-star multiplication.
    """

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token != "**":
            return self._pass(token, ctx)

        if ctx.trailing is None:
            return None
        if ctx.trailing == "(" or ctx.trailing in OPERANDS:
            return None

        return ("Power", f" {token} ")


# ═════════════════════════════════════════════════════════════
#  FACTOR HANDLER  —  (  )
# ═════════════════════════════════════════════════════════════

class FactorHandler(Handler):
    """
    _factor rule.  Claims '(' and ')'.

    '(' is always accepted (open a new group).
    ')' requires at least one unmatched '(' to be open (paren_depth > 0).
    """

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token == "(":
            return ("Factor", token)

        if token == ")":
            if ctx.paren_depth <= 0:
                return None             # nothing to close
            return ("Factor", token)

        return self._pass(token, ctx)


# ═════════════════════════════════════════════════════════════
#  FUNCTION HANDLER  —  abs  sqrt  neg  …
# ═════════════════════════════════════════════════════════════

class FunctionHandler(Handler):
    """
    _function rule.  Claims any token in the supplied function set.
    The set is injected at construction so the handler stays open for
    extension without modification.
    """

    def __init__(self, functions: set[str]) -> None:
        super().__init__()
        self._functions = functions

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if token in self._functions:
            return ("Function", token)
        return self._pass(token, ctx)


# ═════════════════════════════════════════════════════════════
#  DIGIT HANDLER  —  0-9  .
# ═════════════════════════════════════════════════════════════

class DigitHandler(Handler):
    """
    _digit rule.  Terminal handler — end of the chain.

    Single digits 0-9 are always accepted unless trailing is ')'.
    '.' is accepted when the current number has no decimal yet;
         a bare '.' is prefixed with '0' → returned as ("SoloDec", "0.").
    Everything else falls off the chain as None (rejected).
    """

    def handle(self, token: str, ctx: ParseContext) -> tuple[str, str] | None:
        if ctx.trailing == ")":
            return None                 # digit after ')' needs explicit '*' first

        if re.fullmatch(r"\d", token):
            return ("Digit", token)

        if token == ".":
            if ctx.has_decimal:
                return None             # second decimal in same number
            return ("SoloDec", "0.")

        return None                     # unrecognised — chain exhausted


# SECTION:: Chain Factory
# ═════════════════════════════════════════════════════════════
#  CHAIN FACTORY
# ═════════════════════════════════════════════════════════════

def build_chain(functions: set[str] | None = None) -> Handler:
    """
    Assemble the validation chain and return its head.

    Chain order mirrors grammar precedence (lowest → highest):

        SolveHandler
          → ExpHandler        (+ -)
          → TermHandler       (* / // %)
          → PowerHandler      (**)
          → FactorHandler     ( )
          → FunctionHandler   (abs sqrt …)
          → DigitHandler      (0-9 .)
    """
    if functions is None:
        functions = DEFAULT_FUNCTIONS

    head  = SolveHandler()
    exp   = ExpHandler()
    term  = TermHandler()
    power = PowerHandler()
    fact  = FactorHandler()
    func  = FunctionHandler(functions)
    digit = DigitHandler()

    head.set_next(exp) \
        .set_next(term) \
        .set_next(power) \
        .set_next(fact) \
        .set_next(func) \
        .set_next(digit)

    return head


# SECTION:: TreeBuilder
# ═════════════════════════════════════════════════════════════
#  TREE BUILDER  —  CoR + Interpreter pipeline
# ═════════════════════════════════════════════════════════════

# Precedence table for binary operators
_PRECEDENCE: dict[str, int] = {
    "+": 1, "-": 1,
    "*": 2, "/": 2, "//": 2, "%": 2,
    "**": 3,
}

# Map token → binary Expression constructor
_BINARY: dict[str, type] = {
    "+":  _interp.AddExpression,
    "-":  _interp.SubtractExpression,
    "*":  _interp.MultiplyExpression,
    "/":  _interp.DivideExpression,
    "//": _interp.FloorDivideExpression,
    "%":  _interp.ModuloExpression,
    "**": _interp.PowerExpression,
}

# Map function name → unary Expression constructor
# "square" has no dedicated class; model it as x ** 2
def _square(x: _interp.Expression) -> _interp.Expression:
    return _interp.PowerExpression(x, _interp.NumberExpression(2))

_UNARY: dict[str, object] = {
    "abs":      _interp.AbsExpression,
    "sqrt":     _interp.SqrtExpression,
    "neg":      _interp.NegateExpression,
    "square":   _square,
    "inverse":  _interp.InverseExpression,
    "factorial":_interp.FactorialExpression,
    "log":      _interp.LogExpression,
}


class TreeBuilder:
    """
    Consumes (token_type, processed_token) pairs — exactly what the
    CoR chain returns — and builds an Interpreter expression tree using
    the shunting-yard algorithm.

    Usage:
        builder = TreeBuilder()
        chain   = build_chain()
        ctx     = ParseContext()

        for token in tokens:
            result = chain.handle(token, ctx)   # CoR validates
            if result is None:
                raise ValueError(f"Invalid token: {token!r}")
            builder.push(*result)               # Interpreter builds
            ctx = _update_ctx(ctx, token, result)

        tree = builder.build()
        print(tree.interpret(_interp.Context()))
    """

    def __init__(self) -> None:
        self._output:  list[_interp.Expression] = []   # completed nodes
        self._ops:     list[str]                 = []   # operator / function stack
        self._pending: str                       = ""   # digit accumulation buffer

    # ── public ───────────────────────────────────────────────

    def push(self, token_type: str, token: str) -> None:
        """Feed one classified token into the builder."""
        stripped = token.strip()

        if token_type == "Digit":
            self._pending += stripped

        elif token_type == "SoloDec":
            # "." after existing digits → extend; solo → start at "0."
            self._pending += "." if self._pending else "0."

        elif token_type in {"Exp", "Term", "Power"}:
            self._flush_pending()
            prec = _PRECEDENCE[stripped]
            # Pop higher-or-equal-precedence binary ops before pushing
            while (self._ops
                   and self._ops[-1] != "("
                   and self._ops[-1] not in _UNARY
                   and _PRECEDENCE.get(self._ops[-1], 0) >= prec):
                self._apply_binary()
            self._ops.append(stripped)

        elif token_type == "Function":
            self._flush_pending()
            self._ops.append(stripped)

        elif token_type == "Factor":
            if stripped == "(":
                self._flush_pending()
                self._ops.append("(")
            else:                               # ")"
                self._flush_pending()
                while self._ops and self._ops[-1] != "(":
                    self._apply_top()
                if self._ops:
                    self._ops.pop()             # discard "("
                # If a function sits just outside the group, apply it now
                if self._ops and self._ops[-1] in _UNARY:
                    self._apply_unary()

        elif token_type == "Solve":
            self._flush_pending()
            while self._ops:
                self._apply_top()

    def build(self) -> _interp.Expression:
        """
        Flush any remaining state and return the root Expression node.
        Call this after all tokens (including '=') have been pushed.
        """
        self._flush_pending()
        while self._ops:
            self._apply_top()
        return self._output[-1] if self._output else _interp.NumberExpression(0)

    # ── private ──────────────────────────────────────────────

    def _flush_pending(self) -> None:
        if self._pending:
            self._output.append(_interp.NumberExpression(float(self._pending)))
            self._pending = ""

    def _apply_top(self) -> None:
        if self._ops[-1] in _UNARY:
            self._apply_unary()
        else:
            self._apply_binary()

    def _apply_binary(self) -> None:
        op    = self._ops.pop()
        right = self._output.pop()
        left  = self._output.pop()
        self._output.append(_BINARY[op](left, right))

    def _apply_unary(self) -> None:
        fn      = self._ops.pop()
        operand = self._output.pop()
        self._output.append(_UNARY[fn](operand))


def parse_and_build(
    tokens: list[str],
    functions: set[str] | None = None,
) -> _interp.Expression:
    """
    Convenience function: feed a token list through the full pipeline
    and return the root Expression node ready for .interpret().

    Raises ValueError on the first invalid token.
    """
    chain   = build_chain(functions)
    builder = TreeBuilder()
    ctx     = ParseContext()

    for tok in tokens:
        result = chain.handle(tok, ctx)
        if result is None:
            raise ValueError(f"Invalid token {tok!r} after {ctx.trailing!r}")
        builder.push(*result)

        token_type, _ = result
        paren_depth = ctx.paren_depth
        has_decimal = ctx.has_decimal

        if tok == "(":
            paren_depth += 1
            has_decimal  = False
        elif tok == ")":
            paren_depth -= 1
        elif token_type in {"Exp", "Term", "Power"}:
            has_decimal = False
        elif tok == ".":
            has_decimal = True

        ctx = ParseContext(trailing=tok, paren_depth=paren_depth,
                           has_decimal=has_decimal)

    return builder.build()


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "═" * 64

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  Chain of Responsibility + Interpreter — Full Pipeline        ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    ctx = _interp.Context()

    # ── Part 1: CoR validation chain alone ──────────────────────
    print(f"\n{SEP}")
    print("  Part 1 — CoR chain: validate and classify tokens")
    print(SEP)

    chain = build_chain()
    demos = [
        (["2", "3", "4", "+", "(", "1", "2", "/", "3", ")", "="], "234 + (12 / 3)"),
        (["+", "5"],                                                 "leading '+'   → rejected"),
        (["1", "2", "+", "+"],                                       "12 + +        → rejected"),
    ]
    for tokens, label in demos:
        print(f"\n  {label}")
        c = ParseContext()
        for tok in tokens:
            r = chain.handle(tok, c)
            print(f"    {tok!r:5} → {r}")
            if r is None:
                break
            tt, _ = r
            pd = c.paren_depth + (1 if tok == "(" else -1 if tok == ")" else 0)
            hd = (c.has_decimal or tok == ".") and tt not in {"Exp", "Term", "Power"}
            c  = ParseContext(trailing=tok, paren_depth=pd, has_decimal=hd)

    # ── Part 2: Full pipeline ─────────────────────────────────────
    print(f"\n{SEP}")
    print("  Part 2 — Full pipeline: tokens → CoR → tree → interpret()")
    print(SEP)

    examples = [
        (["3", "+", "4", "="],                          "3 + 4"),
        (["2", "+", "3", "*", "4", "="],                "2 + 3 * 4  (precedence)"),
        (["(", "2", "+", "3", ")", "*", "4", "="],      "(2 + 3) * 4"),
        (["2", "**", "8", "="],                          "2 ** 8"),
        (["sqrt", "9", "="],                             "sqrt 9"),
        (["abs", "neg", "5", "="],                       "abs(neg(5))"),
        (["sqrt", "(", "3", "**", "2", "+", "4", "**", "2", ")", "="],
                                                         "sqrt(3² + 4²)  — Pythagorean"),
        (["1", "7", "%", "5", "="],                      "17 % 5"),
        (["1", "5", "//", "4", "="],                     "15 // 4"),
    ]

    for tokens, label in examples:
        tree   = parse_and_build(tokens)
        result = tree.interpret(ctx)
        # Clean up floats that are whole numbers
        display = int(result) if isinstance(result, float) and result == int(result) else result
        print(f"  {label:<35}  tree: {str(tree):<40}  = {display}")

    print(f"\n{SEP}")
    print("  CoR owns VALIDATION.  Interpreter owns EVALUATION.")
    print("  TreeBuilder is the only piece that knows about both.")
    print(SEP)

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Done                                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
