// ============================================================
// CAVE TUNES
// CREATOR VERIFICATION PAYMENT ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const controller =
    require("../controllers/creatorVerificationPaymentController");


// ============================================================
// PUBLIC PAYCHANGU CALLBACK
// Must be registered before authentication.
// ============================================================

router.get(
    "/verification/payment/callback",
    controller.verificationPaymentCallback
);


// ============================================================
// AUTHENTICATED PAYMENT ROUTES
// ============================================================

router.use(authMiddleware);


router.post(
    "/verification/payment",
    controller.createVerificationCheckout
);


router.get(
    "/verification/payment/status",
    controller.getVerificationPaymentStatus
);


module.exports = router;