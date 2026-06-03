# ============================================================
#  Integration Tests - Chain of Responsibility: Grammar Token Validator
#
#  What we test here:
#    Full token sequences accepted or rejected end-to-end
#    Invalid sequences fail at the correct chain link
#    Every token type correctly classified in a realistic equation
#    Chain extension does not break existing behaviour
#    Paren depth and decimal flags interact correctly
#
#  Pipeline tests:
#    CoR chain + TreeBuilder + Interpreter evaluate end-to-end
#    Operator precedence is respected through tree shape
#    Grouping with parentheses overrides precedence
#    Unary prefix functions nest correctly
#    Invalid token sequences raise RuntimeError
#
#  Run: ruby integration.test.rb
# ============================================================

require 'minitest/autorun'
require_relative '../../../../BehavioralPatterns/ChainOfResponsibility/ruby/ruby'

# ─────────────────────────────────────────────────────────────
#  Helper: feed a token sequence through the chain, updating
#  context automatically after each accepted token.
# ─────────────────────────────────────────────────────────────

def feed(chain, tokens)
  results = []
  ctx = ParseContext.new

  tokens.each do |tok|
    result = chain.handle(tok, ctx)
    results << result
    break if result.nil?

    token_type  = result[0]
    paren_depth = ctx.paren_depth
    has_decimal = ctx.has_decimal

    if tok == '('
      paren_depth += 1
      has_decimal  = false
    elsif tok == ')'
      paren_depth -= 1
    elsif %w[Exp Term Power].include?(token_type)
      has_decimal = false
    elsif tok == '.'
      has_decimal = true
    end

    ctx = ParseContext.new(trailing: tok, paren_depth: paren_depth, has_decimal: has_decimal)
  end

  results
end


class TestValidSequences < Minitest::Test
  def test_simple_addition
    r = feed(build_chain, %w[5 + 3 =])
    assert_equal %w[Digit Exp Digit Solve], r.map { |x| x[0] }
  end

  def test_order_of_operations
    r = feed(build_chain, %w[2 + 3 * 4 =])
    assert_equal %w[Digit Exp Digit Term Digit Solve], r.map { |x| x[0] }
  end

  def test_parenthesised
    r = feed(build_chain, ['(', '6', '-', '2', ')', '*', '3', '='])
    assert_equal %w[Factor Digit Exp Digit Factor Term Digit Solve], r.map { |x| x[0] }
  end

  def test_power_expression
    r = feed(build_chain, ['2', '**', '8', '='])
    assert_equal %w[Digit Power Digit Solve], r.map { |x| x[0] }
  end

  def test_function_wrapping
    r = feed(build_chain, %w[abs 9 =])
    assert_equal %w[Function Digit Solve], r.map { |x| x[0] }
  end

  def test_nested_functions
    r = feed(build_chain, %w[neg abs 7 =])
    assert_equal %w[Function Function Digit Solve], r.map { |x| x[0] }
  end

  def test_decimal_number
    r = feed(build_chain, ['3', '.', '1', '4', '='])
    assert_equal %w[Digit SoloDec Digit Digit Solve], r.map { |x| x[0] }
  end

  def test_floor_divide
    r = feed(build_chain, ['1', '7', '//', '5', '='])
    assert_equal %w[Digit Digit Term Digit Solve], r.map { |x| x[0] }
  end

  def test_modulo
    r = feed(build_chain, ['1', '7', '%', '5', '='])
    assert_equal %w[Digit Digit Term Digit Solve], r.map { |x| x[0] }
  end

  def test_complex
    r = feed(build_chain, %w[2 3 4 + ( 1 2 / 3 ) =])
    assert_equal %w[Digit Digit Digit Exp Factor Digit Digit Term Digit Factor Solve],
                 r.map { |x| x[0] }
  end

  def test_solve_only
    assert_equal ['Solve', '='], build_chain.handle('=', ParseContext.new)
  end
end


