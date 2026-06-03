// ============================================================
//  Template Method: Data Pipeline
//  Run: javac java.java && java Main
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Class   DataPipeline
//  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
//  Client           Main
//
//  Template method: DataPipeline.run()
//  ────────────────────────────────────────────────────────
//  extract()    ← abstract    format-specific parsing
//  transform()  ← abstract    format-specific cleaning / shaping
//  validate()   ← concrete    shared: checks id + name present
//  load()       ← concrete    shared: prints formatted record table
//  report()     ← hook        default "no issues"; override for custom warnings
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Code reuse          validate() and load() written once, used by all
//  ✓ Enforced sequence   run() is the skeleton; steps cannot be reordered
//  ✓ Hollywood principle base calls subclass, not the other way around
//  ✗ Inheritance lock    a new required step touches the base class
// ============================================================

import java.util.*;
import java.io.*;
import java.util.regex.*;


// SECTION:: Abstract Pipeline
// ═════════════════════════════════════════════════════════════
//  ABSTRACT CLASS: DataPipeline
// ═════════════════════════════════════════════════════════════
//  Defines the template method run() and the step contracts.
//  extract() and transform() are abstract; subclasses must implement them.
//  validate() and load() are concrete; written once and shared by all.
//  report() is a hook with a default implementation; subclasses may override.

abstract class DataPipeline {

    protected List<Map<String, Object>> records = new ArrayList<>();
    protected List<String>              errors  = new ArrayList<>();

    public abstract String name();

    protected abstract void extract();
    protected abstract void transform();

    // Template method — final. Do not override in subclasses.
    // Defines the invariant sequence: extract → transform → validate → load → report
    public final void run() {
        System.out.println("\n  Pipeline : " + name());
        System.out.println("  " + "─".repeat(52));
        extract();
        transform();
        validate();
        load();
        report();
    }

    // Concrete steps — shared logic; never overridden.
    protected void validate() {
        errors.clear();
        Set<Integer> errorRows = new HashSet<>();
        for (int i = 0; i < records.size(); i++) {
            Map<String, Object> rec = records.get(i);
            Object id   = rec.get("id");
            Object name = rec.get("name");
            if (id == null || id.toString().isBlank()) {
                errors.add("row " + i + ": missing required field 'id'");
                errorRows.add(i);
            }
            if (name == null || name.toString().isBlank()) {
                errors.add("row " + i + ": missing required field 'name'");
                errorRows.add(i);
            }
        }
        int passed = records.size() - errorRows.size();
        System.out.println("  [Validate]  " + records.size() + " records checked: "
                         + passed + " passed, " + errorRows.size() + " error(s)");
    }

    protected void load() {
        System.out.println("  [Load]      writing " + records.size() + " record(s)");
        for (Map<String, Object> rec : records) {
            StringJoiner sj = new StringJoiner("  ");
            rec.forEach((k, v) -> sj.add(k + ":" + v));
            System.out.println("              " + sj);
        }
    }

    // Hook — default handles errors; subclasses may override for custom messaging.
    protected void report() {
        if (!errors.isEmpty()) {
            for (String e : errors) System.out.println("  [Report]  ⚠  " + e);
        } else {
            System.out.println("  [Report]    Pipeline complete. No issues.");
        }
    }

    // Helper: build a LinkedHashMap from alternating key/value pairs
    protected static Map<String, Object> row(Object... pairs) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) m.put((String) pairs[i], pairs[i + 1]);
        return m;
    }
}


// SECTION:: CSV Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: CsvPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : split CSV source into header + data rows
//  transform: trim whitespace; empty string → null

class CsvPipeline extends DataPipeline {

    private static final String CSV_SOURCE =
        "id,name,age,city\n" +
        "1,Alice,30,London\n" +
        "2,  Bob  ,25,  New York\n" +
        "3,,28,Paris";
    // Row 3 has no name; will be caught by validate()

    @Override public String name() { return "CSV Data Pipeline"; }

    @Override
    protected void extract() {
        String[] lines   = CSV_SOURCE.split("\n");
        String[] headers = lines[0].split(",", -1);
        records.clear();
        for (int i = 1; i < lines.length; i++) {
            String[] vals = lines[i].split(",", -1);
            Map<String, Object> rec = new LinkedHashMap<>();
            for (int j = 0; j < headers.length; j++) {
                rec.put(headers[j], j < vals.length ? vals[j] : "");
            }
            records.add(rec);
        }
        System.out.println("  [Extract]   " + records.size() + " raw rows parsed from CSV source");
    }

    @Override
    protected void transform() {
        for (Map<String, Object> rec : records) {
            for (String key : rec.keySet()) {
                String stripped = rec.get(key).toString().strip();
                rec.put(key, stripped.isEmpty() ? null : stripped);
            }
        }
        System.out.println("  [Transform] whitespace trimmed · empty strings → null");
    }
}


// SECTION:: JSON Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: JsonPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : naive JSON array parser (no external deps)
//  transform: flatten nested objects (meta.role → meta_role)
//             coerce numeric strings to Integer or Double

class JsonPipeline extends DataPipeline {

    private static final String JSON_SOURCE =
        "[{\"id\":1,\"name\":\"Dave\",\"age\":\"31\",\"meta\":{\"role\":\"admin\",\"level\":3}}," +
         "{\"id\":2,\"name\":\"Eve\",\"age\":\"27\",\"meta\":{\"role\":\"user\",\"level\":1}}," +
         "{\"id\":3,\"name\":\"Frank\",\"age\":\"35\",\"meta\":{\"role\":\"mod\",\"level\":2}}]";

    @Override public String name() { return "JSON Data Pipeline"; }

