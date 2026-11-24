// ======================================================
// CAVE TUNES
// CREATOR REQUEST ROUTES
// routes/creatorRequestRoutes.js
// ======================================================

const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/creatorRequestController");
const paymentUpload = require("../middleware/paymentUpload");


// ======================================================
// AUTHENTICATION
// ======================================================
//
// Every route in this file requires a logged-in user.
// req.user.id is therefore available inside the controller.
//

router.use(authMiddleware);


// ======================================================
// VERIFICATION REQUEST
// ======================================================

// POST
// /api/creator/verification-request
//
// Used when a creator submits a verification request
// together with their payment screenshot.

router.post(
    "/verification-request",
    paymentUpload.single("payment_proof"),
    controller.createVerificationRequest
);


// GET
// /api/creator/verification-request
//
// Returns the current user's latest verification request.

router.get(
    "/verification-request",
    controller.getMyVerificationRequest
);


// ======================================================
// MONETIZATION REQUEST
// ======================================================
//
// Monetization is submitted only after:
//
// STEP 01
// Creator application + eligibility snapshot
//
// STEP 02
// Payout information
//
// STEP 03
// Final review + confirmations
//
// The frontend sends all three sections together:
//
// {
//     application: {...},
//     payout: {...},
//     review: {...}
// }
//
// ======================================================


// PRIMARY ENDPOINT
//
// POST
// /api/creator/request
//
// IMPORTANT:
// If your frontend uses:
//
// /api/creator/monetization-request
//
// use the compatibility route below instead.

router.post(
    "/request",
    controller.createMonetizationRequest
);


// ======================================================
// MONETIZATION COMPATIBILITY ENDPOINT
// ======================================================
//
// Keep this endpoint so older Cave Tunes pages do not break.
//
// POST
// /api/creator/monetization-request
//

router.post(
    "/monetization-request",
    controller.createMonetizationRequest
);


// ======================================================
// MONETIZATION ELIGIBILITY
// ======================================================
//
// GET /api/creator/monetization/eligibility
//
// Returns the authenticated user's real monetization
// eligibility from the database.
//

router.get(
    "/monetization/eligibility",
    controller.getMonetizationEligibility
);

// ======================================================
// GET MY MONETIZATION REQUEST
// ======================================================
//
// Allows the frontend to retrieve the user's latest
// monetization request.
//
// GET
// /api/creator/monetization-request
//

router.get(
    "/monetization-request",
    controller.getMyMonetizationRequest
);


// ======================================================
// WITHDRAWAL REQUEST
// ======================================================
//
// POST
// /api/creator/withdraw-request
//

router.post(
    "/withdraw-request",
    controller.createWithdrawRequest
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;