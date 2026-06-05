// ============================================================
//  Template Method: Data Pipeline
//  Run: dotnet script csharp.cs
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Class   DataPipeline
//  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
//  Client           Entry point
//
//  Template method: DataPipeline.Run()
//  ────────────────────────────────────────────────────────
//  Extract()    ← abstract    format-specific parsing
//  Transform()  ← abstract    format-specific cleaning / shaping
//  Validate()   ← concrete    shared: checks id + name present
//  Load()       ← concrete    shared: prints formatted record table
//  Report()     ← hook        default "no issues"; override for custom warnings
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Code reuse          Validate() and Load() written once, used by all
//  ✓ Enforced sequence   Run() is the skeleton; steps cannot be reordered
//  ✓ Hollywood principle base calls subclass, not the other way around
//  ✗ Inheritance lock    a new required step touches the base class
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Xml.Linq;


// SECTION:: Abstract Pipeline
// ═════════════════════════════════════════════════════════════
//  ABSTRACT CLASS: DataPipeline
// ═════════════════════════════════════════════════════════════
//  Defines the template method Run() and the step contracts.
//  Extract() and Transform() are abstract; subclasses must implement them.
//  Validate() and Load() are concrete; written once and shared by all.
//  Report() is a hook with a default implementation; subclasses may override.

public abstract class DataPipeline {

    public List<Dictionary<string, object?>> Records = new();
    public List<string>                      Errors  = new();

    public abstract string Name { get; }
    public abstract void Extract();
    public abstract void Transform();

    // Template method. Defines the invariant sequence: Extract → Transform → Validate → Load → Report
    public void Run() {
        Console.WriteLine($"\n  Pipeline : {Name}");
        Console.WriteLine("  " + new string('─', 52));
        Extract();
        Transform();
        Validate();
        Load();
        Report();
    }

    // Concrete steps — shared logic; never overridden.
    protected virtual void Validate() {
        Errors.Clear();
        var errorRows = new HashSet<int>();
        for (int i = 0; i < Records.Count; i++) {
            var rec  = Records[i];
            bool noId   = !rec.TryGetValue("id",   out var id)   || id   == null || id.ToString()!.Trim()   == "";
            bool noName = !rec.TryGetValue("name", out var name) || name == null || name.ToString()!.Trim() == "";
            if (noId)   { Errors.Add($"row {i}: missing required field 'id'");   errorRows.Add(i); }
            if (noName) { Errors.Add($"row {i}: missing required field 'name'"); errorRows.Add(i); }
        }
        int passed = Records.Count - errorRows.Count;
        Console.WriteLine($"  [Validate]  {Records.Count} records checked: {passed} passed, {errorRows.Count} error(s)");
    }

    protected virtual void Load() {
        Console.WriteLine($"  [Load]      writing {Records.Count} record(s)");
        foreach (var rec in Records) {
            var pairs = string.Join("  ", rec.Select(kv => $"{kv.Key}:{kv.Value}"));
            Console.WriteLine($"              {pairs}");
        }
    }

    // Hook — default handles errors; subclasses may override for custom messaging.
    protected virtual void Report() {
        if (Errors.Count > 0)
            foreach (var e in Errors) Console.WriteLine($"  [Report]  !  {e}");
        else
            Console.WriteLine("  [Report]    Pipeline complete. No issues.");
    }
}


// SECTION:: CSV Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: CsvPipeline
// ═════════════════════════════════════════════════════════════
//  Extract  : split CSV source into header + data rows
//  Transform: trim whitespace; empty string → null

public class CsvPipeline : DataPipeline {

    private const string CsvSource =
        "id,name,age,city\n" +
        "1,Alice,30,London\n" +
        "2,  Bob  ,25,  New York\n" +
        "3,,28,Paris";
    // Row 3 has no name; will be caught by Validate()

    public override string Name => "CSV Data Pipeline";

    public override void Extract() {
        var lines   = CsvSource.Split('\n');
        var headers = lines[0].Split(',');
        Records.Clear();
        foreach (var line in lines.Skip(1)) {
            var vals = line.Split(',');
            var rec  = new Dictionary<string, object?>();
            for (int i = 0; i < headers.Length; i++)
                rec[headers[i]] = i < vals.Length ? vals[i] : "";
            Records.Add(rec);
        }
        Console.WriteLine($"  [Extract]   {Records.Count} raw rows parsed from CSV source");
    }

    public override void Transform() {
        foreach (var rec in Records)
            foreach (var key in rec.Keys.ToList()) {
                var stripped = rec[key]?.ToString()?.Trim() ?? "";
                rec[key] = stripped == "" ? null : stripped;
            }
        Console.WriteLine("  [Transform] whitespace trimmed · empty strings → null");
    }
}


// SECTION:: JSON Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: JsonPipeline
// ═════════════════════════════════════════════════════════════
//  Extract  : naive JSON array parser (no external deps)
//  Transform: flatten nested objects (meta.role → meta_role)
//             coerce numeric strings to int or double

public class JsonPipeline : DataPipeline {

