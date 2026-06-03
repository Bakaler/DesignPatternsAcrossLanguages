# ============================================================
#  Unit Tests - Chain of Responsibility: Grammar Token Validator
#
#  What we test here:
#    · Each handler claims exactly its own tokens
#    · Each handler passes foreign tokens to the next link
#      (or returns None when it is the last link)
#    · Context validation: trailing, paren_depth, has_decimal
#    · set_next() wiring and __str__ identity
#
#  Run: pytest unit.test.py -v --import-mode=importlib
# ============================================================

import importlib.util, os, pytest

# Load CoR module by explicit path to avoid name collision with Interpreter's python.py
_cor_file = os.path.normpath(os.path.join(os.path.dirname(__file__),
    '../../../../BehavioralPatterns/ChainOfResponsibility/python/python.py'))
_spec = importlib.util.spec_from_file_location("cor", _cor_file)
_cor  = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cor)

ParseContext    = _cor.ParseContext
Handler         = _cor.Handler
SolveHandler    = _cor.SolveHandler
ExpHandler      = _cor.ExpHandler
TermHandler     = _cor.TermHandler
PowerHandler    = _cor.PowerHandler
FactorHandler   = _cor.FactorHandler
FunctionHandler = _cor.FunctionHandler
DigitHandler    = _cor.DigitHandler
OPERANDS        = _cor.OPERANDS
DEFAULT_FUNCTIONS = _cor.DEFAULT_FUNCTIONS


# ─────────────────────────────────────────────────────────────
#  Helper: isolated handler (no next link → pass returns None)
# ─────────────────────────────────────────────────────────────

def isolated(handler: Handler) -> Handler:
    """Return the handler with no successor so _pass() → None."""
    return handler


EMPTY       = ParseContext()
AFTER5      = ParseContext(trailing="5")
AFTER_OPEN  = ParseContext(trailing="(")
AFTER_CLOSE = ParseContext(trailing=")", paren_depth=0)


# ── SolveHandler ──────────────────────────────────────────────
class TestSolveHandler:
    h = isolated(SolveHandler())

    def test_claims_equals(self):
        assert self.h.handle("=", EMPTY) == ("Solve", "=")

    def test_passes_plus(self):
        assert self.h.handle("+", EMPTY) is None

    def test_passes_digit(self):
        assert self.h.handle("5", EMPTY) is None

    def test_str(self):
        assert str(self.h) == "SolveHandler"


# ── ExpHandler ────────────────────────────────────────────────
class TestExpHandler:
    h = isolated(ExpHandler())

    def test_claims_plus_after_digit(self):
        assert self.h.handle("+", AFTER5) == ("Exp", " + ")

    def test_claims_minus_after_digit(self):
        assert self.h.handle("-", AFTER5) == ("Exp", " - ")

    def test_rejects_plus_at_start(self):
        assert self.h.handle("+", EMPTY) is None

    def test_rejects_plus_after_open_paren(self):
        assert self.h.handle("+", AFTER_OPEN) is None

    def test_rejects_plus_after_operator(self):
        for op in OPERANDS:
            ctx = ParseContext(trailing=op)
            assert self.h.handle("+", ctx) is None

    def test_passes_multiply(self):
        assert self.h.handle("*", AFTER5) is None

    def test_passes_digit(self):
        assert self.h.handle("7", AFTER5) is None


# ── TermHandler ───────────────────────────────────────────────
class TestTermHandler:
    h = isolated(TermHandler())

    def test_claims_multiply(self):
        assert self.h.handle("*", AFTER5) == ("Term", " * ")

    def test_claims_divide(self):
        assert self.h.handle("/", AFTER5) == ("Term", " / ")

    def test_claims_floor_divide(self):
        assert self.h.handle("//", AFTER5) == ("Term", " // ")

    def test_claims_modulo(self):
        assert self.h.handle("%", AFTER5) == ("Term", " % ")

    def test_does_not_claim_power(self):
        # '**' must pass through so PowerHandler catches it
        assert self.h.handle("**", AFTER5) is None

    def test_rejects_multiply_at_start(self):
        assert self.h.handle("*", EMPTY) is None

    def test_rejects_multiply_after_open_paren(self):
        assert self.h.handle("*", AFTER_OPEN) is None

    def test_passes_plus(self):
        assert self.h.handle("+", AFTER5) is None


