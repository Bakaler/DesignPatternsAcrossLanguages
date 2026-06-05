// ============================================================
//  Unit Tests — Template Method: Data Pipeline (C#)
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

public static class CaptureHelper
{
    private static readonly object Lock = new object();

    public static List<string> Capture(Action fn)
    {
        lock (Lock) {
            var sb  = new System.Text.StringBuilder();
            var old = Console.Out;
            Console.SetOut(new StringWriter(sb));
            try { fn(); } finally { Console.SetOut(old); }
            return sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                .Select(l => l.TrimEnd('\r')).ToList();
        }
    }
}

public class TemplatePipelineUnitTests
{
    static List<string> Capture(Action fn) => CaptureHelper.Capture(fn);

    // Minimal concrete subclass for testing base behaviour
    sealed class SpyPipeline : DataPipeline
    {
        private readonly List<Dictionary<string, object?>> _recs;
        public SpyPipeline(List<Dictionary<string, object?>>? recs = null) =>
            _recs = recs ?? new();
        public override string Name => "TestPipe";
        public override void Extract()   { Records = new(_recs); }
        public override void Transform() { }
        public void RunValidate() { Validate(); }
        public void RunLoad()     { Load(); }
        public void RunReport()   { Report(); }
        public List<string> Errs  => Errors;
    }

    // ── Validate() ───────────────────────────────────────────
    public class ValidateTests
    {
        [Fact] public void Passes_Records_With_Id_And_Name()
        {
            var p = new SpyPipeline(new() { new() { ["id"]="1", ["name"]="Alice" } });
            p.Extract(); Capture(p.RunValidate);
            Assert.Empty(p.Errs);
        }

        [Fact] public void Catches_Missing_Name()
        {
            var p = new SpyPipeline(new() { new() { ["id"]="1", ["name"]=null } });
            p.Extract(); Capture(p.RunValidate);
            Assert.Contains(p.Errs, e => e.Contains("name"));
        }

        [Fact] public void Catches_Missing_Id()
        {
            var p = new SpyPipeline(new() { new() { ["id"]=null, ["name"]="Alice" } });
            p.Extract(); Capture(p.RunValidate);
            Assert.Contains(p.Errs, e => e.Contains("'id'"));
        }

        [Fact] public void Output_Contains_Records_Checked()
        {
            var p = new SpyPipeline(new() { new() { ["id"]="1", ["name"]="Alice" } });
            p.Extract();
            var lines = Capture(p.RunValidate);
            Assert.Contains(lines, l => l.Contains("records checked"));
        }
    }

    // ── Report() hook ────────────────────────────────────────
    public class ReportHookTests
    {
        [Fact] public void Prints_No_Issues_When_Clean()
        {
            var p = new SpyPipeline();
            p.Extract();
            string out_ = string.Join("\n", Capture(p.RunReport));
            Assert.Contains("No issues.", out_);
        }

        [Fact] public void Prints_Warning_When_Errors_Exist()
        {
            var p = new SpyPipeline();
            p.Extract();
            p.Errs.Add("row 0: missing required field 'name'");
            string out_ = string.Join("\n", Capture(p.RunReport));
            Assert.Contains("!", out_);
        }

        sealed class CustomCsv : CsvPipeline {
            protected override void Report() => Console.WriteLine("CUSTOM REPORT");
        }

        [Fact] public void Hook_Can_Be_Overridden()
        {
            string out_ = string.Join("\n", Capture(() => new CustomCsv().Run()));
            Assert.Contains("CUSTOM REPORT", out_);
            Assert.DoesNotContain("No issues.", out_);
        }
    }

    // ── CsvPipeline ──────────────────────────────────────────
    public class CsvTests
    {
        [Fact] public void Extract_Loads_Three_Records()
        {
            var p = new CsvPipeline();
            Capture(p.Extract_Public);
            Assert.Equal(3, p.Records.Count);
        }

        [Fact] public void Transform_Trims_Whitespace()
        {
            var p = new CsvPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            var names = p.Records.Select(r => r["name"]?.ToString()).ToList();
            Assert.Contains("Bob", names);
            Assert.DoesNotContain("  Bob  ", names);
        }

        [Fact] public void Transform_Nulls_Empty_String()
        {
            var p = new CsvPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Null(p.Records[2]["name"]);
        }
    }

    // ── JsonPipeline ─────────────────────────────────────────
    public class JsonTests
    {
        [Fact] public void Extract_Loads_Three_Records()
        {
            var p = new JsonPipeline();
            Capture(p.Extract_Public);
            Assert.Equal(3, p.Records.Count);
        }

        [Fact] public void Transform_Flattens_Nested()
        {
            var p = new JsonPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.True(p.Records[0].ContainsKey("meta_role"));
            Assert.False(p.Records[0].ContainsKey("meta"));
        }

        [Fact] public void Transform_Coerces_Numeric_String()
        {
            var p = new JsonPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Equal(31, p.Records[0]["age"]);
        }
    }

    // ── XmlPipeline ──────────────────────────────────────────
    public class XmlTests
    {
        [Fact] public void Extract_Loads_Three_Records()
        {
            var p = new XmlPipeline();
            Capture(p.Extract_Public);
            Assert.Equal(3, p.Records.Count);
        }

        [Fact] public void Transform_Coerces_Int()
        {
            var p = new XmlPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Equal(1, p.Records[0]["id"]);
        }

        [Fact] public void Transform_Coerces_Float()
        {
            var p = new XmlPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Equal(9.4, (double)p.Records[0]["score"]!, 3);
        }

        [Fact] public void Transform_Coerces_Bool_True()
        {
            var p = new XmlPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Equal(true, p.Records[0]["active"]);
        }

        [Fact] public void Transform_Coerces_Bool_False()
        {
            var p = new XmlPipeline();
            Capture(p.Extract_Public); Capture(p.Transform_Public);
            Assert.Equal(false, p.Records[1]["active"]);
        }
    }

    // ── Run() step order ─────────────────────────────────────
    public class RunOrderTests
    {
        sealed class OrderSpy : DataPipeline {
            public List<string> Order = new();
            public override string Name => "Spy";
            public override void Extract()           { Order.Add("extract"); Records = new() { new() {["id"]="1",["name"]="X"} }; }
            public override void Transform()         { Order.Add("transform"); }
            protected override void Validate()          { Order.Add("validate"); Errors.Clear(); }
            protected override void Load()              { Order.Add("load"); }
            protected override void Report()            { Order.Add("report"); }
        }

        [Fact] public void Calls_Steps_In_Correct_Order()
        {
            var spy = new OrderSpy();
            Capture(spy.Run);
            Assert.Equal(new[] { "extract","transform","validate","load","report" }, spy.Order);
        }
    }
}

// Public accessor extensions so tests can call protected pipeline methods
public static class PipelineTestExtensions {
    public static void Extract_Public(this CsvPipeline  p) => p.GetType().GetMethod("Extract",   System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
    public static void Transform_Public(this CsvPipeline p) => p.GetType().GetMethod("Transform", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
    public static void Extract_Public(this JsonPipeline  p) => p.GetType().GetMethod("Extract",   System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
    public static void Transform_Public(this JsonPipeline p) => p.GetType().GetMethod("Transform", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
    public static void Extract_Public(this XmlPipeline  p)  => p.GetType().GetMethod("Extract",   System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
    public static void Transform_Public(this XmlPipeline p) => p.GetType().GetMethod("Transform", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)!.Invoke(p, null);
}
