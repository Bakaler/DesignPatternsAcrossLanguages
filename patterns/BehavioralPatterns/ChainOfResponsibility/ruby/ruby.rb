# ============================================================
#  Chain of Responsibility: Grammar Token Validator
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Handler (abstract)   Handler
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
#  FunctionHandler abs sqrt ... named unary functions
#  DigitHandler   0-9  .     terminals
#
#  Each handler either CLAIMS the token (returns a result) or
#  PASSES it down the chain.  A token that reaches the end
#  without being claimed is REJECTED (returns nil).
#
#  Pipeline (bottom of file)
#  ────────────────────────────────────────────────────────
#  TreeBuilder consumes the CoR results and constructs an
#  Interpreter expression tree (shunting-yard algorithm).
#  Calling .build returns the root Expression node, which
#  you then evaluate with .interpret(ctx).
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  Decoupled validation  each rule knows only its own tokens
#  Ordered chain         grammar precedence = chain position
#  Easy to extend        add a handler, insert it anywhere
#  Explicit rejection    nil propagates back to the caller
#  Composable with Interpreter  CoR validates and classifies;
#                               Interpreter evaluates
# ============================================================

require_relative '../../Interpreter/ruby/ruby'


# SECTION:: Constants
# ═════════════════════════════════════════════════════════════
#  CONSTANTS
# ═════════════════════════════════════════════════════════════