class TestInvalidSequences < Minitest::Test
  def test_leading_plus_rejected
    assert_nil feed(build_chain, ['+', '5'])[0]
  end

  def test_double_operator_rejected
    r = feed(build_chain, %w[1 2 + +])
    refute_nil r[0]
    assert_nil r[3]
  end

  def test_operator_after_open_paren
    assert_nil feed(build_chain, ['(', '+'])[1]
  end

  def test_unmatched_close_paren
    assert_nil build_chain.handle(')', ParseContext.new(paren_depth: 0))
  end

  def test_second_decimal_rejected
    assert_nil feed(build_chain, ['1', '.', '5', '.'])[3]
  end

  def test_digit_after_close_paren
    assert_nil feed(build_chain, ['(', '3', ')', '5'])[3]
  end

  def test_unknown_token
    assert_nil build_chain.handle('xyz', ParseContext.new(trailing: '5'))
  end

  def test_leading_multiply
    assert_nil build_chain.handle('*', ParseContext.new)
  end
end


class TestProcessedTokenValues < Minitest::Test
  def test_exp_adds_spaces
    assert_equal ' + ', build_chain.handle('+', ParseContext.new(trailing: '5'))[1]
  end

  def test_term_adds_spaces
    assert_equal ' * ', build_chain.handle('*', ParseContext.new(trailing: '3'))[1]
  end

  def test_power_adds_spaces
    assert_equal ' ** ', build_chain.handle('**', ParseContext.new(trailing: '2'))[1]
  end

  def test_factor_no_spaces
    assert_equal '(', build_chain.handle('(', ParseContext.new)[1]
  end

  def test_solo_decimal
    assert_equal '0.', build_chain.handle('.', ParseContext.new)[1]
  end

  def test_digit_as_is
    assert_equal '7', build_chain.handle('7', ParseContext.new)[1]
  end
end


class TestChainExtension < Minitest::Test
  def test_new_function_accepted
    ext = build_chain(functions: DEFAULT_FUNCTIONS + ['cbrt'])
    assert_equal ['Function', 'cbrt'], ext.handle('cbrt', ParseContext.new(trailing: '8'))
  end

  def test_new_function_rejected_in_default
    assert_nil build_chain.handle('cbrt', ParseContext.new(trailing: '8'))
  end

  def test_existing_functions_still_work
    ext = build_chain(functions: DEFAULT_FUNCTIONS + ['cbrt'])
    DEFAULT_FUNCTIONS.each do |fn|
      assert_equal ['Function', fn], ext.handle(fn, ParseContext.new(trailing: '5'))
    end
  end
end


class TestPipeline < Minitest::Test
  def setup
    @ctx = Context.new
  end

  def ev(tokens)
    parse_and_build(tokens).interpret(@ctx)
  end

  def test_simple_addition     = assert_equal 7,   ev(%w[3 + 4 =])
  def test_simple_subtraction  = assert_equal 5,   ev(%w[9 - 4 =])
  def test_simple_multiply     = assert_equal 42,  ev(%w[6 * 7 =])
  def test_simple_divide       = assert_equal 2.0, ev(%w[8 / 4 =])

  def test_precedence
    # 2 + 3 * 4 = 14
    assert_equal 14, ev(%w[2 + 3 * 4 =])
  end

  def test_parens_override
    assert_equal 20, ev(['(', '2', '+', '3', ')', '*', '4', '='])
  end

  def test_power       = assert_equal 256.0, ev(['2', '**', '8', '='])
  def test_floor_divide = assert_equal 3.0,  ev(['1', '7', '//', '5', '='])
  def test_modulo      = assert_equal 2.0,   ev(['1', '7', '%', '5', '='])
  def test_sqrt        = assert_equal 3.0,   ev(['sqrt', '9', '='])

  def test_abs_neg
    assert_equal 5.0, ev(['abs', 'neg', '5', '='])
  end

  def test_nested_unary
    assert_equal 7.0, ev(['abs', 'neg', 'abs', 'neg', '7', '='])
  end

  def test_pythagorean
    assert_equal 5.0, ev(['sqrt','(','3','**','2','+','4','**','2',')','='])
  end

  def test_multidigit
    assert_equal 234, ev(%w[2 3 4 + 0 =])
  end

  def test_decimal
    r = ev(['3', '.', '1', '4', '+', '0', '='])
    assert_in_delta 3.14, r, 1e-9
  end

  def test_invalid_token_raises
    assert_raises(RuntimeError) { parse_and_build(['+', '5']) }
  end

  def test_tree_str_reflects_structure
    tree = parse_and_build(['(', '2', '+', '3', ')', '*', '4', '='])
    assert_includes tree.to_s, '*'
    assert_includes tree.to_s, '+'
  end
end
