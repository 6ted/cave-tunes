// ============================================================
// CAVE TUNES
// PREMIUM SUBSCRIPTION ROUTES
// ============================================================

const express = require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const subscriptionController =
    require("../controllers/subscriptionController");


// ============================================================
// PUBLIC ROUTES
// ============================================================

// ------------------------------------------------------------
// GET ACTIVE PREMIUM PLANS
// GET /api/subscription/plans
// ------------------------------------------------------------

router.get(
    "/plans",
    subscriptionController.getPlans
);


// ============================================================
// PAYCHANGU PAYMENT CALLBACK
// ============================================================
//
// IMPORTANT:
// This MUST be public.
//
// PayChangu calls this URL directly.
// It does not have our Cave Tunes JWT.
// ============================================================

router.get(
    "/payment/callback",
    subscriptionController.paymentCallback
);


// ============================================================
// PAYCHANGU FAILED / CANCELLED RETURN
// ============================================================

router.get(
    "/payment/return",
    subscriptionController.paymentReturn
);


// ============================================================
// PROTECTED ROUTES
// ============================================================

// ------------------------------------------------------------
// GET CURRENT PREMIUM STATUS
// GET /api/subscription/status
// ------------------------------------------------------------

router.get(
    "/status",
    authMiddleware,
    subscriptionController.getStatus
);


// ------------------------------------------------------------
// CREATE PREMIUM CHECKOUT
// POST /api/subscription/subscribe
// ------------------------------------------------------------

router.post(
    "/subscribe",
    authMiddleware,
    subscriptionController.subscribe
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;