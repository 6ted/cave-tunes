
// ============================================================
// CAVE TUNES
// ROYALTY SETTLEMENT ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const requireMonetized =
    require("../middleware/requireMonetized");

const {
    settleSong,
    settleMyRoyalties,
    getSongSettlements,
    getMySettlements,
    getUnsettledSong
} = require("../controllers/royaltySettlementController");


const requireMonthlyFinancialWindow =
    require("../middleware/requireMonthlyFinancialWindow");

// ============================================================
// SETTLE ALL MY ROYALTIES
// ============================================================

router.post(
    "/my/settle",
    authMiddleware,
    requireMonetized,
    requireMonthlyFinancialWindow,
    settleMyRoyalties
);

// ============================================================
// SETTLE SONG
// ============================================================

router.post(
    "/songs/:songId/settle",
    authMiddleware,
    requireMonetized,
    requireMonthlyFinancialWindow,
    settleSong
);

// ============================================================
// GET SONG SETTLEMENT HISTORY
// ============================================================

router.get(
    "/songs/:songId",
    authMiddleware,
    requireMonetized,
    getSongSettlements
);

// ============================================================
// GET MY SETTLEMENTS
// ============================================================

router.get(
    "/my",
    authMiddleware,
    requireMonetized,
    getMySettlements
);

// ============================================================
// GET UNSETTLED SONG ACTIVITY
// ============================================================

router.get(
    "/songs/:songId/unsettled",
    authMiddleware,
    requireMonetized,
    getUnsettledSong
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;

