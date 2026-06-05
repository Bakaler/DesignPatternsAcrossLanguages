// ============================================================
//  Integration Tests — Template Method: Data Pipeline (Java)
//  Run: javac -cp .:junit-platform-console-standalone.jar integration.test.java && java ...
// ============================================================

import org.junit.jupiter.api.*;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class integration {

    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try { fn.run(); } finally { System.setOut(old); }
        return Arrays.asList(baos.toString().split("\\r?\\n"));
    }

    static final List<String> LABELS = List.of("[Extract]","[Transform]","[Validate]","[Load]","[Report]");

    @Nested
    class CsvFullRun {
        List<String> lines;
        @BeforeEach void setup() { lines = capture(() -> new CsvPipeline().run()); }

        @Test void all_five_labels_present() {
            String out = String.join("\n", lines);
            LABELS.forEach(l -> assertTrue(out.contains(l), "Missing: " + l));
        }
        @Test void validate_catches_missing_name() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("1 error(s)")));
        }
        @Test void report_shows_warning() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("!") && l.contains("name")));
        }
        @Test void alice_and_bob_in_output() {
            String out = String.join("\n", lines);
            assertTrue(out.contains("Alice")); assertTrue(out.contains("Bob"));
        }
    }

    @Nested
    class JsonFullRun {
        List<String> lines;
        @BeforeEach void setup() { lines = capture(() -> new JsonPipeline().run()); }

        @Test void all_five_labels_present() {
            String out = String.join("\n", lines);
            LABELS.forEach(l -> assertTrue(out.contains(l)));
        }
        @Test void no_errors() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("0 error(s)")));
        }
        @Test void nested_key_flattened() {
            assertTrue(String.join("\n", lines).contains("meta_role"));
        }
        @Test void coerced_age_in_output() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("age:31")));
        }
        @Test void all_names_in_output() {
            String out = String.join("\n", lines);
            for (String n : List.of("Dave","Eve","Frank")) assertTrue(out.contains(n));
        }
    }

    @Nested
    class XmlFullRun {
        List<String> lines;
        @BeforeEach void setup() { lines = capture(() -> new XmlPipeline().run()); }

        @Test void all_five_labels_present() {
            String out = String.join("\n", lines);
            LABELS.forEach(l -> assertTrue(out.contains(l)));
        }
        @Test void no_errors() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("0 error(s)")));
        }
        @Test void coerced_bool_in_output() {
            String out = String.join("\n", lines);
            assertTrue(out.contains("active:true")); assertTrue(out.contains("active:false"));
        }
        @Test void float_score_in_output() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("9.4")));
        }
    }

    @Nested
    class SharedSkeleton {
        @Test void all_pipelines_share_step_labels() {
            for (DataPipeline p : List.of(new CsvPipeline(), new JsonPipeline(), new XmlPipeline())) {
                String out = String.join("\n", capture(p::run));
                LABELS.forEach(l -> assertTrue(out.contains(l), p.name() + " missing " + l));
            }
        }

        @Test void extract_before_transform_in_all() {
            for (DataPipeline p : List.of(new CsvPipeline(), new JsonPipeline(), new XmlPipeline())) {
                String out = String.join("\n", capture(p::run));
                assertTrue(out.indexOf("[Extract]") < out.indexOf("[Transform]"));
            }
        }

        @Test void validate_after_transform_in_all() {
            for (DataPipeline p : List.of(new CsvPipeline(), new JsonPipeline(), new XmlPipeline())) {
                String out = String.join("\n", capture(p::run));
                assertTrue(out.indexOf("[Transform]") < out.indexOf("[Validate]"));
            }
        }

        @Test void report_last_in_all() {
            for (DataPipeline p : List.of(new CsvPipeline(), new JsonPipeline(), new XmlPipeline())) {
                String out = String.join("\n", capture(p::run));
                assertTrue(out.indexOf("[Load]") < out.indexOf("[Report]"));
            }
        }
    }
}