OPERANDS          = %w[+ - * ** / // %].freeze
DEFAULT_FUNCTIONS = %w[abs sqrt neg square inverse factorial log].freeze


# SECTION:: ParseContext
# ═════════════════════════════════════════════════════════════
#  CONTEXT
# ═════════════════════════════════════════════════════════════

ParseContext = Struct.new(:trailing, :paren_depth, :has_decimal) do
  #
  # Carries the state each handler needs to make validation decisions.
  #
  #  trailing    : the last accepted token string, or nil at the start
  #  paren_depth : number of unmatched '(' currently open
  #  has_decimal : true if the current number segment already has a '.'
  #
  def initialize(trailing: nil, paren_depth: 0, has_decimal: false)
    super(trailing, paren_depth, has_decimal)
  end
end


# SECTION:: Abstract Handler
# ═════════════════════════════════════════════════════════════
#  ABSTRACT HANDLER
# ═════════════════════════════════════════════════════════════

class Handler
  #
  # Every grammar-rule handler inherits from this class.
  #
  #   set_next(handler)  wire the next link in the chain;
  #                      returns the handler so calls can be chained.
  #   handle(token, ctx) subclasses must implement this.
  #                      Return [token_type, processed_token] to CLAIM,
  #                      or call _pass() to forward.  Returns nil
  #                      if no handler claims the token.
  #

  def initialize
    @next = nil
  end

  def set_next(handler)
    @next = handler
    handler
  end

  def handle(_token, _ctx)
    raise NotImplementedError, "#{self.class}#handle not implemented"
  end

  def to_s
    self.class.name
  end

  private

  def _pass(token, ctx)
    @next ? @next.handle(token, ctx) : nil
  end
end


# SECTION:: Concrete Handlers
# ═════════════════════════════════════════════════════════════
#  SOLVE HANDLER: '='
# ═════════════════════════════════════════════════════════════

class SolveHandler < Handler
  # Claims '=' unconditionally; it is always a valid evaluation trigger.
  def handle(token, ctx)
    return ['Solve', token] if token == '='
    _pass(token, ctx)
  end
end


# ═════════════════════════════════════════════════════════════
#  EXP HANDLER: +  -
# ═════════════════════════════════════════════════════════════

class ExpHandler < Handler
  #
  # _exp rule.  Claims '+' and '-'.
  #
  # Valid   : trailing is a digit, ')', or a function name
  # Invalid : nothing entered yet, or trailing is '(' or an operator
  #
  TOKENS = %w[+ -].freeze

  def handle(token, ctx)
    return _pass(token, ctx) unless TOKENS.include?(token)
    return nil if ctx.trailing.nil?
    return nil if ctx.trailing == '(' || OPERANDS.include?(ctx.trailing)

    ['Exp', " #{token} "]
  end
end


# ═════════════════════════════════════════════════════════════
#  TERM HANDLER: *  /  //  %
# ═════════════════════════════════════════════════════════════

class TermHandler < Handler
  #
  # _term rule.  Claims '*', '/', '//', '%'.
  # Note: '**' is a distinct token and passes through here unclaimed.
  #
  TOKENS = %w[* / // %].freeze

  def handle(token, ctx)
    return _pass(token, ctx) unless TOKENS.include?(token)
    return nil if ctx.trailing.nil?
    return nil if ctx.trailing == '(' || OPERANDS.include?(ctx.trailing)

    ['Term', " #{token} "]
  end
end


# ═════════════════════════════════════════════════════════════
#  POWER HANDLER: **
# ═════════════════════════════════════════════════════════════

class PowerHandler < Handler
  #
  # _power rule.  Claims '**'.
  # Passes '*' through so TermHandler catches single-star multiplication.
  #
  def handle(token, ctx)
    return _pass(token, ctx) unless token == '**'
    return nil if ctx.trailing.nil?
    return nil if ctx.trailing == '(' || OPERANDS.include?(ctx.trailing)

    ['Power', " #{token} "]
  end
end


# ═════════════════════════════════════════════════════════════
#  FACTOR HANDLER: (  )
# ═════════════════════════════════════════════════════════════

class FactorHandler < Handler
  #
  # _factor rule.  Claims '(' and ')'.
  #
  # '(' is always accepted (open a new group).
  # ')' requires at least one unmatched '(' to be open (paren_depth > 0).
  #
  def handle(token, ctx)
    return ['Factor', token] if token == '('

    if token == ')'
      return nil if ctx.paren_depth <= 0
      return ['Factor', token]
    end

    _pass(token, ctx)
  end
end


# ═════════════════════════════════════════════════════════════
#  FUNCTION HANDLER: abs  sqrt  neg  ...
# ═════════════════════════════════════════════════════════════

class FunctionHandler < Handler
  #
  # _function rule.  Claims any token in the supplied function set.
  # The set is injected at construction so the handler stays open for
  # extension without modification.
  #
  def initialize(functions)
    super()
    @functions = functions
  end

  def handle(token, ctx)
    return ['Function', token] if @functions.include?(token)
    _pass(token, ctx)
  end
end


# ═════════════════════════════════════════════════════════════
#  DIGIT HANDLER: 0-9  .
# ═════════════════════════════════════════════════════════════

class DigitHandler < Handler
  #
  # _digit rule.  Terminal handler; end of the chain.
  #
  # Single digits 0-9 are always accepted unless trailing is ')'.
  # '.' is accepted when the current number has no decimal yet;
  #      a bare '.' is prefixed with '0' and returned as ['SoloDec', '0.'].
  # Everything else falls off the chain as nil (rejected).
  #
  def handle(token, ctx)
    return nil if ctx.trailing == ')'

    return ['Digit', token] if token =~ /\A\d\z/

    if token == '.'
      return nil if ctx.has_decimal
      return ['SoloDec', '0.']
    end

    nil
  end
end


# SECTION:: Chain Factory
# ═════════════════════════════════════════════════════════════
#  CHAIN FACTORY
# ═════════════════════════════════════════════════════════════

def build_chain(functions: nil)
  #
  # Assemble the validation chain and return its head.
  #
  # Chain order mirrors grammar precedence (lowest to highest):
  #   SolveHandler
  #     -> ExpHandler        (+ -)
  #     -> TermHandler       (* / // %)
  #     -> PowerHandler      (**)
  #     -> FactorHandler     ( )
  #     -> FunctionHandler   (abs sqrt ...)
  #     -> DigitHandler      (0-9 .)
  #
  functions ||= DEFAULT_FUNCTIONS

  head  = SolveHandler.new
  exp   = ExpHandler.new
  term  = TermHandler.new
  power = PowerHandler.new
  fact  = FactorHandler.new
  func  = FunctionHandler.new(functions)
  digit = DigitHandler.new

  head.set_next(exp)
      .set_next(term)
      .set_next(power)
      .set_next(fact)
      .set_next(func)
      .set_next(digit)

  head
end


# SECTION:: TreeBuilder
# ═════════════════════════════════════════════════════════════
#  TREE BUILDER: CoR + Interpreter pipeline
# ═════════════════════════════════════════════════════════════

PRECEDENCE = {
  '+' => 1, '-' => 1,
  '*' => 2, '/' => 2, '//' => 2, '%' => 2,
  '**' => 3,
}.freeze

UNARY_NAMES = %w[abs sqrt neg square inverse factorial log].freeze

class TreeBuilder
  #
  # Consumes [token_type, processed_token] pairs (exactly what the
  # CoR chain returns) and builds an Interpreter expression tree using
  # the shunting-yard algorithm.
  #

  def initialize
    @output  = []   # completed Expression nodes
    @ops     = []   # operator / function stack
    @pending = ''   # digit accumulation buffer
  end

  def push(token_type, token)
    stripped = token.strip

    case token_type
    when 'Digit'
      @pending += stripped

    when 'SoloDec'
      # '.' after existing digits: extend; solo: start at '0.'
      @pending += @pending.empty? ? '0.' : '.'

    when 'Exp', 'Term', 'Power'
      flush_pending
      prec = PRECEDENCE[stripped]
      while !@ops.empty? &&
            @ops.last != '(' &&
            !UNARY_NAMES.include?(@ops.last) &&
            (PRECEDENCE[@ops.last] || 0) >= prec
        apply_binary
      end
      @ops << stripped

    when 'Function'
      flush_pending
      @ops << stripped

    when 'Factor'
      if stripped == '('
        flush_pending
        @ops << '('
      else
        flush_pending
        apply_top while !@ops.empty? && @ops.last != '('
        @ops.pop unless @ops.empty?   # discard '('
        apply_unary if !@ops.empty? && UNARY_NAMES.include?(@ops.last)
      end

    when 'Solve'
      flush_pending
      apply_top until @ops.empty?
    end
  end

  def build
    #
    # Flush any remaining state and return the root Expression node.
    # Call this after all tokens (including '=') have been pushed.
    #
    flush_pending
    apply_top until @ops.empty?
    @output.last || NumberExpression.new(0)
  end

  private

  def flush_pending
    unless @pending.empty?
      @output << NumberExpression.new(@pending.to_f)
      @pending = ''
    end
  end

  def apply_top
    if UNARY_NAMES.include?(@ops.last)
      apply_unary
    else
      apply_binary
    end
  end

  def apply_binary
    op    = @ops.pop
    right = @output.pop
    left  = @output.pop
    node = case op
           when '+'  then AddExpression.new(left, right)
           when '-'  then SubtractExpression.new(left, right)
           when '*'  then MultiplyExpression.new(left, right)
           when '/'  then DivideExpression.new(left, right)
           when '//' then FloorDivideExpression.new(left, right)
           when '%'  then ModuloExpression.new(left, right)
           when '**' then PowerExpression.new(left, right)
           end
    @output << node
  end

  def apply_unary
    fn      = @ops.pop
    operand = @output.pop
    node = case fn
           when 'abs'       then AbsExpression.new(operand)
           when 'sqrt'      then SqrtExpression.new(operand)
           when 'neg'       then NegateExpression.new(operand)
           when 'square'    then PowerExpression.new(operand, NumberExpression.new(2))
           when 'inverse'   then InverseExpression.new(operand)
           when 'factorial' then FactorialExpression.new(operand)
           when 'log'       then LogExpression.new(operand)
           end
    @output << node
  end
end


def parse_and_build(tokens, functions: nil)
  #
  # Convenience function: feed a token list through the full pipeline
  # and return the root Expression node ready for .interpret().
  #
  # Raises RuntimeError on the first invalid token.
  #
  chain   = build_chain(functions: functions)
  builder = TreeBuilder.new
  ctx     = ParseContext.new

  tokens.each do |tok|
    result = chain.handle(tok, ctx)
    raise "Invalid token #{tok.inspect} after #{ctx.trailing.inspect}" if result.nil?
    builder.push(*result)

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

  builder.build
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME
  SEP = '═' * 64

  puts '╔══════════════════════════════════════════════════════════════╗'
  puts '║  Chain of Responsibility + Interpreter: Full Pipeline        ║'
  puts '╚══════════════════════════════════════════════════════════════╝'

  ctx = Context.new

  # ── Part 1: CoR validation chain alone ──────────────────────
  puts "\n#{SEP}"
  puts '  Part 1 - CoR chain: validate and classify tokens'
  puts SEP

  chain = build_chain
  demos = [
    [%w[2 3 4 + ( 1 2 / 3 ) =], '234 + (12 / 3)'],
    [['+', '5'],                  "leading '+'   rejected"],
    [%w[1 2 + +],                 '12 + +        rejected'],
  ]
  demos.each do |tokens, label|
    puts "\n  #{label}"
    c = ParseContext.new
    tokens.each do |tok|
      r = chain.handle(tok, c)
      puts "    #{tok.inspect.ljust(7)} → #{r.inspect}"
      break if r.nil?
      tt = r[0]
      pd = c.paren_depth + (tok == '(' ? 1 : tok == ')' ? -1 : 0)
      hd = (c.has_decimal || tok == '.') && !%w[Exp Term Power].include?(tt)
      c  = ParseContext.new(trailing: tok, paren_depth: pd, has_decimal: hd)
    end
  end

  # ── Part 2: Full pipeline ────────────────────────────────────
  puts "\n#{SEP}"
  puts '  Part 2 - Full pipeline: tokens → CoR → tree → interpret()'
  puts SEP

  examples = [
    [%w[3 + 4 =],                                          '3 + 4'],
    [%w[2 + 3 * 4 =],                                      '2 + 3 * 4  (precedence)'],
    [['(', '2', '+', '3', ')', '*', '4', '='],             '(2 + 3) * 4'],
    [['2', '**', '8', '='],                                '2 ** 8'],
    [['sqrt', '9', '='],                                   'sqrt 9'],
    [['abs', 'neg', '5', '='],                             'abs(neg(5))'],
    [['sqrt','(','3','**','2','+','4','**','2',')','='],    'sqrt(3^2 + 4^2)  Pythagorean'],
    [['1','7','%','5','='],                                 '17 % 5'],
    [['1','5','//','4','='],                                '15 // 4'],
  ]

  examples.each do |tokens, label|
    tree   = parse_and_build(tokens)
    result = tree.interpret(ctx)
    display = result == result.to_i ? result.to_i : result
    puts "  #{label.ljust(35)}  tree: #{tree.to_s.ljust(40)}  = #{display}"
  end

  puts "\n#{SEP}"
  puts '  CoR owns VALIDATION.  Interpreter owns EVALUATION.'
  puts '  TreeBuilder is the only piece that knows about both.'
  puts SEP

  puts "\n╔══════════════════════════════════════════════════════════════╗"
  puts '║  Done                                                        ║'
  puts '╚══════════════════════════════════════════════════════════════╝'
end
