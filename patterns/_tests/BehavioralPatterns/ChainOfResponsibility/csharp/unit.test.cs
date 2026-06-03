// ============================================================
//  Unit Tests - Chain of Responsibility: Grammar Token Validator
//
//  What we test here:
//    Each handler claims exactly its own tokens
//    Each handler passes foreign tokens to the next link
//      (or returns null when it is the last link)
//    Context validation: trailing, ParenDepth, HasDecimal
//    SetNext() wiring and ToString() identity
//
//  Run: dotnet test
// ============================================================

using Xunit;
using System.Collections.Generic;


public class CoRUnitTests {

    static readonly ParseContext Empty      = new();
    static readonly ParseContext After5     = new("5");
    static readonly ParseContext AfterOpen  = new("(");
    static readonly ParseContext AfterClose = new(")", 0);


    // ── SolveHandler ──────────────────────────────────────────────
    [Fact] public void Solve_ClaimsEquals() {
        var h = new SolveHandler();
        Assert.Equal(("Solve","="), h.Handle("=", Empty));
    }

    [Fact] public void Solve_PassesPlus() {
        Assert.Null(new SolveHandler().Handle("+", Empty));
    }

    [Fact] public void Solve_PassesDigit() {
        Assert.Null(new SolveHandler().Handle("5", Empty));
    }

    [Fact] public void Solve_ToString() {
        Assert.Equal("SolveHandler", new SolveHandler().ToString());
    }


    // ── ExpHandler ────────────────────────────────────────────────
    [Fact] public void Exp_ClaimsPlusAfterDigit() {
        Assert.Equal(("Exp"," + "), new ExpHandler().Handle("+", After5));
    }

    [Fact] public void Exp_ClaimsMinusAfterDigit() {
        Assert.Equal(("Exp"," - "), new ExpHandler().Handle("-", After5));
    }

    [Fact] public void Exp_RejectsPlusAtStart() {
        Assert.Null(new ExpHandler().Handle("+", Empty));
    }

    [Fact] public void Exp_RejectsPlusAfterOpenParen() {
        Assert.Null(new ExpHandler().Handle("+", AfterOpen));
    }

    [Fact] public void Exp_RejectsPlusAfterOperator() {
        foreach (var op in CoRConstants.Operands) {
            var ctx = new ParseContext(op);
            Assert.Null(new ExpHandler().Handle("+", ctx));
        }
    }

    [Fact] public void Exp_PassesMultiply() {
        Assert.Null(new ExpHandler().Handle("*", After5));
    }

    [Fact] public void Exp_PassesDigit() {
        Assert.Null(new ExpHandler().Handle("7", After5));
    }


    // ── TermHandler ───────────────────────────────────────────────
    [Fact] public void Term_ClaimsMultiply()    { Assert.Equal(("Term"," * "),  new TermHandler().Handle("*",  After5)); }
    [Fact] public void Term_ClaimsDivide()      { Assert.Equal(("Term"," / "),  new TermHandler().Handle("/",  After5)); }
    [Fact] public void Term_ClaimsFloorDivide() { Assert.Equal(("Term"," // "), new TermHandler().Handle("//", After5)); }
    [Fact] public void Term_ClaimsModulo()      { Assert.Equal(("Term"," % "),  new TermHandler().Handle("%",  After5)); }

    [Fact] public void Term_DoesNotClaimPower() {
        Assert.Null(new TermHandler().Handle("**", After5));
    }

    [Fact] public void Term_RejectsMultiplyAtStart() {
        Assert.Null(new TermHandler().Handle("*", Empty));
    }

    [Fact] public void Term_RejectsMultiplyAfterOpenParen() {
        Assert.Null(new TermHandler().Handle("*", AfterOpen));
    }

    [Fact] public void Term_PassesPlus() {
        Assert.Null(new TermHandler().Handle("+", After5));
    }


    // ── PowerHandler ──────────────────────────────────────────────
    [Fact] public void Power_ClaimsPower() {
        Assert.Equal(("Power"," ** "), new PowerHandler().Handle("**", After5));
    }

    [Fact] public void Power_RejectsAtStart() {
        Assert.Null(new PowerHandler().Handle("**", Empty));
    }

    [Fact] public void Power_RejectsAfterOpenParen() {
        Assert.Null(new PowerHandler().Handle("**", AfterOpen));
    }

