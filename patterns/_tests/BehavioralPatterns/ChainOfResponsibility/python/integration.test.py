# ============================================================
#  Integration Tests - Chain of Responsibility: Grammar Token Validator
#
#  What we test here:
#    · Full token sequences accepted or rejected end-to-end
#    · Invalid sequences fail at the correct chain link
#    · Every token type correctly classified in a realistic equation
#    · Chain extension doesn't break existing behaviour
#    · Paren depth and decimal flags interact correctly
#
#  Pipeline tests (TestPipeline):
#    · CoR chain + TreeBuilder + Interpreter evaluate end-to-end
#    · Operator precedence is respected through tree shape
#    · Grouping with parentheses overrides precedence
#    · Unary prefix functions nest correctly
#    · Invalid token sequences raise ValueError before evaluation
#
#  Run: pytest integration.test.py -v --import-mode=importlib
# ============================================================

import importlib.util, os, pytest

# Load CoR module by explicit path to avoid name collision with Interpreter's python.py
_cor_file = os.path.normpath(os.path.join(os.path.dirname(__file__),
    '../../../../BehavioralPatterns/ChainOfResponsibility/python/python.py'))
_spec = importlib.util.spec_from_file_location("cor", _cor_file)
_cor  = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cor)

ParseContext    = _cor.ParseContext
SolveHandler    = _cor.SolveHandler
ExpHandler      = _cor.ExpHandler
TermHandler     = _cor.TermHandler
PowerHandler    = _cor.PowerHandler
FactorHandler   = _cor.FactorHandler
FunctionHandler = _cor.FunctionHandler
DigitHandler    = _cor.DigitHandler
DEFAULT_FUNCTIONS = _cor.DEFAULT_FUNCTIONS
build_chain     = _cor.build_chain
TreeBuilder     = _cor.TreeBuilder
parse_and_build = _cor.parse_and_build

# Load Interpreter module by explicit path
_interp_file = os.path.normpath(os.path.join(os.path.dirname(__file__),
    '../../../../BehavioralPatterns/Interpreter/python/python.py'))
_spec2  = importlib.util.spec_from_file_location("interp", _interp_file)
_interp = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(_interp)


# ─────────────────────────────────────────────────────────────
#  Helper: feed a token sequence through the chain, updating
#  context automatically after each accepted token.
# ─────────────────────────────────────────────────────────────

def feed(chain, tokens: list[str]) -> list[tuple[str, str] | None]:
    results = []
    ctx = ParseContext()

    for tok in tokens:
        result = chain.handle(tok, ctx)
        results.append(result)

        if result is None:
            break

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

    return results


# ── Valid sequences ───────────────────────────────────────────
class TestValidSequences:

    def test_simple_addition(self):
        results = feed(build_chain(), ["5", "+", "3", "="])
        assert [r[0] for r in results] == ["Digit", "Exp", "Digit", "Solve"]

    def test_order_of_operations(self):
        results = feed(build_chain(), ["2", "+", "3", "*", "4", "="])
        assert [r[0] for r in results] == ["Digit", "Exp", "Digit", "Term", "Digit", "Solve"]

    def test_parenthesised_expression(self):
        results = feed(build_chain(), ["(", "6", "-", "2", ")", "*", "3", "="])
        assert [r[0] for r in results] == [
            "Factor", "Digit", "Exp", "Digit", "Factor", "Term", "Digit", "Solve"
        ]

    def test_power_expression(self):
        results = feed(build_chain(), ["2", "**", "8", "="])
        assert [r[0] for r in results] == ["Digit", "Power", "Digit", "Solve"]

    def test_function_wrapping_digit(self):
        results = feed(build_chain(), ["abs", "9", "="])
        assert [r[0] for r in results] == ["Function", "Digit", "Solve"]

    def test_nested_functions(self):
        results = feed(build_chain(), ["neg", "abs", "7", "="])
        assert [r[0] for r in results] == ["Function", "Function", "Digit", "Solve"]

    def test_decimal_number(self):
        results = feed(build_chain(), ["3", ".", "1", "4", "="])
        assert [r[0] for r in results] == ["Digit", "SoloDec", "Digit", "Digit", "Solve"]

    def test_floor_divide(self):
        results = feed(build_chain(), ["1", "7", "//", "5", "="])
        assert [r[0] for r in results] == ["Digit", "Digit", "Term", "Digit", "Solve"]

    def test_modulo(self):
        results = feed(build_chain(), ["1", "7", "%", "5", "="])
        assert [r[0] for r in results] == ["Digit", "Digit", "Term", "Digit", "Solve"]

    def test_complex_equation(self):
        # 234 + (12 / 3)
        results = feed(build_chain(),
                       ["2", "3", "4", "+", "(", "1", "2", "/", "3", ")", "="])
        assert [r[0] for r in results] == [
            "Digit", "Digit", "Digit",
            "Exp",
            "Factor",
            "Digit", "Digit",
            "Term",
            "Digit",
            "Factor",
            "Solve",
        ]

    def test_solve_only(self):
        assert build_chain().handle("=", ParseContext()) == ("Solve", "=")