# ── PowerHandler ──────────────────────────────────────────────
class TestPowerHandler:
    h = isolated(PowerHandler())

    def test_claims_power(self):
        assert self.h.handle("**", AFTER5) == ("Power", " ** ")

    def test_rejects_power_at_start(self):
        assert self.h.handle("**", EMPTY) is None

    def test_rejects_power_after_open_paren(self):
        assert self.h.handle("**", AFTER_OPEN) is None

    def test_passes_multiply(self):
        # single '*' must reach TermHandler, not be claimed here
        assert self.h.handle("*", AFTER5) is None

    def test_passes_digit(self):
        assert self.h.handle("3", AFTER5) is None


# ── FactorHandler ─────────────────────────────────────────────
class TestFactorHandler:
    h = isolated(FactorHandler())

    def test_claims_open_paren_always(self):
        assert self.h.handle("(", EMPTY)      == ("Factor", "(")
        assert self.h.handle("(", AFTER5)     == ("Factor", "(")
        assert self.h.handle("(", AFTER_OPEN) == ("Factor", "(")

    def test_claims_close_paren_when_open(self):
        ctx = ParseContext(paren_depth=1)
        assert self.h.handle(")", ctx) == ("Factor", ")")

    def test_claims_close_paren_nested(self):
        ctx = ParseContext(paren_depth=3)
        assert self.h.handle(")", ctx) == ("Factor", ")")

    def test_rejects_close_paren_when_none_open(self):
        ctx = ParseContext(paren_depth=0)
        assert self.h.handle(")", ctx) is None

    def test_passes_digit(self):
        assert self.h.handle("5", AFTER5) is None

    def test_passes_operator(self):
        assert self.h.handle("+", AFTER5) is None


# ── FunctionHandler ───────────────────────────────────────────
class TestFunctionHandler:
    h = isolated(FunctionHandler(DEFAULT_FUNCTIONS))

    def test_claims_each_default_function(self):
        for fn in DEFAULT_FUNCTIONS:
            assert self.h.handle(fn, AFTER5) == ("Function", fn)

    def test_passes_unknown_token(self):
        assert self.h.handle("cbrt", AFTER5) is None

    def test_passes_digit(self):
        assert self.h.handle("3", AFTER5) is None

    def test_custom_function_set(self):
        h = isolated(FunctionHandler({"cbrt", "exp"}))
        assert h.handle("cbrt", AFTER5) == ("Function", "cbrt")
        assert h.handle("abs",  AFTER5) is None


# ── DigitHandler ──────────────────────────────────────────────
class TestDigitHandler:
    h = isolated(DigitHandler())

    def test_claims_each_digit(self):
        for d in "0123456789":
            assert self.h.handle(d, EMPTY) == ("Digit", d)

    def test_rejects_digit_after_close_paren(self):
        assert self.h.handle("5", AFTER_CLOSE) is None

    def test_claims_decimal_no_prior_decimal(self):
        assert self.h.handle(".", EMPTY) == ("SoloDec", "0.")

    def test_rejects_second_decimal(self):
        ctx = ParseContext(trailing="3", has_decimal=True)
        assert self.h.handle(".", ctx) is None

    def test_rejects_operator(self):
        assert self.h.handle("+", EMPTY) is None

    def test_rejects_unknown_string(self):
        assert self.h.handle("xyz", EMPTY) is None


# ── set_next / chain wiring ───────────────────────────────────
class TestChainWiring:
    def test_set_next_returns_handler(self):
        a = SolveHandler()
        b = ExpHandler()
        assert a.set_next(b) is b

    def test_token_reaches_next_handler(self):
        digit = DigitHandler()
        head  = SolveHandler()
        head.set_next(digit)
        assert head.handle("5", EMPTY) == ("Digit", "5")

    def test_token_rejected_when_chain_exhausted(self):
        head = SolveHandler()
        assert head.handle("xyz", EMPTY) is None
