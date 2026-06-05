// ============================================================
//  Unit Tests — Template Method: Data Pipeline (Java)
//  Run: javac -cp .:junit-platform-console-standalone.jar unit.test.java && java ...
// ============================================================

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.Nested;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class unit {

    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try { fn.run(); } finally { System.setOut(old); }
        return Arrays.asList(baos.toString().split("\\r?\\n"));
    }

    // Minimal concrete pipeline for testing base behaviour
    static DataPipeline makePipeline(List<Map<String, Object>> recs) {
        return new DataPipeline() {
            @Override public String name() { return "TestPipe"; }
            @Override protected void extract()   { records = new ArrayList<>(recs); }
            @Override protected void transform() { }
            public void runValidate() { validate(); }
            public void runLoad()     { load(); }
            public void runReport()   { report(); }
        };
    }

    @Nested
    class ValidateTests {
        @Test void passes_records_with_id_and_name() {
            var p = makePipeline(List.of(Map.of("id","1","name","Alice")));
            capture(() -> ((DataPipeline)p).run());
            // run full to populate; just check errors empty after validate step
            var p2 = makePipeline(List.of(Map.of("id","1","name","Alice")));
            p2.extract(); capture(p2::validate);
            assertTrue(p2.errors.isEmpty());
        }

        @Test void catches_missing_name() {
            var rec = new LinkedHashMap<String, Object>();
            rec.put("id", "1"); rec.put("name", null);
            var p = makePipeline(List.of(rec));
            p.extract(); capture(p::validate);
            assertTrue(p.errors.stream().anyMatch(e -> e.contains("name")));
        }

        @Test void catches_missing_id() {
            var rec = new LinkedHashMap<String, Object>();
            rec.put("id", null); rec.put("name", "Alice");
            var p = makePipeline(List.of(rec));
            p.extract(); capture(p::validate);
            assertTrue(p.errors.stream().anyMatch(e -> e.contains("'id'")));
        }

        @Test void output_contains_records_checked() {
            var p = makePipeline(List.of(Map.of("id","1","name","Alice")));
            p.extract();
            var lines = capture(p::validate);
            assertTrue(lines.stream().anyMatch(l -> l.contains("records checked")));
        }
    }

    @Nested
    class ReportHookTests {
        @Test void prints_no_issues_when_clean() {
            var p = makePipeline(List.of());
            p.extract();
            String out = String.join("\n", capture(p::report));
            assertTrue(out.contains("No issues."));
        }

        @Test void prints_warning_when_errors_exist() {
            var p = makePipeline(List.of());
            p.extract();
            p.errors.add("row 0: missing required field 'name'");
            String out = String.join("\n", capture(p::report));
            assertTrue(out.contains("!"));
        }
    }

    @Nested
    class CsvPipelineTests {
        @Test void extract_loads_three_records() {
            var p = new CsvPipeline();
            capture(p::extract);
            assertEquals(3, p.records.size());
        }

        @Test void transform_trims_whitespace() {
            var p = new CsvPipeline();
            capture(p::extract); capture(p::transform);
            var names = p.records.stream().map(r -> String.valueOf(r.get("name"))).toList();
            assertTrue(names.contains("Bob"));
            assertFalse(names.stream().anyMatch(n -> n.contains("  Bob  ")));
        }

        @Test void transform_nulls_empty_string() {
            var p = new CsvPipeline();
            capture(p::extract); capture(p::transform);
            assertNull(p.records.get(2).get("name"));
        }
    }

    @Nested
    class JsonPipelineTests {
        @Test void extract_loads_three_records() {
            var p = new JsonPipeline();
            capture(p::extract);
            assertEquals(3, p.records.size());
        }

        @Test void transform_flattens_nested() {
            var p = new JsonPipeline();
            capture(p::extract); capture(p::transform);
            assertTrue(p.records.get(0).containsKey("meta_role"));
            assertFalse(p.records.get(0).containsKey("meta"));
        }

        @Test void transform_coerces_numeric_string() {
            var p = new JsonPipeline();
            capture(p::extract); capture(p::transform);
            assertEquals(31, p.records.get(0).get("age"));
        }
    }

    @Nested
    class XmlPipelineTests {
        @Test void extract_loads_three_records() {
            var p = new XmlPipeline();
            capture(p::extract);
            assertEquals(3, p.records.size());
        }

        @Test void transform_coerces_int() {
            var p = new XmlPipeline();
            capture(p::extract); capture(p::transform);
            assertEquals(1, p.records.get(0).get("id"));
        }

        @Test void transform_coerces_float() {
            var p = new XmlPipeline();
            capture(p::extract); capture(p::transform);
            assertEquals(9.4, (Double) p.records.get(0).get("score"), 0.001);
        }

        @Test void transform_coerces_bool_true() {
            var p = new XmlPipeline();
            capture(p::extract); capture(p::transform);
            assertEquals(true, p.records.get(0).get("active"));
        }

        @Test void transform_coerces_bool_false() {
            var p = new XmlPipeline();
            capture(p::extract); capture(p::transform);
            assertEquals(false, p.records.get(1).get("active"));
        }
    }

    @Nested
    class RunOrderTests {
        @Test void calls_steps_in_correct_order() {
            List<String> order = new ArrayList<>();
            DataPipeline spy = new DataPipeline() {
                @Override public String name() { return "Spy"; }
                @Override protected void extract()   { order.add("extract"); records = List.of(Map.of("id","1","name","X")); }
                @Override protected void transform() { order.add("transform"); }
                @Override protected void validate()  { order.add("validate"); errors = new ArrayList<>(); }
                @Override protected void load()      { order.add("load"); }
                @Override protected void report()    { order.add("report"); }
            };
            capture(spy::run);
            assertEquals(List.of("extract","transform","validate","load","report"), order);
        }
    }
}
