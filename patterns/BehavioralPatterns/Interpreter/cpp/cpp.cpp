// ============================================================
//  Interpreter: Arithmetic Expression Evaluator
//  Compile: g++ -std=c++17 -o cpp cpp.cpp && ./cpp
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  AbstractExpression   Expression (abstract base)
//  TerminalExpression   NumberExpression, VariableExpression
//  NonterminalExpr.     AddExpression, SubtractExpression,
//                       MultiplyExpression, DivideExpression,
//                       FloorDivideExpression, ModuloExpression,
//                       PowerExpression,
//                       AbsExpression, SqrtExpression,
//                       InverseExpression, FactorialExpression,
//                       PowerOfTenExpression, LogExpression,
//                       NegateExpression
//  Context              Context (variable → number map)
//  Client               main()
//
//  Grammar mirrored from EBNF_parser
//  ────────────────────────────────────────────────────────
//  _exp     : + -           AddExpression, SubtractExpression
//  _term    : * / // %      MultiplyExpression, DivideExpression,
//                           FloorDivideExpression, ModuloExpression
//  _power   : **            PowerExpression
//  _function: abs sqrt 1/x  AbsExpression, SqrtExpression,
//             n! 10^y log   InverseExpression, FactorialExpression,
//             x^y neg       PowerOfTenExpression, LogExpression,
//                           PowerExpression, NegateExpression
//  _digit   : literal / var NumberExpression, VariableExpression
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Grammar as classes  each rule is a class; trees are first-class objects
//  ✓ Easy to extend      new operations add a class, touch nothing else
//  ✓ Context reuse       one tree, multiple contexts → multiple results
//  ✗ Class explosion     complex grammars produce many small classes
// ============================================================

#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <stdexcept>
#include <sstream>
#include <cmath>

using Expr = std::shared_ptr<class Expression>;


// SECTION:: Context
// ═════════════════════════════════════════════════════════════
//  CONTEXT
// ═════════════════════════════════════════════════════════════

class Context {
    std::unordered_map<std::string, double> vars;
public:
    Context& set(const std::string& name, double value) { vars[name] = value; return *this; }

    double get(const std::string& name) const {
        auto it = vars.find(name);
        if (it == vars.end()) throw std::runtime_error("Undefined variable: " + name);
        return it->second;
    }
};


// SECTION:: Abstract Expression
// ═════════════════════════════════════════════════════════════
//  ABSTRACT EXPRESSION
// ═════════════════════════════════════════════════════════════

class Expression {
public:
    virtual double interpret(const Context& ctx) const = 0;
    virtual std::string display() const = 0;
    virtual ~Expression() = default;
};


// SECTION:: Terminal Expressions
// ═════════════════════════════════════════════════════════════
//  TERMINAL: NumberExpression
// ═════════════════════════════════════════════════════════════

class NumberExpression : public Expression {
    double value;
public:
    explicit NumberExpression(double v) : value(v) {}
    double interpret(const Context&) const override { return value; }
    std::string display() const override {
        if (value == static_cast<int>(value)) return std::to_string(static_cast<int>(value));
        std::ostringstream ss; ss << value; return ss.str();
    }
};


// ═════════════════════════════════════════════════════════════
//  TERMINAL: VariableExpression
// ═════════════════════════════════════════════════════════════

class VariableExpression : public Expression {
    std::string name;
public:
    explicit VariableExpression(std::string n) : name(std::move(n)) {}
    double interpret(const Context& ctx) const override { return ctx.get(name); }
    std::string display() const override { return name; }
};


// SECTION:: Binary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AddExpression          _exp rule
// ═════════════════════════════════════════════════════════════

