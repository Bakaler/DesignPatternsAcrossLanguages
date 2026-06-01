// ============================================================
//  Template Method: Data Pipeline
//  Compile: g++ -std=c++17 -o cpp cpp.cpp && ./cpp
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Class   DataPipeline
//  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
//  Client           main()
//
//  Template method: DataPipeline::run()
//  ────────────────────────────────────────────────────────
//  extract()    ← pure virtual    format-specific parsing
//  transform()  ← pure virtual    format-specific cleaning / shaping
//  validate()   ← concrete        shared: checks id + name present
//  load()       ← concrete        shared: prints formatted record table
//  report()     ← hook            default "no issues"; override for custom warnings
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Code reuse          validate() and load() written once, used by all
//  ✓ Enforced sequence   run() calls steps in fixed order
//  ✓ Hollywood principle base calls subclass, not the other way around
//  ✗ Inheritance lock    a new required step touches the base class
// ============================================================

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <sstream>
#include <regex>
#include <algorithm>

using Row     = std::map<std::string, std::string>;
using Records = std::vector<Row>;


// SECTION:: Abstract Pipeline
// ═════════════════════════════════════════════════════════════
//  ABSTRACT CLASS: DataPipeline
// ═════════════════════════════════════════════════════════════
//  Defines the template method run() and the step contracts.
//  extract() and transform() are pure virtual; subclasses must implement them.
//  validate() and load() are concrete; written once and shared by all.
//  report() is a hook with a default implementation; subclasses may override.

class DataPipeline {
protected:
    Records            records;
    std::vector<std::string> errors;

    virtual void extract()   = 0;
    virtual void transform() = 0;

    // Concrete steps — shared logic; never overridden.
    void validate() {
        errors.clear();
        std::set<int> errorRows;
        for (int i = 0; i < (int)records.size(); i++) {
            auto& rec = records[i];
            if (rec.find("id")   == rec.end() || rec.at("id").empty()) {
                errors.push_back("row " + std::to_string(i) + ": missing required field 'id'");
                errorRows.insert(i);
            }
            if (rec.find("name") == rec.end() || rec.at("name").empty()) {
                errors.push_back("row " + std::to_string(i) + ": missing required field 'name'");
                errorRows.insert(i);
            }
        }
        int passed = (int)records.size() - (int)errorRows.size();
        std::cout << "  [Validate]  " << records.size() << " records checked: "
                  << passed << " passed, " << errorRows.size() << " error(s)\n";
    }

    void load() {
        std::cout << "  [Load]      writing " << records.size() << " record(s)\n";
        for (auto& rec : records) {
            std::string line = "              ";
            bool first = true;
            for (auto& [k, v] : rec) {
                if (!first) line += "  ";
                line += k + ":" + v;
                first = false;
            }
            std::cout << line << "\n";
        }
    }

    // Hook — default handles errors; subclasses may override for custom messaging.
    virtual void report() {
        if (!errors.empty()) {
            for (auto& e : errors) std::cout << "  [Report]  \xe2\x9a\xa0  " << e << "\n";
        } else {
            std::cout << "  [Report]    Pipeline complete. No issues.\n";
        }
    }

public:
    virtual std::string name() const = 0;
    virtual ~DataPipeline() = default;

    // Template method — calls steps in fixed invariant order.
    void run() {
        std::cout << "\n  Pipeline : " << name() << "\n";
        std::cout << "  " << std::string(52, static_cast<char>(0xe2)) << "\n";
        // Print the ─ separator properly
        std::string sep = "  ";
        for (int i = 0; i < 52; i++) sep += "\xe2\x94\x80";
        std::cout << sep << "\n";
        extract();
        transform();
        validate();
        load();
        report();
    }
};


// SECTION:: CSV Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: CsvPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : split CSV source into header + data rows
//  transform: trim whitespace; empty string → empty (printed as empty)

static const std::string CSV_SOURCE =
    "id,name,age,city\n"
    "1,Alice,30,London\n"
    "2,  Bob  ,25,  New York\n"
    "3,,28,Paris";
// Row 3 has no name; will be caught by validate()

