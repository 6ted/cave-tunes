// ======================================================
// CAVE TUNES
// ADMIN WITHDRAWAL ROUTES
// ======================================================

const express =
    require("express");

const router =
    express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const {

    getWithdrawals,

    approveWithdrawal,

    rejectWithdrawal

} =
    require(
        "../controllers/adminWithdrawalController"
    );


// ======================================================
// GET PENDING WITHDRAWALS
// ======================================================

router.get(
    "/",
    authMiddleware,
    getWithdrawals
);


// ======================================================
// APPROVE
// ======================================================

router.post(
    "/:id/approve",
    authMiddleware,
    approveWithdrawal
);


// ======================================================
// REJECT
// ======================================================

router.post(
    "/:id/reject",
    authMiddleware,
    rejectWithdrawal
);


module.exports =
    router;