class AddExpression : public Expression {
    Expr l, r;
public:
    AddExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override { return l->interpret(ctx) + r->interpret(ctx); }
    std::string display() const override { return "(" + l->display() + " + " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SubtractExpression     _exp rule
// ═════════════════════════════════════════════════════════════

class SubtractExpression : public Expression {
    Expr l, r;
public:
    SubtractExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override { return l->interpret(ctx) - r->interpret(ctx); }
    std::string display() const override { return "(" + l->display() + " - " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: MultiplyExpression     _term rule
// ═════════════════════════════════════════════════════════════

class MultiplyExpression : public Expression {
    Expr l, r;
public:
    MultiplyExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override { return l->interpret(ctx) * r->interpret(ctx); }
    std::string display() const override { return "(" + l->display() + " * " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: DivideExpression       _term rule
// ═════════════════════════════════════════════════════════════

class DivideExpression : public Expression {
    Expr l, r;
public:
    DivideExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override {
        double d = r->interpret(ctx);
        if (d == 0) throw std::runtime_error("Division by zero");
        return l->interpret(ctx) / d;
    }
    std::string display() const override { return "(" + l->display() + " / " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FloorDivideExpression  _term rule  (//)
// ═════════════════════════════════════════════════════════════

class FloorDivideExpression : public Expression {
    Expr l, r;
public:
    FloorDivideExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override {
        double d = r->interpret(ctx);
        if (d == 0) throw std::runtime_error("Division by zero");
        return std::floor(l->interpret(ctx) / d);
    }
    std::string display() const override { return "(" + l->display() + " // " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: ModuloExpression       _term rule  (%)
// ═════════════════════════════════════════════════════════════

class ModuloExpression : public Expression {
    Expr l, r;
public:
    ModuloExpression(Expr l, Expr r) : l(std::move(l)), r(std::move(r)) {}
    double interpret(const Context& ctx) const override {
        double d = r->interpret(ctx);
        if (d == 0) throw std::runtime_error("Division by zero");
        return std::fmod(l->interpret(ctx), d);
    }
    std::string display() const override { return "(" + l->display() + " % " + r->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerExpression        _power rule  (** / x^y)
// ═════════════════════════════════════════════════════════════

class PowerExpression : public Expression {
    Expr base, exp;
public:
    PowerExpression(Expr b, Expr e) : base(std::move(b)), exp(std::move(e)) {}
    double interpret(const Context& ctx) const override { return std::pow(base->interpret(ctx), exp->interpret(ctx)); }
    std::string display() const override { return "(" + base->display() + " ** " + exp->display() + ")"; }
};


// SECTION:: Unary Nonterminal Expressions
// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: NegateExpression       _function rule  (neg)
// ═════════════════════════════════════════════════════════════

class NegateExpression : public Expression {
    Expr child;
public:
    explicit NegateExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override { return -child->interpret(ctx); }
    std::string display() const override { return "(-" + child->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: AbsExpression          _function rule  (abs)
// ═════════════════════════════════════════════════════════════

class AbsExpression : public Expression {
    Expr child;
public:
    explicit AbsExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override { return std::abs(child->interpret(ctx)); }
    std::string display() const override { return "abs(" + child->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: SqrtExpression         _function rule  (sqrt)
// ═════════════════════════════════════════════════════════════

class SqrtExpression : public Expression {
    Expr child;
public:
    explicit SqrtExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override {
        double v = child->interpret(ctx);
        if (v < 0) throw std::runtime_error("Square root of negative number");
        return std::sqrt(v);
    }
    std::string display() const override { return "sqrt(" + child->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: InverseExpression      _function rule  (1/x)
// ═════════════════════════════════════════════════════════════

class InverseExpression : public Expression {
    Expr child;
public:
    explicit InverseExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override {
        double v = child->interpret(ctx);
        if (v == 0) throw std::runtime_error("Division by zero");
        return 1.0 / v;
    }
    std::string display() const override { return "(1 / " + child->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: FactorialExpression    _function rule  (n!)
// ═════════════════════════════════════════════════════════════

class FactorialExpression : public Expression {
    Expr child;
public:
    explicit FactorialExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override {
        int n = static_cast<int>(std::round(child->interpret(ctx)));
        if (n < 0) throw std::runtime_error("Factorial of negative number");
        double result = 1;
        for (int i = 2; i <= n; i++) result *= i;
        return result;
    }
    std::string display() const override { return "(" + child->display() + "!)"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: PowerOfTenExpression   _function rule  (10^y)
// ═════════════════════════════════════════════════════════════

class PowerOfTenExpression : public Expression {
    Expr exp;
public:
    explicit PowerOfTenExpression(Expr e) : exp(std::move(e)) {}
    double interpret(const Context& ctx) const override { return std::pow(10.0, exp->interpret(ctx)); }
    std::string display() const override { return "(10 ** " + exp->display() + ")"; }
};


// ═════════════════════════════════════════════════════════════
//  NONTERMINAL: LogExpression          _function rule  (log)
// ═════════════════════════════════════════════════════════════

class LogExpression : public Expression {
    Expr child;
public:
    explicit LogExpression(Expr c) : child(std::move(c)) {}
    double interpret(const Context& ctx) const override {
        double v = child->interpret(ctx);
        if (v <= 0) throw std::runtime_error("Logarithm of non-positive number");
        return std::log10(v);
    }
    std::string display() const override { return "log(" + child->display() + ")"; }
};


// ── Helper factory functions ──────────────────────────────────
Expr num(double v)             { return std::make_shared<NumberExpression>(v); }
Expr var(const std::string& n) { return std::make_shared<VariableExpression>(n); }
Expr add(Expr l, Expr r)       { return std::make_shared<AddExpression>(std::move(l), std::move(r)); }
Expr sub(Expr l, Expr r)       { return std::make_shared<SubtractExpression>(std::move(l), std::move(r)); }
Expr mul(Expr l, Expr r)       { return std::make_shared<MultiplyExpression>(std::move(l), std::move(r)); }
Expr div_(Expr l, Expr r)      { return std::make_shared<DivideExpression>(std::move(l), std::move(r)); }
Expr fdiv(Expr l, Expr r)      { return std::make_shared<FloorDivideExpression>(std::move(l), std::move(r)); }
Expr mod(Expr l, Expr r)       { return std::make_shared<ModuloExpression>(std::move(l), std::move(r)); }
Expr pow_(Expr b, Expr e)      { return std::make_shared<PowerExpression>(std::move(b), std::move(e)); }
Expr neg(Expr c)               { return std::make_shared<NegateExpression>(std::move(c)); }
Expr abs_(Expr c)              { return std::make_shared<AbsExpression>(std::move(c)); }
Expr sqrt_(Expr c)             { return std::make_shared<SqrtExpression>(std::move(c)); }
Expr inv(Expr c)               { return std::make_shared<InverseExpression>(std::move(c)); }
Expr fact(Expr c)              { return std::make_shared<FactorialExpression>(std::move(c)); }
Expr pow10(Expr e)             { return std::make_shared<PowerOfTenExpression>(std::move(e)); }
Expr log_(Expr c)              { return std::make_shared<LogExpression>(std::move(c)); }


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

#ifndef TESTING
int main() {
    std::string SEP;
    for (int i = 0; i < 64; i++) SEP += "\xe2\x95\x90";  // ═

    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║       Interpreter: Arithmetic Expression Evaluator           ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    auto a = var("a");
    auto b = var("b");

    // ── Example 1: basic arithmetic ──────────────────────────────
    auto expr1 = mul(add(num(3), num(4)), num(2));
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 1: Basic arithmetic  (3 + 4) * 2\n" << SEP << "\n";
    std::cout << "  Expression : " << expr1->display() << "\n";
    std::cout << "  Result     : " << static_cast<int>(expr1->interpret(Context{})) << "\n";

    // ── Example 2: floor divide and modulo ───────────────────────
    Context ctx2; ctx2.set("a", 17).set("b", 5);
    auto floorDiv = fdiv(a, b);
    auto modulo   = mod(a, b);
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 2: Floor divide and modulo   a=17, b=5\n" << SEP << "\n";
    std::cout << "  " << floorDiv->display() << "  ->  " << static_cast<int>(floorDiv->interpret(ctx2)) << "   (17 // 5)\n";
    std::cout << "  " << modulo->display()   << "    ->  " << static_cast<int>(modulo->interpret(ctx2))   << "    (17 % 5)\n";

    // ── Example 3: power ─────────────────────────────────────────
    Context ctx3; ctx3.set("a", 2).set("b", 10);
    auto power = pow_(a, b);
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 3: Power   a=2, b=10\n" << SEP << "\n";
    std::cout << "  " << power->display() << "  ->  " << static_cast<int>(power->interpret(ctx3)) << "\n";

    // ── Example 4: unary functions ───────────────────────────────
    Context ctx4; ctx4.set("a", 100).set("b", -9);
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 4: Unary functions   a=100, b=-9\n" << SEP << "\n";
    std::cout << "  sqrt(a)       ->  " << static_cast<int>(sqrt_(a)->interpret(ctx4)) << "\n";
    std::cout << "  abs(b)        ->  " << static_cast<int>(abs_(b)->interpret(ctx4))  << "\n";
    std::cout << "  neg(a)        ->  " << static_cast<int>(neg(a)->interpret(ctx4))   << "\n";
    std::cout << "  1/x (a)       ->  " << inv(a)->interpret(ctx4)                     << "\n";
    std::cout << "  log(a)        ->  " << static_cast<int>(log_(a)->interpret(ctx4))  << "\n";
    std::cout << "  10^b (abs(b)) ->  " << static_cast<int>(pow10(abs_(b))->interpret(ctx4)) << "\n";

    // ── Example 5: factorial ─────────────────────────────────────
    Context ctx5; ctx5.set("n", 6);
    auto n = var("n");
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 5: Factorial   n=6\n" << SEP << "\n";
    std::cout << "  " << fact(n)->display() << "  ->  " << static_cast<int>(fact(n)->interpret(ctx5)) << "\n";

    // ── Example 6: composition ───────────────────────────────────
    Context ctx6; ctx6.set("a", 7).set("b", 23);
    auto nested = sqrt_(abs_(sub(a, b)));
    std::cout << "\n" << SEP << "\n";
    std::cout << "  Example 6: Composed unary  sqrt(abs(a - b))   a=7, b=23\n" << SEP << "\n";
    std::cout << "  " << nested->display() << "  ->  " << static_cast<int>(nested->interpret(ctx6)) << "\n";

    std::cout << "\n" << SEP << "\n";
    std::cout << "  Grammar coverage: + - * / // % ** abs sqrt 1/x n! 10^y log neg\n";
    std::cout << "  Each operator and function is its own class.\n";
    std::cout << "  Trees compose freely: any node can nest inside any other.\n";
    std::cout << SEP << "\n";

    std::cout << "\n╔══════════════════════════════════════════════════════════════╗\n";
    std::cout <<   "║  Done                                                        ║\n";
    std::cout <<   "╚══════════════════════════════════════════════════════════════╝\n";

    return 0;
}
#endif // TESTING
