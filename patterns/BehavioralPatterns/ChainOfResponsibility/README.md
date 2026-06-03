# Chain of Responsibility Pattern — Grammar Token Validator

## Intent
Decouple the sender of a request from its receivers by giving more than one handler a chance to handle the request. Handlers are chained; each either handles the request or passes it to the next handler. A request that reaches the end of the chain unclaimed is rejected.

## Origin
This pattern models the **token validation logic** of the `EBNF_parser` from a real scientific calculator project:
> **Scientific Calculator** — [github.com/Bakaler/Scientific_Calculator](https://github.com/Bakaler/Scientific_Calculator/tree/main)

In that project, `EBNF_parser._exp()` calls `_term()`, which calls `_factor()`, which calls `_power()`, and so on — each method either handles the input token or passes it down. This is Chain of Responsibility: each grammar rule is a handler link, and invalid tokens (like a leading `+` or a second decimal) fall off the end as `None`.

See the companion pattern for how the same grammar's *evaluation* side is modelled:
> **Interpreter** — [`../Interpreter/`](../Interpreter/README.md)

The two patterns connect through a `TreeBuilder` (in `python.py`): CoR validates and classifies each token; Interpreter evaluates the resulting expression tree. Together they form a complete parse-and-evaluate pipeline.

---

## Participants

| Role | Class(es) |
|---|---|
| `Handler` (ABC) | `Handler` |
| Concrete Handlers | `SolveHandler`, `ExpHandler`, `TermHandler`, `PowerHandler`, `FactorHandler`, `FunctionHandler`, `DigitHandler` |
| `Context` | `ParseContext` |
| Client / factory | `build_chain()` |
| Pipeline glue | `TreeBuilder`, `parse_and_build()` |

## Chain Order

The chain mirrors grammar precedence from lowest to highest:

```
SolveHandler    =           evaluation trigger
  → ExpHandler      + -     lowest precedence binary ops
  → TermHandler     * / // %
  → PowerHandler    **
  → FactorHandler   ( )     grouping
  → FunctionHandler abs sqrt neg …
  → DigitHandler    0-9 .   terminals  ← end of chain
```

A token not claimed by any handler returns `None` (rejected).

## Rejection Examples

```
token   context          result    reason
─────   ───────────────  ────────  ──────────────────────────────────
'+'     nothing before   None      no left-hand operand (ExpHandler)
'+'     trailing='+'     None      operator follows operator
'+'     trailing='('     None      operator after open paren
')'     paren_depth=0    None      no open paren to close (FactorHandler)
'.'     has_decimal=True None      second decimal in number (DigitHandler)
'5'     trailing=')'     None      digit directly after ')' (DigitHandler)
'xyz'   any              None      not recognised by any handler
```

## Pipeline

`TreeBuilder` consumes CoR results and constructs an Interpreter expression tree using the shunting-yard algorithm. `parse_and_build()` wraps the full flow:

```python
tree   = parse_and_build(["2", "+", "3", "*", "4", "="])
result = tree.interpret(Context())   # → 14  (precedence respected)

tree   = parse_and_build(["(", "2", "+", "3", ")", "*", "4", "="])
result = tree.interpret(Context())   # → 20  (parens override)
```

**CoR owns validation. Interpreter owns evaluation. `TreeBuilder` is the only piece that knows about both.**

## Consequences

| | |
|---|---|
| ✓ Decoupled validation | Each handler knows only its own tokens |
| ✓ Ordered chain | Chain position encodes grammar precedence |
| ✓ Easy to extend | Insert a new handler anywhere without touching others |
| ✓ Explicit rejection | `None` makes invalid input visible and testable |

---

## Files

```
python/python.py              Implementation (CoR + TreeBuilder pipeline)
../../../_tests/.../python/
  unit.test.py                One test class per handler, isolated
  integration.test.py         Valid/invalid sequences + full pipeline tests
  unit.output                 Captured test output  (43 passed)
  integration.output          Captured test output  (45 passed)
output                        Captured program output
```

## Run

```bash
# Program (also runs the full CoR + Interpreter pipeline)
python python/python.py

# Tests
pytest _tests/BehavioralPatterns/ChainOfResponsibility/python/unit.test.py \
       _tests/BehavioralPatterns/ChainOfResponsibility/python/integration.test.py \
       -v --import-mode=importlib
```

---

## Related

- **Interpreter** (companion) → [`../Interpreter/`](../Interpreter/README.md)
  Models the *evaluation* side of the same grammar — each operator and function is an `Expression` class whose `.interpret(ctx)` walks the tree.
- **Scientific Calculator** (inspiration) → [github.com/Bakaler/Scientific_Calculator](https://github.com/Bakaler/Scientific_Calculator/tree/main)
  The original project whose `EBNF_parser` supplied the grammar, token types, and rejection logic reproduced here as a handler chain.
