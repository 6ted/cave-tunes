// ======================================================
// CAVE TUNES
// WALLET ROUTES
// ======================================================

const express =
    require("express");

const router =
    express.Router();

const {

    getWallet,

    getTransactions,

    getPayoutMethods,

    addPayoutMethod,

    requestWithdrawal,

    getWithdrawals

} = require(
    "../controllers/walletController"
);

const authMiddleware =
    require(
        "../middleware/authMiddleware"
    );
const requireMonetized =
    require("../middleware/requireMonetized");

    const requireMonthlyFinancialWindow =
    require("../middleware/requireMonthlyFinancialWindow");

// ======================================================
// AUTHENTICATED WALLET
// ======================================================

router.get(
    "/",
    authMiddleware,
    requireMonetized,
    getWallet
);


router.get(
    "/transactions",
    authMiddleware,
     requireMonetized,
    getTransactions
);


router.get(
    "/payout-methods",
    authMiddleware,
     requireMonetized,
    getPayoutMethods
);


router.post(
    "/payout-methods",
    authMiddleware,
     requireMonetized,
    addPayoutMethod
);


router.get(
    "/withdrawals",
    authMiddleware,
     requireMonetized,
    getWithdrawals
);


router.post(
    "/withdrawals",
    authMiddleware,
    requireMonetized,
    requireMonthlyFinancialWindow,
    requestWithdrawal
);


module.exports =
    router;