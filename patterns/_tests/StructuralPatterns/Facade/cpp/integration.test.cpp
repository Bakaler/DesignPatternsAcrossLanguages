// ============================================================
//  Integration Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Full makePurchase() produces correct end-to-end output
//    · Auth result feeds into Payment, Payment ref feeds into Messaging
//    · Each facade routes exclusively to its own TP base URL
//    · Credentials masked with ••• — no raw values in output
//    · Swapping a facade subclass leaves other facades untouched
//
//  Compile:
//    g++ -std=c++17 -DTESTING -I/usr/local/include \
//        integration.test.cpp -lgtest -lgtest_main -pthread -o integration_tests
//    ./integration_tests
// ============================================================

#define TESTING
#include "../../../../StructuralPatterns/Facade/cpp/cpp.cpp"

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

// ── Full purchase flow ────────────────────────────────────────
class FullPurchaseFlowTest : public ::testing::Test {
protected:
    std::string out;
    void SetUp() override {
        out = capture([]{ PurchaseService().makePurchase("tok_user_jane", 4999, "+15550142"); });
    }
};

TEST_F(FullPurchaseFlowTest, All_Three_Confirmations_Present) {
    EXPECT_TRUE(contains(out, "User:"));
    EXPECT_TRUE(contains(out, "Charged"));
    EXPECT_TRUE(contains(out, "Message queued"));
}

TEST_F(FullPurchaseFlowTest, Auth_Email_In_Output) {
    EXPECT_TRUE(contains(out, "jane.doe@example.com"));
}

TEST_F(FullPurchaseFlowTest, Transaction_Id_In_Output) {
    EXPECT_TRUE(contains(out, "txn_8821"));
}

TEST_F(FullPurchaseFlowTest, Message_Id_In_Output) {
    EXPECT_TRUE(contains(out, "msg_3301"));
}

// ── Loose coupling ────────────────────────────────────────────
TEST(LooseCouplingTest, Each_Facade_Routes_To_Its_Own_BaseUrl) {
    auto paymentOut = capture([]{ PaymentFacade().charge("usr_1", 100); });
    auto authOut    = capture([]{ AuthFacade().validateToken("tok_1"); });
    auto msgOut     = capture([]{ MessagingFacade().send("+1", "hi"); });

    EXPECT_TRUE(contains(paymentOut, "paymentprocessortp.com"));
    EXPECT_TRUE(contains(authOut,    "authprovidertp.com"));
    EXPECT_TRUE(contains(msgOut,     "messagingtp.com"));
}

TEST(LooseCouplingTest, No_Cross_Contamination_Between_URLs) {
    auto paymentOut = capture([]{ PaymentFacade().charge("usr_1", 100); });
    auto authOut    = capture([]{ AuthFacade().validateToken("tok_1"); });

    EXPECT_FALSE(contains(paymentOut, "authprovidertp.com"));
    EXPECT_FALSE(contains(paymentOut, "messagingtp.com"));
    EXPECT_FALSE(contains(authOut,    "paymentprocessortp.com"));
}

TEST(LooseCouplingTest, Headers_Masked_Raw_Credentials_Never_Appear) {
    auto out = capture([]{ PurchaseService().makePurchase("tok", 10, "+1"); });
    EXPECT_FALSE(contains(out, "sk_live_demo"));
    EXPECT_FALSE(contains(out, "auth_secret_demo"));
    EXPECT_FALSE(contains(out, "SID_xyz"));
    EXPECT_TRUE(contains(out, "\xe2\x80\xa2\xe2\x80\xa2\xe2\x80\xa2")); // •••
}

// ── Single point of change ───────────────────────────────────
struct FreePaymentFacade : public PaymentFacade {
    HttpBody charge(const std::string&, int) override {
        return {{"transaction_id", "free_txn"}, {"status", "success"}};
    }
};

struct SilentMessagingFacade : public MessagingFacade {
    HttpBody send(const std::string&, const std::string&) override {
        return {{"message_id", "silent"}, {"status", "dropped"}};
    }
};

TEST(SinglePointOfChangeTest, Swapping_Payment_Does_Not_Affect_Auth) {
    auto authResult = AuthFacade().validateToken("tok_1");
    EXPECT_EQ(authResult["user_id"], "usr_4421");

    auto tx = FreePaymentFacade().charge("usr_1", 0);
    EXPECT_EQ(tx["transaction_id"], "free_txn");
}

TEST(SinglePointOfChangeTest, Swapping_Messaging_Does_Not_Affect_Payment) {
    auto tx = PaymentFacade().charge("usr_1", 50);
    EXPECT_EQ(tx["transaction_id"], "txn_8821");

    auto msg = SilentMessagingFacade().send("+1", "test");
    EXPECT_EQ(msg["status"], "dropped");
}
