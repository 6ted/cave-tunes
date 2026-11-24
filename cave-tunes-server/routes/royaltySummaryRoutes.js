// ======================================================
// CAVE TUNES
// ROYALTY SUMMARY ROUTES
// ======================================================

const express =
    require("express");

const router =
    express.Router();


const {

    getUserRoyaltySummary,

    getUserSongSettlementSummary

} = require(
    "../controllers/royaltySummaryController"
);


const authMiddleware =
    require(
        "../middleware/authMiddleware"
    );


// ======================================================
// USER ROYALTY SUMMARY
// ======================================================

router.get(
    "/",
    authMiddleware,
    getUserRoyaltySummary
);


// ======================================================
// SONG ROYALTY SUMMARY
// ======================================================

router.get(
    "/songs/:songId",
    authMiddleware,
    getUserSongSettlementSummary
);


module.exports =
    router;