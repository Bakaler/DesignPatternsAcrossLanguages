// ============================================================
//  Integration Tests - Chain of Responsibility: Grammar Token Validator
//
//  What we test here:
//    Full token sequences accepted or rejected end-to-end
//    Invalid sequences fail at the correct chain link
//    Every token type correctly classified in a realistic equation
//    Chain extension does not break existing behaviour
//    Paren depth and decimal flags interact correctly
//
//  Pipeline tests:
//    CoR chain + TreeBuilder + Interpreter evaluate end-to-end
//    Operator precedence is respected through tree shape
//    Grouping with parentheses overrides precedence
//    Unary prefix functions nest correctly
//    Invalid token sequences raise ArgumentException
//
//  Run: dotnet test
// ============================================================

using Xunit;
using System;
using System.Collections.Generic;
using System.Linq;


public class CoRIntegrationTests {

    // ── Helper: feed tokens through chain ────────────────────────
    static List<(string, string)?> Feed(Handler chain, IList<string> tokens) {
        var results = new List<(string, string)?>();
        var ctx = new ParseContext();

        foreach (var tok in tokens) {
            var result = chain.Handle(tok, ctx);
            results.Add(result);
            if (result is null) break;

            var tokenType  = result.Value.Item1;
            var parenDepth = ctx.ParenDepth;
            var hasDecimal = ctx.HasDecimal;

            if      (tok == "(") { parenDepth++; hasDecimal = false; }
            else if (tok == ")") { parenDepth--; }
            else if (tokenType is "Exp" or "Term" or "Power") { hasDecimal = false; }
            else if (tok == ".") { hasDecimal = true; }

            ctx = new ParseContext(tok, parenDepth, hasDecimal);
        }
        return results;
    }

    static List<string?> Types(List<(string,string)?> r) =>
        r.Select(x => x?.Item1).ToList();

    Context Ctx = new Context();

    double Eval(IList<string> tokens) =>
        PipelineHelper.ParseAndBuild(tokens).Interpret(Ctx);


