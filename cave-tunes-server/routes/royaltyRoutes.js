// ============================================================
// CAVE TUNES
// ROYALTY ROUTES
// ============================================================

const express = require("express");

const router =
    express.Router();

const {
    saveSongRoyaltySplit,
    getSongRoyaltySplit,
    getSongRoyaltySplitVersions,
    getOwnRoyaltyManagement,
    getFeaturedRoyaltyManagement
} = require("../controllers/royaltyController");

const authMiddleware =
    require("../middleware/authMiddleware");

    const requireMonetized =
    require("../middleware/requireMonetized");

// ============================================================
// SAVE / UPDATE ROYALTY SPLIT
// ============================================================

router.post(
    "/songs/:songId/splits",
    authMiddleware,
    saveSongRoyaltySplit
);


// ============================================================
// GET CURRENT ROYALTY SPLIT
// ============================================================

router.get(
    "/songs/:songId/splits",
    authMiddleware,
    getSongRoyaltySplit
);


// ============================================================
// GET ROYALTY SPLIT HISTORY / VERSIONS
// ============================================================

router.get(
    "/songs/:songId/splits/versions",
    authMiddleware,
    getSongRoyaltySplitVersions
);


// ============================================================
// ROYALTY MANAGEMENT
// ============================================================

router.get(
    "/management/own",
    authMiddleware,
    requireMonetized,
    getOwnRoyaltyManagement
);


router.get(
    "/management/featured",
    authMiddleware,
    requireMonetized,
    getFeaturedRoyaltyManagement
);


module.exports = router;