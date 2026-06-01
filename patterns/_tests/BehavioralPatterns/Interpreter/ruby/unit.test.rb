# ============================================================
#  Unit Tests — Interpreter: Arithmetic Expression Evaluator (Ruby)
#
#  Run: ruby unit.test.rb
# ============================================================

require 'minitest/autorun'
require_relative '../../../../BehavioralPatterns/Interpreter/ruby/ruby'


# ── Context ───────────────────────────────────────────────────
class TestContext < Minitest::Test
  def test_stores_and_retrieves_variable
    ctx = Context.new.set("x", 42)
    assert_equal 42, ctx.get("x")
  end

  def test_raises_on_missing_variable
    assert_raises(KeyError) { Context.new.get("missing") }
  end

  def test_overwrites_existing_variable
    ctx = Context.new.set("x", 1).set("x", 99)
    assert_equal 99, ctx.get("x")
  end

  def test_set_returns_self_for_chaining
    ctx = Context.new
    assert_same ctx, ctx.set("a", 1)
  end
end


# ── NumberExpression ──────────────────────────────────────────
class TestNumberExpression < Minitest::Test
  def test_returns_literal_value
    assert_equal 7, NumberExpression.new(7).interpret(Context.new)
  end

  def test_ignores_context
    ctx = Context.new.set("x", 999)
    assert_equal 3, NumberExpression.new(3).interpret(ctx)
  end

  def test_display_renders_integer
    assert_equal "5", NumberExpression.new(5).display
  end
end


# ── VariableExpression ────────────────────────────────────────
class TestVariableExpression < Minitest::Test
  def test_resolves_from_context
    ctx = Context.new.set("a", 10)
    assert_equal 10, VariableExpression.new("a").interpret(ctx)
  end

  def test_raises_when_not_in_context
    assert_raises(KeyError) { VariableExpression.new("z").interpret(Context.new) }
  end

  def test_display_returns_name
    assert_equal "a", VariableExpression.new("a").display
  end
end


# ── AddExpression ─────────────────────────────────────────────
class TestAddExpression < Minitest::Test
  def test_adds_two_numbers
    expr = AddExpression.new(NumberExpression.new(3), NumberExpression.new(4))
    assert_equal 7, expr.interpret(Context.new)
  end

  def test_adds_two_variables
    ctx  = Context.new.set("a", 10).set("b", 5)
    expr = AddExpression.new(VariableExpression.new("a"), VariableExpression.new("b"))
    assert_equal 15, expr.interpret(ctx)
  end

  def test_display_wraps_in_parens
    expr = AddExpression.new(NumberExpression.new(1), NumberExpression.new(2))
    assert_includes expr.display, "+"
    assert expr.display.start_with?("(")
  end
end


# ── SubtractExpression ────────────────────────────────────────
class TestSubtractExpression < Minitest::Test
  def test_subtracts_right_from_left
    expr = SubtractExpression.new(NumberExpression.new(10), NumberExpression.new(3))
    assert_equal 7, expr.interpret(Context.new)
  end

  def test_result_can_be_negative
    expr = SubtractExpression.new(NumberExpression.new(2), NumberExpression.new(5))
    assert_equal(-3, expr.interpret(Context.new))
  end
end


# ── MultiplyExpression ────────────────────────────────────────
class TestMultiplyExpression < Minitest::Test
  def test_multiplies_two_numbers
    expr = MultiplyExpression.new(NumberExpression.new(4), NumberExpression.new(5))
    assert_equal 20, expr.interpret(Context.new)
  end

  def test_multiplies_variable_by_number
    ctx  = Context.new.set("a", 6)
    expr = MultiplyExpression.new(VariableExpression.new("a"), NumberExpression.new(7))
    assert_equal 42, expr.interpret(ctx)
  end
end


# ── DivideExpression ──────────────────────────────────────────
class TestDivideExpression < Minitest::Test
  def test_divides_left_by_right
    expr = DivideExpression.new(NumberExpression.new(10), NumberExpression.new(2))
    assert_equal 5.0, expr.interpret(Context.new)
  end

  def test_raises_on_division_by_zero
    expr = DivideExpression.new(NumberExpression.new(5), NumberExpression.new(0))
    assert_raises(ZeroDivisionError) { expr.interpret(Context.new) }
  end

  def test_produces_fractional_result
    expr = DivideExpression.new(NumberExpression.new(10), NumberExpression.new(4))
    assert_in_delta 2.5, expr.interpret(Context.new), 0.001
  end
end


# ── Composite trees ───────────────────────────────────────────
class TestCompositeTrees < Minitest::Test
  def test_diff_of_squares
    a    = VariableExpression.new("a")
    b    = VariableExpression.new("b")
    ctx  = Context.new.set("a", 10).set("b", 5)
    expr = MultiplyExpression.new(AddExpression.new(a, b), SubtractExpression.new(a, b))
    assert_equal 75, expr.interpret(ctx)
  end

  def test_same_tree_different_contexts
    a    = VariableExpression.new("a")
    b    = VariableExpression.new("b")
    expr = MultiplyExpression.new(AddExpression.new(a, b), SubtractExpression.new(a, b))
    assert_equal 75, expr.interpret(Context.new.set("a", 10).set("b", 5))
    assert_equal 32, expr.interpret(Context.new.set("a",  6).set("b", 2))
  end

  def test_literal_three_level_tree
    expr = MultiplyExpression.new(
      AddExpression.new(NumberExpression.new(3), NumberExpression.new(4)),
      NumberExpression.new(2)
    )
    assert_equal 14, expr.interpret(Context.new)
  end

  def test_nested_display_wraps_each_level
    expr = AddExpression.new(
      MultiplyExpression.new(NumberExpression.new(2), NumberExpression.new(3)),
      NumberExpression.new(1)
    )
    assert_includes expr.display, "(2 * 3)"
  end
end
