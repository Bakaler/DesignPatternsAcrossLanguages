// ============================================================
//  Unit Tests — Template Method: Data Pipeline (C++)
//
//  Compile:
//    g++ -std=c++17 -DTESTING -I/usr/local/include \
//        unit.test.cpp -lgtest -lgtest_main -pthread -o unit_tests
//    ./unit_tests
// ============================================================

#define TESTING
#include "../../../../BehavioralPatterns/TemplateMethod/cpp/cpp.cpp"
#include <gtest/gtest.h>
#include <sstream>
#include <functional>

static std::string capture(std::function<void()> fn) {
    std::ostringstream oss;
    auto* old = std::cout.rdbuf(oss.rdbuf());
    fn();
    std::cout.rdbuf(old);
    return oss.str();
}

static bool contains(const std::string& h, const std::string& n) {
    return h.find(n) != std::string::npos;
}

// ── CsvPipeline ───────────────────────────────────────────────
class CsvTest : public ::testing::Test {
protected:
    CsvPipeline pipe;
    void doExtract()   { capture([&]{ pipe.extract(); }); }
    void doTransform() { capture([&]{ pipe.transform(); }); }
};

TEST_F(CsvTest, Extract_Loads_Three_Records) {
    doExtract();
    EXPECT_EQ(3u, pipe.records.size());
}

TEST_F(CsvTest, Transform_Trims_Whitespace) {
    doExtract(); doTransform();
    bool foundBob = false;
    for (auto& r : pipe.records) {
        auto it = r.find("name");
        if (it != r.end() && it->second == "Bob") foundBob = true;
        if (it != r.end()) EXPECT_EQ(it->second.find("  "), std::string::npos);
    }
    EXPECT_TRUE(foundBob);
}

TEST_F(CsvTest, Transform_Empty_Name_Becomes_Empty) {
    doExtract(); doTransform();
    // Row index 2 should have empty name
    EXPECT_TRUE(pipe.records[2]["name"].empty());
}

TEST_F(CsvTest, Extract_Output_Mentions_CSV) {
    std::string out = capture([&]{ pipe.extract(); });
    EXPECT_TRUE(contains(out, "CSV"));
}

// ── JsonPipeline ──────────────────────────────────────────────
class JsonTest : public ::testing::Test {
protected:
    JsonPipeline pipe;
    void doExtract()   { capture([&]{ pipe.extract(); }); }
    void doTransform() { capture([&]{ pipe.transform(); }); }
};

TEST_F(JsonTest, Extract_Loads_Three_Records) {
    doExtract();
    EXPECT_EQ(3u, pipe.records.size());
}

TEST_F(JsonTest, Transform_Flattens_Meta_Role) {
    doExtract(); doTransform();
    EXPECT_NE(pipe.records[0].end(), pipe.records[0].find("meta_role"));
    EXPECT_EQ(pipe.records[0].end(), pipe.records[0].find("meta"));
}

TEST_F(JsonTest, Extract_Has_All_Names) {
    doExtract();
    std::vector<std::string> names;
    for (auto& r : pipe.records) names.push_back(r["name"]);
    EXPECT_NE(std::find(names.begin(), names.end(), "Dave"),  names.end());
    EXPECT_NE(std::find(names.begin(), names.end(), "Eve"),   names.end());
    EXPECT_NE(std::find(names.begin(), names.end(), "Frank"), names.end());
}

// ── XmlPipeline ───────────────────────────────────────────────
class XmlTest : public ::testing::Test {
protected:
    XmlPipeline pipe;
    void doExtract()   { capture([&]{ pipe.extract(); }); }
    void doTransform() { capture([&]{ pipe.transform(); }); }
};

TEST_F(XmlTest, Extract_Loads_Three_Records) {
    doExtract();
    EXPECT_EQ(3u, pipe.records.size());
}

TEST_F(XmlTest, Transform_Strips_Type_Keys) {
    doExtract(); doTransform();
    for (auto& rec : pipe.records)
        for (auto& [k, v] : rec)
            EXPECT_EQ(k.find("__type"), std::string::npos);
}

TEST_F(XmlTest, Transform_Bool_True) {
    doExtract(); doTransform();
    EXPECT_EQ("true", pipe.records[0]["active"]);
}

TEST_F(XmlTest, Transform_Bool_False) {
    doExtract(); doTransform();
    EXPECT_EQ("false", pipe.records[1]["active"]);
}

TEST_F(XmlTest, Transform_Preserves_Float_String) {
    doExtract(); doTransform();
    EXPECT_EQ("9.4", pipe.records[0]["score"]);
}

// ── run() step order ─────────────────────────────────────────
class RunOrderTest : public ::testing::Test {};

TEST_F(RunOrderTest, Steps_Called_In_Correct_Order) {
    // Verify positional ordering in captured output
    CsvPipeline pipe;
    std::string out = capture([&]{ pipe.run(); });
    size_t ext  = out.find("[Extract]");
    size_t trn  = out.find("[Transform]");
    size_t val  = out.find("[Validate]");
    size_t ld   = out.find("[Load]");
    size_t rpt  = out.find("[Report]");
    EXPECT_LT(ext, trn);
    EXPECT_LT(trn, val);
    EXPECT_LT(val, ld);
    EXPECT_LT(ld,  rpt);
}