    @Override
    protected void extract() {
        // Minimal parser for this known flat+nested structure
        records.clear();
        Pattern objPat   = Pattern.compile("\\{([^{}]+(?:\\{[^{}]*\\}[^{}]*)*)\\}");
        Pattern kvPat    = Pattern.compile("\"(\\w+)\"\\s*:\\s*(\\{[^}]+\\}|\"[^\"]*\"|\\d+)");
        Matcher objMatch = objPat.matcher(JSON_SOURCE);
        while (objMatch.find()) {
            Map<String, Object> rec = new LinkedHashMap<>();
            Matcher kv = kvPat.matcher(objMatch.group(1));
            while (kv.find()) {
                String key = kv.group(1);
                String val = kv.group(2);
                if (val.startsWith("{")) {
                    // nested object — store as placeholder for transform
                    rec.put(key, val);
                } else if (val.startsWith("\"")) {
                    rec.put(key, val.substring(1, val.length() - 1));
                } else {
                    try { rec.put(key, Integer.parseInt(val)); }
                    catch (NumberFormatException e) { rec.put(key, val); }
                }
            }
            records.add(rec);
        }
        System.out.println("  [Extract]   " + records.size() + " objects parsed from JSON array");
    }

    @Override
    protected void transform() {
        Pattern kvPat = Pattern.compile("\"(\\w+)\"\\s*:\\s*(\"[^\"]*\"|\\d+)");
        List<Map<String, Object>> flat = new ArrayList<>();
        for (Map<String, Object> rec : records) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rec.entrySet()) {
                String k = entry.getKey();
                Object v = entry.getValue();
                if (v instanceof String s && s.startsWith("{")) {
                    // flatten nested JSON object
                    Matcher m = kvPat.matcher(s);
                    while (m.find()) {
                        String nv = m.group(2);
                        Object coerced;
                        if (nv.startsWith("\"")) coerced = nv.substring(1, nv.length() - 1);
                        else { try { coerced = Integer.parseInt(nv); } catch (NumberFormatException e) { coerced = nv; } }
                        out.put(k + "_" + m.group(1), coerced);
                    }
                } else {
                    out.put(k, coerce(v));
                }
            }
            flat.add(out);
        }
        records = flat;
        System.out.println("  [Transform] nested keys flattened · numeric strings coerced");
    }

    private Object coerce(Object v) {
        if (!(v instanceof String s)) return v;
        try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
        try { return Double.parseDouble(s); } catch (NumberFormatException ignored) {}
        return v;
    }
}


// SECTION:: XML Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: XmlPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : parse <record> elements, preserving type attributes
//  transform: strip type metadata; coerce values (int/float/bool/string)

class XmlPipeline extends DataPipeline {

    private static final String XML_SOURCE =
        "<records>" +
        "<record><id type=\"int\">1</id><name type=\"string\">Grace</name>" +
        "<active type=\"bool\">true</active><score type=\"float\">9.4</score></record>" +
        "<record><id type=\"int\">2</id><name type=\"string\">Henry</name>" +
        "<active type=\"bool\">false</active><score type=\"float\">7.8</score></record>" +
        "<record><id type=\"int\">3</id><name type=\"string\">Isla</name>" +
        "<active type=\"bool\">true</active><score type=\"float\">8.9</score></record>" +
        "</records>";

    @Override public String name() { return "XML Data Pipeline"; }

    @Override
    protected void extract() {
        records.clear();
        Pattern recPat   = Pattern.compile("<record>(.*?)</record>");
        Pattern fieldPat = Pattern.compile("<(\\w+)\\s+type=\"(\\w+)\">(.*?)</\\1>");
        Matcher recM = recPat.matcher(XML_SOURCE);
        while (recM.find()) {
            Map<String, Object> rec = new LinkedHashMap<>();
            Matcher fieldM = fieldPat.matcher(recM.group(1));
            while (fieldM.find()) {
                // store as {type, val} map for transform
                Map<String, String> meta = new LinkedHashMap<>();
                meta.put("_type", fieldM.group(2));
                meta.put("_val",  fieldM.group(3));
                rec.put(fieldM.group(1), meta);
            }
            records.add(rec);
        }
        System.out.println("  [Extract]   " + records.size() + " <record> elements parsed from XML");
    }

    @Override
    @SuppressWarnings("unchecked")
    protected void transform() {
        for (Map<String, Object> rec : records) {
            for (String key : rec.keySet()) {
                Map<String, String> meta = (Map<String, String>) rec.get(key);
                rec.put(key, coerce(meta.get("_type"), meta.get("_val")));
            }
        }
        System.out.println("  [Transform] type attrs stripped · values coerced (int/float/bool)");
    }

    private Object coerce(String type, String val) {
        return switch (type) {
            case "int"    -> Integer.parseInt(val);
            case "float"  -> Double.parseDouble(val);
            case "bool"   -> val.strip().equalsIgnoreCase("true");
            default       -> val;
        };
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

class Main {
    private static final String SEP = "═".repeat(64);

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║       Template Method: Data Pipeline                         ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        System.out.println("\n" + SEP);
        System.out.println("  Three pipelines, same skeleton, different formats");
        System.out.println(SEP);

        List<DataPipeline> pipelines = List.of(new CsvPipeline(), new JsonPipeline(), new XmlPipeline());
        for (DataPipeline p : pipelines) p.run();

        System.out.println("\n" + SEP);
        System.out.println("  The template method in action:");
        System.out.println("    Every pipeline ran: extract → transform → validate → load → report");
        System.out.println("    validate() and load() are identical across all three; written once.");
        System.out.println("    Only extract() and transform() differed per format.");
        System.out.println(SEP);

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}
