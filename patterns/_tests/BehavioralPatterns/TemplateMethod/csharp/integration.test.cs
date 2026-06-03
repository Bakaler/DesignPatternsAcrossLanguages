// ============================================================
//  Integration Tests — Template Method: Data Pipeline (C#)
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

public class TemplatePipelineIntegrationTests
{
    static List<string> Capture(Action fn) => CaptureHelper.Capture(fn);

    static readonly string[] Labels = { "[Extract]","[Transform]","[Validate]","[Load]","[Report]" };

    // ── CSV full run ──────────────────────────────────────────
    public class CsvFullRun
    {
        private readonly List<string> _lines = Capture(() => new CsvPipeline().Run());

        [Fact] public void All_Five_Labels_Present() {
            string out_ = string.Join("\n", _lines);
            foreach (var l in new[]{"[Extract]","[Transform]","[Validate]","[Load]","[Report]"})
                Assert.Contains(l, out_);
        }
        [Fact] public void Validate_Catches_Missing_Name() =>
            Assert.Contains(_lines, l => l.Contains("1 error(s)"));
        [Fact] public void Report_Shows_Warning() =>
            Assert.Contains(_lines, l => l.Contains("⚠") && l.Contains("name"));
        [Fact] public void Alice_And_Bob_In_Output() {
            string out_ = string.Join("\n", _lines);
            Assert.Contains("Alice", out_); Assert.Contains("Bob", out_);
        }
    }

    // ── JSON full run ─────────────────────────────────────────
    public class JsonFullRun
    {
        private readonly List<string> _lines = Capture(() => new JsonPipeline().Run());

        [Fact] public void All_Five_Labels_Present() {
            string out_ = string.Join("\n", _lines);
            foreach (var l in new[]{"[Extract]","[Transform]","[Validate]","[Load]","[Report]"})
                Assert.Contains(l, out_);
        }
        [Fact] public void No_Errors() =>
            Assert.Contains(_lines, l => l.Contains("0 error(s)"));
        [Fact] public void Coerced_Age_In_Output() =>
            Assert.Contains(_lines, l => l.Contains("age:31"));
        [Fact] public void All_Names_In_Output() {
            string out_ = string.Join("\n", _lines);
            foreach (var n in new[]{"Dave","Eve","Frank"}) Assert.Contains(n, out_);
        }
    }

    // ── XML full run ──────────────────────────────────────────
    public class XmlFullRun
    {
        private readonly List<string> _lines = Capture(() => new XmlPipeline().Run());

        [Fact] public void All_Five_Labels_Present() {
            string out_ = string.Join("\n", _lines);
            foreach (var l in new[]{"[Extract]","[Transform]","[Validate]","[Load]","[Report]"})
                Assert.Contains(l, out_);
        }
        [Fact] public void No_Errors() =>
            Assert.Contains(_lines, l => l.Contains("0 error(s)"));
        [Fact] public void Coerced_Bool_In_Output() {
            string out_ = string.Join("\n", _lines);
            Assert.Contains("active:True", out_); Assert.Contains("active:False", out_);
        }
        [Fact] public void Float_Score_In_Output() =>
            Assert.Contains(_lines, l => l.Contains("9.4"));
    }

    // ── Shared skeleton ───────────────────────────────────────
    public class SharedSkeleton
    {
        DataPipeline[] Pipes() => new DataPipeline[]{ new CsvPipeline(), new JsonPipeline(), new XmlPipeline() };

        [Fact] public void All_Pipelines_Share_Step_Labels() {
            foreach (var p in Pipes()) {
                string out_ = string.Join("\n", Capture(p.Run));
                foreach (var l in new[]{"[Extract]","[Transform]","[Validate]","[Load]","[Report]"})
                    Assert.Contains(l, out_);
            }
        }

        [Fact] public void Extract_Before_Transform_In_All() {
            foreach (var p in Pipes()) {
                string out_ = string.Join("\n", Capture(p.Run));
                Assert.True(out_.IndexOf("[Extract]") < out_.IndexOf("[Transform]"));
            }
        }

        [Fact] public void Validate_After_Transform_In_All() {
            foreach (var p in Pipes()) {
                string out_ = string.Join("\n", Capture(p.Run));
                Assert.True(out_.IndexOf("[Transform]") < out_.IndexOf("[Validate]"));
            }
        }

        [Fact] public void Report_Last_In_All() {
            foreach (var p in Pipes()) {
                string out_ = string.Join("\n", Capture(p.Run));
                Assert.True(out_.IndexOf("[Load]") < out_.IndexOf("[Report]"));
            }
        }
    }

    // ── Hook override ─────────────────────────────────────────
    public class HookOverride
    {
        sealed class SilentCsv : CsvPipeline {
            protected override void Report() => Console.WriteLine("  [Report]    suppressed");
        }

        [Fact] public void Overriding_Report_Only_Affects_Last_Step() {
            string out_ = string.Join("\n", Capture(() => new SilentCsv().Run()));
            Assert.Contains("suppressed", out_);
            Assert.DoesNotContain("No issues.", out_);
            Assert.Contains("[Extract]",  out_);
            Assert.Contains("[Validate]", out_);
        }
    }
}
