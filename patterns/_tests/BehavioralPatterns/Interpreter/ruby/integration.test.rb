# ============================================================
#  Integration Tests — Interpreter: Arithmetic Expression Evaluator (Ruby)
#
#  Run: ruby integration.test.rb
# ============================================================

require 'minitest/autorun'
require_relative '../../../../BehavioralPatterns/Interpreter/ruby/ruby'


class TestEndToEnd < Minitest::Test
  def test_three_level_nested_tree
    # ((a + b) * (a - b)) / 5  with a=10, b=5  →  75/5 = 15
    a   = VariableExpression.new("a")
    b   = VariableExpression.new("b")
    ctx = Context.new.set("a", 10).set("b", 5)

    expr = DivideExpression.new(
      MultiplyExpression.new(AddExpression.new(a, b), SubtractExpression.new(a, b)),
      NumberExpression.new(5)
    )
    assert_in_delta 15.0, expr.interpret(ctx), 0.001
  end

  def test_tree_reuse_three_contexts
    a    = VariableExpression.new("a")
    b    = VariableExpression.new("b")
    expr = MultiplyExpression.new(AddExpression.new(a, b), SubtractExpression.new(a, b))

    [[10, 5, 75], [6, 2, 32], [3, 1, 8]].each do |av, bv, expected|
      ctx = Context.new.set("a", av).set("b", bv)
      assert_equal expected, expr.interpret(ctx)
    end
  end

  def test_display_produces_fully_parenthesised_string
    expr = MultiplyExpression.new(
      AddExpression.new(VariableExpression.new("a"), VariableExpression.new("b")),
      SubtractExpression.new(VariableExpression.new("a"), VariableExpression.new("b"))
    )
    s = expr.display
    assert_includes s, "(a + b)"
    assert_includes s, "(a - b)"
    assert s.start_with?("(")
  end
end


class TestErrorPropagation < Minitest::Test
  def test_missing_variable_in_deep_subtree
    expr = AddExpression.new(
      NumberExpression.new(1),
      MultiplyExpression.new(VariableExpression.new("missing"), NumberExpression.new(2))
    )
    assert_raises(KeyError) { expr.interpret(Context.new) }
  end

  def test_division_by_zero_in_subtree
    expr = AddExpression.new(
      NumberExpression.new(1),
      DivideExpression.new(NumberExpression.new(4), NumberExpression.new(0))
    )
    assert_raises(ZeroDivisionError) { expr.interpret(Context.new) }
  end
end


class TestContextIndependence < Minitest::Test
  def test_parallel_evaluations_do_not_interfere
    a    = VariableExpression.new("a")
    b    = VariableExpression.new("b")
    expr = AddExpression.new(a, b)

    ctx1 = Context.new.set("a", 1).set("b", 2)
    ctx2 = Context.new.set("a", 100).set("b", 200)

    assert_equal   3, expr.interpret(ctx1)
    assert_equal 300, expr.interpret(ctx2)
  end
end


class TestArithmeticCorrectness < Minitest::Test
  def test_addition_is_commutative
    ctx = Context.new.set("a", 3).set("b", 7)
    ab  = AddExpression.new(VariableExpression.new("a"), VariableExpression.new("b"))
    ba  = AddExpression.new(VariableExpression.new("b"), VariableExpression.new("a"))
    assert_equal ab.interpret(ctx), ba.interpret(ctx)
  end

  def test_multiply_by_zero_gives_zero
    ctx  = Context.new.set("a", 999)
    expr = MultiplyExpression.new(VariableExpression.new("a"), NumberExpression.new(0))
    assert_equal 0, expr.interpret(ctx)
  end

  def test_divide_by_one_gives_same_value
    ctx  = Context.new.set("a", 42)
    expr = DivideExpression.new(VariableExpression.new("a"), NumberExpression.new(1))
    assert_in_delta 42.0, expr.interpret(ctx), 0.001
  end
end
