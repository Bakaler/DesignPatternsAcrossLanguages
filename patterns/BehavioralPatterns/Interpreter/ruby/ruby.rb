# ============================================================
#  Interpreter: Arithmetic Expression Evaluator
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  AbstractExpression   Expression (module)
#  TerminalExpression   NumberExpression, VariableExpression
#  NonterminalExpr.     AddExpression, SubtractExpression,
#                       MultiplyExpression, DivideExpression,
#                       FloorDivideExpression, ModuloExpression,
#                       PowerExpression,
#                       AbsExpression, SqrtExpression,
#                       InverseExpression, FactorialExpression,
#                       PowerOfTenExpression, LogExpression,
#                       NegateExpression
#  Context              Context (variable → number map)
#  Client               Entry point
#
#  Grammar mirrored from EBNF_parser
#  ────────────────────────────────────────────────────────
#  _exp     : + -           AddExpression, SubtractExpression
#  _term    : * / // %      MultiplyExpression, DivideExpression,
#                           FloorDivideExpression, ModuloExpression
#  _power   : **            PowerExpression
#  _function: abs sqrt 1/x  AbsExpression, SqrtExpression,
#             n! 10^y log   InverseExpression, FactorialExpression,
#             x^y neg       PowerOfTenExpression, LogExpression,
#                           PowerExpression, NegateExpression
#  _digit   : literal / var NumberExpression, VariableExpression
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Grammar as classes  each rule is a class; trees are first-class objects
#  ✓ Easy to extend      new operations add a class, touch nothing else
#  ✓ Context reuse       one tree, multiple contexts → multiple results
#  ✗ Class explosion     complex grammars produce many small classes
# ============================================================

require 'math' rescue nil  # not needed in Ruby; Math is built in


# SECTION:: Context
# ═════════════════════════════════════════════════════════════
#  CONTEXT
# ═════════════════════════════════════════════════════════════

class Context
  def initialize
    @vars = {}
  end

  def set(name, value)
    @vars[name.to_sym] = value
    self
  end

  def get(name)
    key = name.to_sym
    raise KeyError, "Undefined variable: #{name}" unless @vars.key?(key)
    @vars[key]
  end
end


# SECTION:: Abstract Expression
# ═════════════════════════════════════════════════════════════
#  ABSTRACT EXPRESSION
# ═════════════════════════════════════════════════════════════

module Expression
  def interpret(ctx) = raise NotImplementedError, "#{self.class}#interpret"
  def display        = raise NotImplementedError, "#{self.class}#display"
end


# SECTION:: Terminal Expressions
# ═════════════════════════════════════════════════════════════
#  TERMINAL: NumberExpression
# ═════════════════════════════════════════════════════════════

class NumberExpression
  include Expression

  def initialize(value)
    @value = value
  end

  def interpret(_ctx) = @value

  def display
    @value == @value.to_i ? @value.to_i.to_s : @value.to_s
  end
end


# ═════════════════════════════════════════════════════════════
#  TERMINAL: VariableExpression
# ═════════════════════════════════════════════════════════════

class VariableExpression
  include Expression

  def initialize(name)
    @name = name
  end

  def interpret(ctx) = ctx.get(@name)
  def display        = @name
end


# SECTION:: Binary Nonterminal Expressions
# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: AddExpression          _exp rule
# ═════════════════════════════════════════════════════════════

class AddExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)  = @left.interpret(ctx) + @right.interpret(ctx)
  def display         = "(#{@left.display} + #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: SubtractExpression     _exp rule
# ═════════════════════════════════════════════════════════════

class SubtractExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)  = @left.interpret(ctx) - @right.interpret(ctx)
  def display         = "(#{@left.display} - #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: MultiplyExpression     _term rule
# ═════════════════════════════════════════════════════════════

class MultiplyExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)  = @left.interpret(ctx) * @right.interpret(ctx)
  def display         = "(#{@left.display} * #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: DivideExpression       _term rule
# ═════════════════════════════════════════════════════════════

class DivideExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)
    d = @right.interpret(ctx)
    raise ZeroDivisionError, "Division by zero" if d == 0
    @left.interpret(ctx) / d.to_f
  end
  def display = "(#{@left.display} / #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: FloorDivideExpression  _term rule  (//)
# ═════════════════════════════════════════════════════════════

class FloorDivideExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)
    d = @right.interpret(ctx)
    raise ZeroDivisionError, "Division by zero" if d == 0
    (@left.interpret(ctx) / d.to_f).floor
  end
  def display = "(#{@left.display} // #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: ModuloExpression       _term rule  (%)
# ═════════════════════════════════════════════════════════════

class ModuloExpression
  include Expression
  def initialize(left, right) = (@left, @right = left, right)
  def interpret(ctx)
    d = @right.interpret(ctx)
    raise ZeroDivisionError, "Division by zero" if d == 0
    @left.interpret(ctx) % d
  end
  def display = "(#{@left.display} % #{@right.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
# ═════════════════════════════════════════════════════════════

class PowerExpression
  include Expression
  def initialize(base, exponent) = (@base, @exponent = base, exponent)
  def interpret(ctx) = @base.interpret(ctx) ** @exponent.interpret(ctx)
  def display        = "(#{@base.display} ** #{@exponent.display})"
end


# SECTION:: Unary Nonterminal Expressions
# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: NegateExpression       _function rule  (neg)
# ═════════════════════════════════════════════════════════════

class NegateExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx) = -@child.interpret(ctx)
  def display        = "(-#{@child.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: AbsExpression          _function rule  (abs)