    // ── Valid sequences ──────────────────────────────────────────
    [Fact] public void Valid_SimpleAddition() {
        Assert.Equal(new[]{"Digit","Exp","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"5","+","3","="})));
    }

    [Fact] public void Valid_OrderOfOperations() {
        Assert.Equal(new[]{"Digit","Exp","Digit","Term","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"2","+","3","*","4","="})));
    }

    [Fact] public void Valid_Parenthesised() {
        Assert.Equal(new[]{"Factor","Digit","Exp","Digit","Factor","Term","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"(","6","-","2",")","*","3","="})));
    }

    [Fact] public void Valid_Power() {
        Assert.Equal(new[]{"Digit","Power","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"2","**","8","="})));
    }

    [Fact] public void Valid_FunctionWrapping() {
        Assert.Equal(new[]{"Function","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"abs","9","="})));
    }

    [Fact] public void Valid_NestedFunctions() {
        Assert.Equal(new[]{"Function","Function","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"neg","abs","7","="})));
    }

    [Fact] public void Valid_Decimal() {
        Assert.Equal(new[]{"Digit","SoloDec","Digit","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"3",".","1","4","="})));
    }

    [Fact] public void Valid_FloorDivide() {
        Assert.Equal(new[]{"Digit","Digit","Term","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"1","7","//","5","="})));
    }

    [Fact] public void Valid_Modulo() {
        Assert.Equal(new[]{"Digit","Digit","Term","Digit","Solve"},
            Types(Feed(ChainFactory.BuildChain(), new[]{"1","7","%","5","="})));
    }

    [Fact] public void Valid_Complex() {
        Assert.Equal(
            new[]{"Digit","Digit","Digit","Exp","Factor","Digit","Digit","Term","Digit","Factor","Solve"},
            Types(Feed(ChainFactory.BuildChain(),
                new[]{"2","3","4","+","(","1","2","/","3",")","="})));
    }

    [Fact] public void Valid_SolveOnly() {
        Assert.Equal(("Solve","="), ChainFactory.BuildChain().Handle("=", new ParseContext()));
    }


    // ── Invalid sequences ────────────────────────────────────────
    [Fact] public void Invalid_LeadingPlus() {
        Assert.Null(Feed(ChainFactory.BuildChain(), new[]{"+","5"})[0]);
    }

    [Fact] public void Invalid_DoubleOperator() {
        var r = Feed(ChainFactory.BuildChain(), new[]{"1","2","+","+"});
        Assert.NotNull(r[0]);
        Assert.Null(r[3]);
    }

    [Fact] public void Invalid_OperatorAfterOpenParen() {
        Assert.Null(Feed(ChainFactory.BuildChain(), new[]{"(","+"}) [1]);
    }

    [Fact] public void Invalid_UnmatchedCloseParen() {
        Assert.Null(ChainFactory.BuildChain().Handle(")", new ParseContext(null, 0)));
    }

    [Fact] public void Invalid_SecondDecimal() {
        Assert.Null(Feed(ChainFactory.BuildChain(), new[]{"1",".","5","."})[3]);
    }

    [Fact] public void Invalid_DigitAfterCloseParen() {
        Assert.Null(Feed(ChainFactory.BuildChain(), new[]{"(","3",")","5"})[3]);
    }

    [Fact] public void Invalid_UnknownToken() {
        Assert.Null(ChainFactory.BuildChain().Handle("xyz", new ParseContext("5")));
    }

    [Fact] public void Invalid_LeadingMultiply() {
        Assert.Null(ChainFactory.BuildChain().Handle("*", new ParseContext()));
    }


    // ── Processed token values ───────────────────────────────────
    [Fact] public void Processed_ExpSpaces() {
        Assert.Equal(" + ", ChainFactory.BuildChain().Handle("+", new ParseContext("5"))!.Value.Item2);
    }

    [Fact] public void Processed_TermSpaces() {
        Assert.Equal(" * ", ChainFactory.BuildChain().Handle("*", new ParseContext("3"))!.Value.Item2);
    }

    [Fact] public void Processed_PowerSpaces() {
        Assert.Equal(" ** ", ChainFactory.BuildChain().Handle("**", new ParseContext("2"))!.Value.Item2);
    }

    [Fact] public void Processed_FactorNoSpaces() {
        Assert.Equal("(", ChainFactory.BuildChain().Handle("(", new ParseContext())!.Value.Item2);
    }

    [Fact] public void Processed_SoloDecimal() {
        Assert.Equal("0.", ChainFactory.BuildChain().Handle(".", new ParseContext())!.Value.Item2);
    }

    [Fact] public void Processed_DigitAsIs() {
        Assert.Equal("7", ChainFactory.BuildChain().Handle("7", new ParseContext())!.Value.Item2);
    }


    // ── Chain extension ──────────────────────────────────────────
    [Fact] public void Extension_NewFunctionAccepted() {
        var fns = new HashSet<string>(CoRConstants.DefaultFunctions) { "cbrt" };
        var ext = ChainFactory.BuildChain(fns);
        Assert.Equal(("Function","cbrt"), ext.Handle("cbrt", new ParseContext("8")));
    }

    [Fact] public void Extension_NewFunctionRejectedInDefault() {
        Assert.Null(ChainFactory.BuildChain().Handle("cbrt", new ParseContext("8")));
    }

    [Fact] public void Extension_ExistingFunctionsStillWork() {
        var fns = new HashSet<string>(CoRConstants.DefaultFunctions) { "cbrt" };
        var ext = ChainFactory.BuildChain(fns);
        foreach (var fn in CoRConstants.DefaultFunctions) {
            Assert.Equal(("Function", fn), ext.Handle(fn, new ParseContext("5")));
        }
    }


    // ── Pipeline ─────────────────────────────────────────────────
    [Fact] public void Pipeline_SimpleAddition()    { Assert.Equal(7.0,  Eval(new[]{"3","+","4","="})); }
    [Fact] public void Pipeline_SimpleSubtraction() { Assert.Equal(5.0,  Eval(new[]{"9","-","4","="})); }
    [Fact] public void Pipeline_SimpleMultiply()    { Assert.Equal(42.0, Eval(new[]{"6","*","7","="})); }
    [Fact] public void Pipeline_SimpleDivide()      { Assert.Equal(2.0,  Eval(new[]{"8","/","4","="})); }

    [Fact] public void Pipeline_Precedence() {
        Assert.Equal(14.0, Eval(new[]{"2","+","3","*","4","="}));
    }

    [Fact] public void Pipeline_ParensOverride() {
        Assert.Equal(20.0, Eval(new[]{"(","2","+","3",")","*","4","="}));
    }

    [Fact] public void Pipeline_Power()       { Assert.Equal(256.0, Eval(new[]{"2","**","8","="})); }
    [Fact] public void Pipeline_FloorDivide() { Assert.Equal(3.0,   Eval(new[]{"1","7","//","5","="})); }
    [Fact] public void Pipeline_Modulo()      { Assert.Equal(2.0,   Eval(new[]{"1","7","%","5","="})); }
    [Fact] public void Pipeline_Sqrt()        { Assert.Equal(3.0,   Eval(new[]{"sqrt","9","="})); }

    [Fact] public void Pipeline_AbsNeg() {
        Assert.Equal(5.0, Eval(new[]{"abs","neg","5","="}));
    }

    [Fact] public void Pipeline_NestedUnary() {
        Assert.Equal(7.0, Eval(new[]{"abs","neg","abs","neg","7","="}));
    }

    [Fact] public void Pipeline_Pythagorean() {
        Assert.Equal(5.0, Eval(new[]{"sqrt","(","3","**","2","+","4","**","2",")","="}));
    }

    [Fact] public void Pipeline_MultidigitNumber() {
        Assert.Equal(234.0, Eval(new[]{"2","3","4","+","0","="}));
    }

    [Fact] public void Pipeline_Decimal() {
        Assert.Equal(3.14, Eval(new[]{"3",".","1","4","+","0","="}), 9);
    }

    [Fact] public void Pipeline_InvalidTokenRaises() {
        Assert.Throws<ArgumentException>(() => PipelineHelper.ParseAndBuild(new[]{"+","5"}));
    }

    [Fact] public void Pipeline_TreeStrReflectsStructure() {
        var tree = PipelineHelper.ParseAndBuild(new[]{"(","2","+","3",")","*","4","="});
        var s = tree.Display();
        Assert.Contains("*", s);
        Assert.Contains("+", s);
    }
}
