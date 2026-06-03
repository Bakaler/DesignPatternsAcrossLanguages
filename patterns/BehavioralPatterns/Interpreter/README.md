# Interpreter Pattern — Arithmetic Expression Evaluator

## Intent
Define a grammar for a language and provide an interpreter that uses the grammar to evaluate sentences in that language. Each grammar rule becomes a class; sentences are represented as composite trees of those classes.

## Origin
The grammar and operator set modelled here were drawn directly from the **EBNF parser** of a real scientific calculator project:
> **Scientific Calculator** — [github.com/Bakaler/Scientific_Calculator](https://github.com/Bakaler/Scientific_Calculator/tree/main)

That project's `EBNF_parser` validates user button-presses against a grammar (`_exp → _term → _factor → _power → _function → _digit`) and builds an equation string for `eval()`. This implementation takes the same grammar but represents it the GoF way: each rule is a class, and trees are first-class objects you evaluate with `.interpret(ctx)`.

See the companion pattern for how the EBNF parser's *validation* side is modelled:
> **Chain of Responsibility** — [`../ChainOfResponsibility/`](../ChainOfResponsibility/README.md)

The two patterns connect through a `TreeBuilder`: CoR validates and classifies each token; Interpreter evaluates the resulting tree. Together they form a complete parse-and-evaluate pipeline.

---

## Participants

| Role | Class(es) |
|---|---|
| `AbstractExpression` | `Expression` (ABC) |
| `TerminalExpression` | `NumberExpression`, `VariableExpression` |
| `NonterminalExpression` | `AddExpression`, `SubtractExpression`, `MultiplyExpression`, `DivideExpression`, `FloorDivideExpression`, `ModuloExpression`, `PowerExpression`, `NegateExpression`, `AbsExpression`, `SqrtExpression`, `InverseExpression`, `FactorialExpression`, `PowerOfTenExpression`, `LogExpression` |
| `Context` | `Context` |
| `Client` | `__main__` block |

## Grammar → Class Mapping

```
_exp     : + -      →  AddExpression, SubtractExpression
_term    : * / // % →  MultiplyExpression, DivideExpression,
                       FloorDivideExpression, ModuloExpression
_power   : **       →  PowerExpression
_function: unary    →  AbsExpression, SqrtExpression, NegateExpression,
                       InverseExpression, FactorialExpression,
                       PowerOfTenExpression, LogExpression
_digit   : terminal →  NumberExpression, VariableExpression
```

## Consequences

| | |
|---|---|
| ✓ Grammar as classes | Each rule is an independent, testable class |
| ✓ Easy to extend | Add a new operation by adding one class |
| ✓ Context reuse | One tree evaluates against many contexts |
| ✗ Class explosion | Large grammars produce many small classes |

---

## Files

```
python/python.py              Implementation
../../../_tests/.../python/
  unit.test.py                One test class per Expression class
  integration.test.py         Multi-level trees, context reuse, real equations
  unit.output                 Captured test output  (48 passed)
  integration.output          Captured test output  (19 passed)
output                        Captured program output
```

## Run

```bash
# Program
python python/python.py

# Tests
pytest _tests/BehavioralPatterns/Interpreter/python/unit.test.py \
       _tests/BehavioralPatterns/Interpreter/python/integration.test.py \
       -v --import-mode=importlib
```

---

## Related

- **Chain of Responsibility** (companion) → [`../ChainOfResponsibility/`](../ChainOfResponsibility/README.md)
  Models the *parsing* side of the same grammar — validates token streams and rejects invalid input before the Interpreter evaluates it.
- **Scientific Calculator** (inspiration) → [github.com/Bakaler/Scientific_Calculator](https://github.com/Bakaler/Scientific_Calculator/tree/main)
  The original project whose `EBNF_parser` and `g001_Functions` supplied the grammar and operator set used here.