# ═════════════════════════════════════════════════════════════

class AbsExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx) = @child.interpret(ctx).abs
  def display        = "abs(#{@child.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
# ═════════════════════════════════════════════════════════════

class SqrtExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx)
    v = @child.interpret(ctx)
    raise Math::DomainError, "Square root of negative number" if v < 0
    Math.sqrt(v)
  end
  def display = "sqrt(#{@child.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: InverseExpression      _function rule  (1/x)
# ═════════════════════════════════════════════════════════════

class InverseExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx)
    v = @child.interpret(ctx)
    raise ZeroDivisionError, "Division by zero" if v == 0
    1.0 / v
  end
  def display = "(1 / #{@child.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: FactorialExpression    _function rule  (n!)
# ═════════════════════════════════════════════════════════════

class FactorialExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx)
    n = @child.interpret(ctx).round
    raise ArgumentError, "Factorial of negative number" if n < 0
    (1..n).reduce(1, :*)
  end
  def display = "(#{@child.display}!)"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
# ═════════════════════════════════════════════════════════════

class PowerOfTenExpression
  include Expression
  def initialize(exponent) = (@exponent = exponent)
  def interpret(ctx) = 10 ** @exponent.interpret(ctx)
  def display        = "(10 ** #{@exponent.display})"
end


# ═════════════════════════════════════════════════════════════
#  NONTERMINAL: LogExpression          _function rule  (log)
# ═════════════════════════════════════════════════════════════

class LogExpression
  include Expression
  def initialize(child) = (@child = child)
  def interpret(ctx)
    v = @child.interpret(ctx)
    raise Math::DomainError, "Logarithm of non-positive number" if v <= 0
    Math.log10(v)
  end
  def display = "log(#{@child.display})"
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME
  SEP = "═" * 64

  puts "╔══════════════════════════════════════════════════════════════╗"
  puts "║       Interpreter: Arithmetic Expression Evaluator           ║"
  puts "╚══════════════════════════════════════════════════════════════╝"

  a = VariableExpression.new("a")
  b = VariableExpression.new("b")

  # ── Example 1: basic arithmetic ──────────────────────────────
  expr1 = MultiplyExpression.new(
    AddExpression.new(NumberExpression.new(3), NumberExpression.new(4)),
    NumberExpression.new(2)
  )
  puts "\n#{SEP}"
  puts "  Example 1: Basic arithmetic  (3 + 4) * 2"
  puts SEP
  puts "  Expression : #{expr1.display}"
  puts "  Result     : #{expr1.interpret(Context.new).to_i}"

  # ── Example 2: floor divide and modulo ───────────────────────
  ctx2      = Context.new.set("a", 17).set("b", 5)
  floor_div = FloorDivideExpression.new(a, b)
  modulo    = ModuloExpression.new(a, b)
  puts "\n#{SEP}"
  puts "  Example 2: Floor divide and modulo   a=17, b=5"
  puts SEP
  puts "  #{floor_div.display}  →  #{floor_div.interpret(ctx2).to_i}   (17 // 5)"
  puts "  #{modulo.display}    →  #{modulo.interpret(ctx2).to_i}    (17 % 5)"

  # ── Example 3: power ─────────────────────────────────────────
  ctx3  = Context.new.set("a", 2).set("b", 10)
  power = PowerExpression.new(a, b)
  puts "\n#{SEP}"
  puts "  Example 3: Power   a=2, b=10"
  puts SEP
  puts "  #{power.display}  →  #{power.interpret(ctx3).to_i}"

  # ── Example 4: unary functions ───────────────────────────────
  ctx4 = Context.new.set("a", 100).set("b", -9)
  puts "\n#{SEP}"
  puts "  Example 4: Unary functions   a=100, b=-9"
  puts SEP
  puts "  sqrt(a)       →  #{SqrtExpression.new(a).interpret(ctx4).to_i}"
  puts "  abs(b)        →  #{AbsExpression.new(b).interpret(ctx4).to_i}"
  puts "  neg(a)        →  #{NegateExpression.new(a).interpret(ctx4).to_i}"
  puts "  1/x (a)       →  #{InverseExpression.new(a).interpret(ctx4)}"
  puts "  log(a)        →  #{LogExpression.new(a).interpret(ctx4).to_i}"
  puts "  10^b (abs(b)) →  #{PowerOfTenExpression.new(AbsExpression.new(b)).interpret(ctx4).to_i}"

  # ── Example 5: factorial ─────────────────────────────────────
  ctx5 = Context.new.set("n", 6)
  n    = VariableExpression.new("n")
  fact = FactorialExpression.new(n)
  puts "\n#{SEP}"
  puts "  Example 5: Factorial   n=6"
  puts SEP
  puts "  #{fact.display}  →  #{fact.interpret(ctx5).to_i}"

  # ── Example 6: composition ───────────────────────────────────
  ctx6   = Context.new.set("a", 7).set("b", 23)
  nested = SqrtExpression.new(AbsExpression.new(SubtractExpression.new(a, b)))
  puts "\n#{SEP}"
  puts "  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23"
  puts SEP
  puts "  #{nested.display}  →  #{nested.interpret(ctx6).to_i}"

  puts "\n#{SEP}"
  puts "  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg"
  puts "  Each operator and function is its own class."
  puts "  Trees compose freely: any node can nest inside any other."
  puts SEP

  puts "\n╔══════════════════════════════════════════════════════════════╗"
  puts "║  Done                                                        ║"
  puts "╚══════════════════════════════════════════════════════════════╝"

end # __FILE__ == $PROGRAM_NAME
