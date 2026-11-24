
const express = require("express");

const router = express.Router();

const chartController = require(
    "../controllers/chartController"
);

// ======================================================
// FEATURED CHARTS
// ======================================================

router.get(
    "/featured",
    chartController.getFeaturedCharts
);

// ======================================================
// AVAILABLE CHARTS
// ======================================================

router.get(
    "/countries",
    chartController.getAvailableCharts
);

// ======================================================
// INDIVIDUAL CHART
// Keep this route last.
// ======================================================

router.get(
    "/:slug",
    chartController.getChart
);

module.exports = router;
