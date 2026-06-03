# ============================================================
#  Unit Tests - Chain of Responsibility: Grammar Token Validator
#
#  What we test here:
#    Each handler claims exactly its own tokens
#    Each handler passes foreign tokens to the next link
#      (or returns nil when it is the last link)
#    Context validation: trailing, paren_depth, has_decimal
#    set_next() wiring and to_s identity
#
#  Run: ruby unit.test.rb
# ============================================================

require 'minitest/autorun'
require_relative '../../../../BehavioralPatterns/ChainOfResponsibility/ruby/ruby'

EMPTY       = ParseContext.new
AFTER5      = ParseContext.new(trailing: '5')
AFTER_OPEN  = ParseContext.new(trailing: '(')
AFTER_CLOSE = ParseContext.new(trailing: ')', paren_depth: 0)


class TestSolveHandler < Minitest::Test
  def setup
    @h = SolveHandler.new
  end

  def test_claims_equals
    assert_equal ['Solve', '='], @h.handle('=', EMPTY)
  end

  def test_passes_plus
    assert_nil @h.handle('+', EMPTY)
  end

  def test_passes_digit
    assert_nil @h.handle('5', EMPTY)
  end

  def test_to_s
    assert_equal 'SolveHandler', @h.to_s
  end
end


class TestExpHandler < Minitest::Test
  def setup
    @h = ExpHandler.new
  end

  def test_claims_plus_after_digit
    assert_equal ['Exp', ' + '], @h.handle('+', AFTER5)
  end

  def test_claims_minus_after_digit
    assert_equal ['Exp', ' - '], @h.handle('-', AFTER5)
  end

  def test_rejects_plus_at_start
    assert_nil @h.handle('+', EMPTY)
  end

  def test_rejects_plus_after_open_paren
    assert_nil @h.handle('+', AFTER_OPEN)
  end

  def test_rejects_plus_after_operator
    OPERANDS.each do |op|
      ctx = ParseContext.new(trailing: op)
      assert_nil @h.handle('+', ctx), "Should reject + after #{op}"
    end
  end

  def test_passes_multiply
    assert_nil @h.handle('*', AFTER5)
  end

  def test_passes_digit
    assert_nil @h.handle('7', AFTER5)
  end
end


class TestTermHandler < Minitest::Test
  def setup
    @h = TermHandler.new
  end

  def test_claims_multiply
    assert_equal ['Term', ' * '], @h.handle('*', AFTER5)
  end

  def test_claims_divide
    assert_equal ['Term', ' / '], @h.handle('/', AFTER5)
  end

  def test_claims_floor_divide
    assert_equal ['Term', ' // '], @h.handle('//', AFTER5)
  end

  def test_claims_modulo
    assert_equal ['Term', ' % '], @h.handle('%', AFTER5)
  end

  def test_does_not_claim_power
    assert_nil @h.handle('**', AFTER5)
  end

  def test_rejects_multiply_at_start
    assert_nil @h.handle('*', EMPTY)
  end

  def test_rejects_multiply_after_open_paren
    assert_nil @h.handle('*', AFTER_OPEN)
  end

  def test_passes_plus
    assert_nil @h.handle('+', AFTER5)
  end
end


class TestPowerHandler < Minitest::Test
  def setup
    @h = PowerHandler.new
  end

  def test_claims_power
    assert_equal ['Power', ' ** '], @h.handle('**', AFTER5)
  end

  def test_rejects_power_at_start
    assert_nil @h.handle('**', EMPTY)
  end

  def test_rejects_power_after_open_paren
    assert_nil @h.handle('**', AFTER_OPEN)
  end

  def test_passes_single_star
    assert_nil @h.handle('*', AFTER5)
  end

  def test_passes_digit
    assert_nil @h.handle('3', AFTER5)
  end
end


class TestFactorHandler < Minitest::Test
  def setup
    @h = FactorHandler.new
  end

  def test_claims_open_paren_empty
    assert_equal ['Factor', '('], @h.handle('(', EMPTY)
  end

  def test_claims_open_paren_after_digit
    assert_equal ['Factor', '('], @h.handle('(', AFTER5)
  end

  def test_claims_open_paren_after_open
    assert_equal ['Factor', '('], @h.handle('(', AFTER_OPEN)
  end

  def test_claims_close_paren_when_open
    ctx = ParseContext.new(paren_depth: 1)
    assert_equal ['Factor', ')'], @h.handle(')', ctx)
  end

  def test_claims_close_paren_nested
    ctx = ParseContext.new(paren_depth: 3)
    assert_equal ['Factor', ')'], @h.handle(')', ctx)
  end

  def test_rejects_close_when_none_open
    ctx = ParseContext.new(paren_depth: 0)
    assert_nil @h.handle(')', ctx)
  end

  def test_passes_digit
    assert_nil @h.handle('5', AFTER5)
  end

  def test_passes_operator
    assert_nil @h.handle('+', AFTER5)
  end
end


class TestFunctionHandler < Minitest::Test
  def setup
    @h = FunctionHandler.new(DEFAULT_FUNCTIONS)
  end

  def test_claims_each_default_function
    DEFAULT_FUNCTIONS.each do |fn|
      assert_equal ['Function', fn], @h.handle(fn, AFTER5)
    end
  end

  def test_passes_unknown
    assert_nil @h.handle('cbrt', AFTER5)
  end

  def test_passes_digit
    assert_nil @h.handle('3', AFTER5)
  end

  def test_custom_set
    h2 = FunctionHandler.new(%w[cbrt exp])
    assert_equal ['Function', 'cbrt'], h2.handle('cbrt', AFTER5)
    assert_nil h2.handle('abs', AFTER5)
  end
end


class TestDigitHandler < Minitest::Test
  def setup
    @h = DigitHandler.new
  end

  def test_claims_each_digit
    '0123456789'.each_char do |d|
      assert_equal ['Digit', d], @h.handle(d, EMPTY)
    end
  end

  def test_rejects_digit_after_close_paren
    assert_nil @h.handle('5', AFTER_CLOSE)
  end

  def test_claims_decimal_no_prior
    assert_equal ['SoloDec', '0.'], @h.handle('.', EMPTY)
  end

  def test_rejects_second_decimal
    ctx = ParseContext.new(trailing: '3', has_decimal: true)
    assert_nil @h.handle('.', ctx)
  end

  def test_rejects_operator
    assert_nil @h.handle('+', EMPTY)
  end

  def test_rejects_unknown_string
    assert_nil @h.handle('xyz', EMPTY)
  end
end


class TestChainWiring < Minitest::Test
  def test_set_next_returns_handler
    a = SolveHandler.new
    b = ExpHandler.new
    assert_same b, a.set_next(b)
  end

  def test_token_reaches_next_handler
    digit = DigitHandler.new
    head  = SolveHandler.new
    head.set_next(digit)
    assert_equal ['Digit', '5'], head.handle('5', EMPTY)
  end

  def test_token_rejected_when_chain_exhausted
    head = SolveHandler.new
    assert_nil head.handle('xyz', EMPTY)
  end
end