# ── Invalid sequences ─────────────────────────────────────────
class TestInvalidSequences:

    def test_leading_plus_rejected(self):
        assert feed(build_chain(), ["+", "5"])[0] is None

    def test_double_operator_rejected(self):
        results = feed(build_chain(), ["1", "2", "+", "+"])
        assert results[3] is None
        assert results[0] is not None

    def test_operator_after_open_paren_rejected(self):
        assert feed(build_chain(), ["(", "+"])[1] is None

    def test_unmatched_close_paren_rejected(self):
        assert build_chain().handle(")", ParseContext(paren_depth=0)) is None

    def test_second_decimal_rejected(self):
        assert feed(build_chain(), ["1", ".", "5", "."])[3] is None

    def test_digit_after_close_paren_rejected(self):
        assert feed(build_chain(), ["(", "3", ")", "5"])[3] is None

    def test_unknown_token_rejected(self):
        assert build_chain().handle("xyz", ParseContext(trailing="5")) is None

    def test_leading_multiply_rejected(self):
        assert build_chain().handle("*", ParseContext()) is None


# ── Processed token values ────────────────────────────────────
class TestProcessedTokenValues:

    def test_exp_adds_spaces(self):
        _, processed = build_chain().handle("+", ParseContext(trailing="5"))
        assert processed == " + "

    def test_term_adds_spaces(self):
        _, processed = build_chain().handle("*", ParseContext(trailing="3"))
        assert processed == " * "

    def test_power_adds_spaces(self):
        _, processed = build_chain().handle("**", ParseContext(trailing="2"))
        assert processed == " ** "

    def test_factor_open_no_spaces(self):
        _, processed = build_chain().handle("(", ParseContext())
        assert processed == "("

    def test_solo_decimal_prefixes_zero(self):
        _, processed = build_chain().handle(".", ParseContext())
        assert processed == "0."

    def test_digit_returned_as_is(self):
        _, processed = build_chain().handle("7", ParseContext())
        assert processed == "7"


# ── Chain extension ───────────────────────────────────────────
class TestChainExtension:

    def test_new_function_accepted_in_extended_chain(self):
        extended = build_chain(functions=DEFAULT_FUNCTIONS | {"cbrt"})
        assert extended.handle("cbrt", ParseContext(trailing="8")) == ("Function", "cbrt")

    def test_new_function_rejected_in_default_chain(self):
        assert build_chain().handle("cbrt", ParseContext(trailing="8")) is None

    def test_existing_functions_still_work_after_extension(self):
        extended = build_chain(functions=DEFAULT_FUNCTIONS | {"cbrt"})
        for fn in DEFAULT_FUNCTIONS:
            assert extended.handle(fn, ParseContext(trailing="5")) == ("Function", fn)


# ── Pipeline: CoR → TreeBuilder → Interpreter ────────────────
class TestPipeline:
    """
    Full end-to-end: token list → parse_and_build() → .interpret()
    Validates that CoR validation, tree construction, and Interpreter
    evaluation all work together correctly.
    """

    ctx = _interp.Context()   # empty context (no variables needed)

    def _eval(self, tokens):
        return parse_and_build(tokens).interpret(self.ctx)

    def test_simple_addition(self):
        assert self._eval(["3", "+", "4", "="]) == 7

    def test_simple_subtraction(self):
        assert self._eval(["9", "-", "4", "="]) == 5

    def test_simple_multiplication(self):
        assert self._eval(["6", "*", "7", "="]) == 42

    def test_simple_division(self):
        assert self._eval(["8", "/", "4", "="]) == 2

    def test_operator_precedence_mul_over_add(self):
        # 2 + 3 * 4  →  2 + 12  =  14  (not (2+3)*4=20)
        assert self._eval(["2", "+", "3", "*", "4", "="]) == 14

    def test_parentheses_override_precedence(self):
        # (2 + 3) * 4  =  20
        assert self._eval(["(", "2", "+", "3", ")", "*", "4", "="]) == 20

    def test_power(self):
        assert self._eval(["2", "**", "8", "="]) == 256

    def test_floor_divide(self):
        assert self._eval(["1", "7", "//", "5", "="]) == 3

    def test_modulo(self):
        assert self._eval(["1", "7", "%", "5", "="]) == 2

    def test_unary_sqrt(self):
        assert self._eval(["sqrt", "9", "="]) == 3.0

    def test_unary_abs_of_negative(self):
        assert self._eval(["abs", "neg", "5", "="]) == 5.0

    def test_nested_unary_functions(self):
        # abs(neg(abs(neg(7)))) = 7
        assert self._eval(["abs", "neg", "abs", "neg", "7", "="]) == 7.0

    def test_function_over_group(self):
        # sqrt((3**2 + 4**2))  →  sqrt(9 + 16) = 5  — Pythagorean triple
        tokens = ["sqrt", "(", "3", "**", "2", "+", "4", "**", "2", ")", "="]
        assert self._eval(tokens) == 5.0

    def test_multidigit_number(self):
        # 234 + 0  =  234
        assert self._eval(["2", "3", "4", "+", "0", "="]) == 234

    def test_decimal_number(self):
        result = self._eval(["3", ".", "1", "4", "+", "0", "="])
        assert abs(result - 3.14) < 1e-9

    def test_invalid_token_raises(self):
        with pytest.raises(ValueError, match="Invalid token"):
            parse_and_build(["+", "5"])

    def test_tree_str_reflects_structure(self):
        # (2 + 3) * 4  →  tree str should show multiplication at root
        tree = parse_and_build(["(", "2", "+", "3", ")", "*", "4", "="])
        s = str(tree)
        assert "*" in s
        assert "+" in s