    private const string JsonSource =
        "[{\"id\":1,\"name\":\"Dave\",\"age\":\"31\",\"meta\":{\"role\":\"admin\",\"level\":3}}," +
         "{\"id\":2,\"name\":\"Eve\",\"age\":\"27\",\"meta\":{\"role\":\"user\",\"level\":1}}," +
         "{\"id\":3,\"name\":\"Frank\",\"age\":\"35\",\"meta\":{\"role\":\"mod\",\"level\":2}}]";

    public override string Name => "JSON Data Pipeline";

    public override void Extract() {
        Records.Clear();
        var objPat = new Regex(@"\{([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}");
        var kvPat  = new Regex(@"""(\w+)""\s*:\s*(\{[^}]+\}|""[^""]*""|\d+)");
        foreach (Match om in objPat.Matches(JsonSource)) {
            var rec = new Dictionary<string, object?>();
            foreach (Match kv in kvPat.Matches(om.Groups[1].Value)) {
                var val = kv.Groups[2].Value;
                if      (val.StartsWith("{"))  rec[kv.Groups[1].Value] = val;
                else if (val.StartsWith("\"")) rec[kv.Groups[1].Value] = val[1..^1];
                else if (int.TryParse(val, out int n)) rec[kv.Groups[1].Value] = n;
                else    rec[kv.Groups[1].Value] = val;
            }
            Records.Add(rec);
        }
        Console.WriteLine($"  [Extract]   {Records.Count} objects parsed from JSON array");
    }

    public override void Transform() {
        var kvPat = new Regex(@"""(\w+)""\s*:\s*(""[^""]*""|\d+)");
        var flat  = new List<Dictionary<string, object?>>();
        foreach (var rec in Records) {
            var out_ = new Dictionary<string, object?>();
            foreach (var kv in rec) {
                if (kv.Value is string s && s.StartsWith("{")) {
                    foreach (Match m in kvPat.Matches(s)) {
                        var nv = m.Groups[2].Value;
                        object? coerced = nv.StartsWith("\"") ? nv[1..^1]
                                        : int.TryParse(nv, out int ni) ? ni : nv;
                        out_[$"{kv.Key}_{m.Groups[1].Value}"] = coerced;
                    }
                } else {
                    out_[kv.Key] = Coerce(kv.Value);
                }
            }
            flat.Add(out_);
        }
        Records = flat;
        Console.WriteLine("  [Transform] nested keys flattened · numeric strings coerced");
    }

    private static object? Coerce(object? v) {
        if (v is not string s) return v;
        if (int.TryParse(s,    out int    i)) return i;
        if (double.TryParse(s, out double d)) return d;
        return v;
    }
}


// SECTION:: XML Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: XmlPipeline
// ═════════════════════════════════════════════════════════════
//  Extract  : parse <record> elements via XDocument, preserving type attributes
//  Transform: strip type metadata; coerce values (int/float/bool/string)

public class XmlPipeline : DataPipeline {

    private const string XmlSource = @"<records>
  <record>
    <id type=""int"">1</id><name type=""string"">Grace</name>
    <active type=""bool"">true</active><score type=""float"">9.4</score>
  </record>
  <record>
    <id type=""int"">2</id><name type=""string"">Henry</name>
    <active type=""bool"">false</active><score type=""float"">7.8</score>
  </record>
  <record>
    <id type=""int"">3</id><name type=""string"">Isla</name>
    <active type=""bool"">true</active><score type=""float"">8.9</score>
  </record>
</records>";

    public override string Name => "XML Data Pipeline";

    public override void Extract() {
        Records.Clear();
        var doc = XDocument.Parse(XmlSource);
        foreach (var elem in doc.Root!.Elements("record")) {
            var rec = new Dictionary<string, object?>();
            foreach (var child in elem.Elements()) {
                rec[child.Name.LocalName] = new Dictionary<string, string> {
                    ["_type"] = child.Attribute("type")?.Value ?? "string",
                    ["_val"]  = child.Value
                };
            }
            Records.Add(rec);
        }
        Console.WriteLine($"  [Extract]   {Records.Count} <record> elements parsed from XML");
    }

    public override void Transform() {
        foreach (var rec in Records)
            foreach (var key in rec.Keys.ToList()) {
                var meta = (Dictionary<string, string>)rec[key]!;
                rec[key] = CoerceXml(meta["_type"], meta["_val"]);
            }
        Console.WriteLine("  [Transform] type attrs stripped · values coerced (int/float/bool)");
    }

    private static object CoerceXml(string type, string val) => type switch {
        "int"   => int.Parse(val),
        "float" => double.Parse(val),
        "bool"  => val.Trim().ToLower() == "true",
        _       => val,
    };
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
#if !TESTING

var SEP = new string('═', 64);

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║       Template Method: Data Pipeline                         ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Three pipelines, same skeleton, different formats");
Console.WriteLine(SEP);

foreach (var pipeline in new DataPipeline[] { new CsvPipeline(), new JsonPipeline(), new XmlPipeline() })
    pipeline.Run();

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  The template method in action:");
Console.WriteLine("    Every pipeline ran: Extract → Transform → Validate → Load → Report");
Console.WriteLine("    Validate() and Load() are identical across all three; written once.");
Console.WriteLine("    Only Extract() and Transform() differed per format.");
Console.WriteLine(SEP);

Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Done                                                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
#endif // !TESTING