    [Fact] public void Power_PassesSingleStar() {
        Assert.Null(new PowerHandler().Handle("*", After5));
    }

    [Fact] public void Power_PassesDigit() {
        Assert.Null(new PowerHandler().Handle("3", After5));
    }


    // ── FactorHandler ─────────────────────────────────────────────
    [Fact] public void Factor_ClaimsOpenParenEmpty()     { Assert.Equal(("Factor","("), new FactorHandler().Handle("(", Empty)); }
    [Fact] public void Factor_ClaimsOpenParenAfterDigit() { Assert.Equal(("Factor","("), new FactorHandler().Handle("(", After5)); }
    [Fact] public void Factor_ClaimsOpenParenAfterOpen()  { Assert.Equal(("Factor","("), new FactorHandler().Handle("(", AfterOpen)); }

    [Fact] public void Factor_ClaimsCloseParen() {
        Assert.Equal(("Factor",")"), new FactorHandler().Handle(")", new ParseContext(null, 1)));
    }

    [Fact] public void Factor_ClaimsCloseParenNested() {
        Assert.Equal(("Factor",")"), new FactorHandler().Handle(")", new ParseContext(null, 3)));
    }

    [Fact] public void Factor_RejectsCloseWhenNoneOpen() {
        Assert.Null(new FactorHandler().Handle(")", new ParseContext(null, 0)));
    }

    [Fact] public void Factor_PassesDigit() {
        Assert.Null(new FactorHandler().Handle("5", After5));
    }

    [Fact] public void Factor_PassesOperator() {
        Assert.Null(new FactorHandler().Handle("+", After5));
    }


    // ── FunctionHandler ───────────────────────────────────────────
    [Fact] public void Function_ClaimsEachDefault() {
        var h = new FunctionHandler(CoRConstants.DefaultFunctions);
        foreach (var fn in CoRConstants.DefaultFunctions) {
            Assert.Equal(("Function", fn), h.Handle(fn, After5));
        }
    }

    [Fact] public void Function_PassesUnknown() {
        Assert.Null(new FunctionHandler(CoRConstants.DefaultFunctions).Handle("cbrt", After5));
    }

    [Fact] public void Function_PassesDigit() {
        Assert.Null(new FunctionHandler(CoRConstants.DefaultFunctions).Handle("3", After5));
    }

    [Fact] public void Function_CustomSet() {
        var h = new FunctionHandler(new HashSet<string>{"cbrt","exp"});
        Assert.Equal(("Function","cbrt"), h.Handle("cbrt", After5));
        Assert.Null(h.Handle("abs", After5));
    }


    // ── DigitHandler ──────────────────────────────────────────────
    [Fact] public void Digit_ClaimsEachDigit() {
        var h = new DigitHandler();
        for (char c = '0'; c <= '9'; c++) {
            var d = c.ToString();
            Assert.Equal(("Digit", d), h.Handle(d, Empty));
        }
    }

    [Fact] public void Digit_RejectsAfterCloseParen() {
        Assert.Null(new DigitHandler().Handle("5", AfterClose));
    }

    [Fact] public void Digit_ClaimsDecimalNoPrior() {
        Assert.Equal(("SoloDec","0."), new DigitHandler().Handle(".", Empty));
    }

    [Fact] public void Digit_RejectsSecondDecimal() {
        var ctx = new ParseContext("3", 0, true);
        Assert.Null(new DigitHandler().Handle(".", ctx));
    }

    [Fact] public void Digit_RejectsOperator() {
        Assert.Null(new DigitHandler().Handle("+", Empty));
    }

    [Fact] public void Digit_RejectsUnknownString() {
        Assert.Null(new DigitHandler().Handle("xyz", Empty));
    }


    // ── Chain wiring ──────────────────────────────────────────────
    [Fact] public void Chain_SetNextReturnsHandler() {
        var a = new SolveHandler();
        var b = new ExpHandler();
        Assert.Same(b, a.SetNext(b));
    }

    [Fact] public void Chain_TokenReachesNext() {
        var digit = new DigitHandler();
        var head  = new SolveHandler();
        head.SetNext(digit);
        Assert.Equal(("Digit","5"), head.Handle("5", Empty));
    }

    [Fact] public void Chain_RejectedWhenExhausted() {
        Assert.Null(new SolveHandler().Handle("xyz", Empty));
    }
}
