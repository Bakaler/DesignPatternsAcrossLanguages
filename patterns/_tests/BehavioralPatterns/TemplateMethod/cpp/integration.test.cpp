// ============================================================
//  Integration Tests — Template Method: Data Pipeline (C++)
//
//  Compile:
//    g++ -std=c++17 -DTESTING -I/usr/local/include \
//        integration.test.cpp -lgtest -lgtest_main -pthread -o integration_tests
//    ./integration_tests
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

static const std::vector<std::string> LABELS = {
    "[Extract]","[Transform]","[Validate]","[Load]","[Report]"
};

// ── CSV full run ──────────────────────────────────────────────
class CsvFullRunTest : public ::testing::Test {
protected:
    std::string out;
    void SetUp() override { CsvPipeline p; out = capture([&]{ p.run(); }); }
};

TEST_F(CsvFullRunTest, All_Five_Labels_Present) {
    for (auto& l : LABELS) EXPECT_TRUE(contains(out, l)) << "Missing: " << l;
}
TEST_F(CsvFullRunTest, Validate_Catches_Missing_Name) {
    EXPECT_TRUE(contains(out, "1 error(s)"));
}
TEST_F(CsvFullRunTest, Report_Shows_Warning) {
    EXPECT_TRUE(contains(out, "name"));
}
TEST_F(CsvFullRunTest, Alice_In_Output) { EXPECT_TRUE(contains(out, "Alice")); }
TEST_F(CsvFullRunTest, Bob_Trimmed_In_Output) {
    EXPECT_TRUE(contains(out, "Bob"));
    EXPECT_FALSE(contains(out, "  Bob  "));
}

// ── JSON full run ─────────────────────────────────────────────
class JsonFullRunTest : public ::testing::Test {
protected:
    std::string out;
    void SetUp() override { JsonPipeline p; out = capture([&]{ p.run(); }); }
};

TEST_F(JsonFullRunTest, All_Five_Labels_Present) {
    for (auto& l : LABELS) EXPECT_TRUE(contains(out, l));
}
TEST_F(JsonFullRunTest, No_Errors) { EXPECT_TRUE(contains(out, "0 error(s)")); }
TEST_F(JsonFullRunTest, Meta_Role_In_Output) { EXPECT_TRUE(contains(out, "meta_role")); }
TEST_F(JsonFullRunTest, All_Names_In_Output) {
    EXPECT_TRUE(contains(out, "Dave"));
    EXPECT_TRUE(contains(out, "Eve"));
    EXPECT_TRUE(contains(out, "Frank"));
}

// ── XML full run ──────────────────────────────────────────────
class XmlFullRunTest : public ::testing::Test {
protected:
    std::string out;
    void SetUp() override { XmlPipeline p; out = capture([&]{ p.run(); }); }
};

TEST_F(XmlFullRunTest, All_Five_Labels_Present) {
    for (auto& l : LABELS) EXPECT_TRUE(contains(out, l));
}
TEST_F(XmlFullRunTest, No_Errors) { EXPECT_TRUE(contains(out, "0 error(s)")); }
TEST_F(XmlFullRunTest, Bool_True_In_Output)  { EXPECT_TRUE(contains(out, "active:true")); }
TEST_F(XmlFullRunTest, Bool_False_In_Output) { EXPECT_TRUE(contains(out, "active:false")); }
TEST_F(XmlFullRunTest, Float_Score_In_Output){ EXPECT_TRUE(contains(out, "9.4")); }
TEST_F(XmlFullRunTest, All_Names_In_Output)  {
    EXPECT_TRUE(contains(out, "Grace"));
    EXPECT_TRUE(contains(out, "Henry"));
    EXPECT_TRUE(contains(out, "Isla"));
}

// ── Shared skeleton ───────────────────────────────────────────
TEST(SharedSkeletonTest, Extract_Before_Transform_All_Pipelines) {
    auto check = [](auto& pipe) {
        std::string out = capture([&]{ pipe.run(); });
        EXPECT_LT(out.find("[Extract]"), out.find("[Transform]"));
    };
    CsvPipeline csv; check(csv);
    JsonPipeline jsn; check(jsn);
    XmlPipeline xml; check(xml);
}

TEST(SharedSkeletonTest, Validate_After_Transform_All_Pipelines) {
    auto check = [](auto& pipe) {
        std::string out = capture([&]{ pipe.run(); });
        EXPECT_LT(out.find("[Transform]"), out.find("[Validate]"));
    };
    CsvPipeline csv; check(csv);
    JsonPipeline jsn; check(jsn);
    XmlPipeline xml; check(xml);
}

TEST(SharedSkeletonTest, Report_Last_All_Pipelines) {
    auto check = [](auto& pipe) {
        std::string out = capture([&]{ pipe.run(); });
        EXPECT_LT(out.find("[Load]"), out.find("[Report]"));
    };
    CsvPipeline csv; check(csv);
    JsonPipeline jsn; check(jsn);
    XmlPipeline xml; check(xml);
}