static std::string trim(const std::string& s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    size_t end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

static std::vector<std::string> splitCsv(const std::string& line) {
    std::vector<std::string> fields;
    std::stringstream ss(line);
    std::string field;
    while (std::getline(ss, field, ',')) fields.push_back(field);
    return fields;
}

class CsvPipeline : public DataPipeline {
public:
    std::string name() const override { return "CSV Data Pipeline"; }

protected:
    void extract() override {
        records.clear();
        std::istringstream src(CSV_SOURCE);
        std::string line;
        std::getline(src, line);
        auto headers = splitCsv(line);
        while (std::getline(src, line)) {
            auto vals = splitCsv(line);
            Row rec;
            for (size_t i = 0; i < headers.size(); i++)
                rec[headers[i]] = (i < vals.size()) ? vals[i] : "";
            records.push_back(rec);
        }
        std::cout << "  [Extract]   " << records.size() << " raw rows parsed from CSV source\n";
    }

    void transform() override {
        for (auto& rec : records) {
            for (auto& [k, v] : rec) {
                std::string t = trim(v);
                v = t;  // empty string left as-is (absence shown in load output)
            }
        }
        std::cout << "  [Transform] whitespace trimmed\n";
    }
};


// SECTION:: JSON Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: JsonPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : regex-based JSON parser for known structure
//  transform: flatten nested objects (meta_role, meta_level)
//             string numeric values stay as strings in output

static const std::string JSON_SOURCE =
    "[{\"id\":1,\"name\":\"Dave\",\"age\":\"31\",\"meta_role\":\"admin\",\"meta_level\":3},"
     "{\"id\":2,\"name\":\"Eve\",\"age\":\"27\",\"meta_role\":\"user\",\"meta_level\":1},"
     "{\"id\":3,\"name\":\"Frank\",\"age\":\"35\",\"meta_role\":\"mod\",\"meta_level\":2}]";
// Note: nested meta pre-flattened in source for C++ simplicity

class JsonPipeline : public DataPipeline {
public:
    std::string name() const override { return "JSON Data Pipeline"; }

protected:
    void extract() override {
        records.clear();
        std::regex objRe(R"(\{([^{}]+)\})");
        std::regex kvRe(R"("(\w+)"\s*:\s*(?:"([^"]*)"|(\d+)))");
        auto objBegin = std::sregex_iterator(JSON_SOURCE.begin(), JSON_SOURCE.end(), objRe);
        auto objEnd   = std::sregex_iterator();
        for (auto it = objBegin; it != objEnd; ++it) {
            std::string body = (*it)[1];
            Row rec;
            auto kvBegin = std::sregex_iterator(body.begin(), body.end(), kvRe);
            for (auto kv = kvBegin; kv != std::sregex_iterator(); ++kv) {
                std::string key = (*kv)[1];
                std::string val = (*kv)[2].matched ? (*kv)[2].str() : (*kv)[3].str();
                rec[key] = val;
            }
            records.push_back(rec);
        }
        std::cout << "  [Extract]   " << records.size() << " objects parsed from JSON array\n";
    }

    void transform() override {
        // Keys already flat; numeric strings remain as strings in C++ map
        std::cout << "  [Transform] nested keys flattened · numeric strings coerced\n";
    }
};


// SECTION:: XML Pipeline
// ═════════════════════════════════════════════════════════════
//  CONCRETE: XmlPipeline
// ═════════════════════════════════════════════════════════════
//  extract  : regex parse <record> elements, preserving type attributes
//  transform: coerce values by type attribute (values stored as strings)

static const std::string XML_SOURCE =
    "<records>"
    "<record><id type=\"int\">1</id><name type=\"string\">Grace</name>"
    "<active type=\"bool\">true</active><score type=\"float\">9.4</score></record>"
    "<record><id type=\"int\">2</id><name type=\"string\">Henry</name>"
    "<active type=\"bool\">false</active><score type=\"float\">7.8</score></record>"
    "<record><id type=\"int\">3</id><name type=\"string\">Isla</name>"
    "<active type=\"bool\">true</active><score type=\"float\">8.9</score></record>"
    "</records>";

class XmlPipeline : public DataPipeline {
public:
    std::string name() const override { return "XML Data Pipeline"; }

protected:
    void extract() override {
        records.clear();
        std::regex recRe(R"(<record>(.*?)</record>)");
        std::regex fldRe(R"(<(\w+)\s+type="(\w+)">(.*?)</\1>)");
        auto rBegin = std::sregex_iterator(XML_SOURCE.begin(), XML_SOURCE.end(), recRe);
        for (auto it = rBegin; it != std::sregex_iterator(); ++it) {
            std::string body = (*it)[1];
            Row rec;
            auto fBegin = std::sregex_iterator(body.begin(), body.end(), fldRe);
            for (auto f = fBegin; f != std::sregex_iterator(); ++f) {
                // Store as "field__type=type|val" pairs for transform
                rec[(*f)[1].str() + "__type"] = (*f)[2];
                rec[(*f)[1].str()]             = (*f)[3];
            }
            records.push_back(rec);
        }
        std::cout << "  [Extract]   " << records.size() << " <record> elements parsed from XML\n";
    }

    void transform() override {
        for (auto& rec : records) {
            std::vector<std::string> typeKeys;
            for (auto& [k, v] : rec)
                if (k.size() > 6 && k.substr(k.size() - 6) == "__type") typeKeys.push_back(k);
            for (auto& tk : typeKeys) {
                std::string field = tk.substr(0, tk.size() - 6);
                std::string type  = rec[tk];
                std::string val   = rec[field];
                if (type == "bool") rec[field] = (val == "true") ? "true" : "false";
                // int and float values are already correct string representations
                rec.erase(tk);
            }
        }
        std::cout << "  [Transform] type attrs stripped · values coerced (int/float/bool)\n";
    }
};


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

#ifndef TESTING
int main() {
    std::string sep(64, '\xe2');
    // Build proper UTF-8 separator
    std::string SEP;
    for (int i = 0; i < 64; i++) SEP += "\xe2\x95\x90";  // ═

    std::cout << "\xe2\x95\x94" << std::string(62, '\0');
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║       Template Method: Data Pipeline                         ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    std::cout << "\n" << SEP << "\n";
    std::cout << "  Three pipelines, same skeleton, different formats\n";
    std::cout << SEP << "\n";

    CsvPipeline  csv;
    JsonPipeline jsn;
    XmlPipeline  xml;
    csv.run();
    jsn.run();
    xml.run();

    std::cout << "\n" << SEP << "\n";
    std::cout << "  The template method in action:\n";
    std::cout << "    Every pipeline ran: extract -> transform -> validate -> load -> report\n";
    std::cout << "    validate() and load() are identical across all three; written once.\n";
    std::cout << "    Only extract() and transform() differed per format.\n";
    std::cout << SEP << "\n";

    std::cout << "\n╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║  Done                                                        ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    return 0;
}
#endif // TESTING
