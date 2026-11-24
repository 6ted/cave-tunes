// ======================================================
// CAVE TUNES ADMIN ROUTES
// routes/adminRoutes.js
// ======================================================

const express = require("express");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware =
    require("../middleware/authMiddleware");

const adminMiddleware =
    require("../middleware/adminMiddleware");


// ======================================================
// CONTROLLERS
// ======================================================

const adminController =
    require("../controllers/adminController");

const approvalController =
    require("../controllers/approvalController");


// ======================================================
// ADMIN SECURITY
// ======================================================
//
// Every route requires:
//
// 1. Valid authentication token
// 2. Existing user
// 3. is_admin = TRUE
//
// ======================================================

router.use(
    authMiddleware,
    adminMiddleware
);


// ======================================================
// ADMIN DASHBOARD
// ======================================================

router.get(
    "/dashboard",
    adminController.dashboard
);


// ======================================================
// USERS
// ======================================================

// GET /api/admin/users
router.get(
    "/users",
    adminController.getUsers
);


// GET /api/admin/users/:id
router.get(
    "/users/:id",
    adminController.getUser
);


// PUT /api/admin/users/:id/admin
router.put(
    "/users/:id/admin",
    adminController.updateAdminStatus
);


// PUT /api/admin/users/:id/role
router.put(
    "/users/:id/role",
    adminController.updateUserRole
);


// DELETE /api/admin/users/:id
router.delete(
    "/users/:id",
    adminController.deleteUser
);


// ======================================================
// MUSIC
// ======================================================

// GET /api/admin/songs
router.get(
    "/songs",
    adminController.getSongs
);


// IMPORTANT:
// /songs/top MUST come before /songs/:id

// GET /api/admin/songs/top
router.get(
    "/songs/top",
    adminController.getTopSongs
);


// DELETE /api/admin/songs/:id
router.delete(
    "/songs/:id",
    adminController.deleteSong
);


// ======================================================
// VERIFICATION REQUESTS
// ======================================================

// GET /api/admin/verification
router.get(
    "/verification",
    approvalController.getVerificationRequests
);


// PATCH /api/admin/verification/:id
router.patch(
    "/verification/:id",
    approvalController.updateVerificationRequest
);


// ======================================================
// MONETIZATION REQUESTS
// ======================================================
//
// IMPORTANT:
// These routes exist ONLY ONCE.
//
// We use approvalController because it already
// handles the admin approval/rejection workflow.
//

// GET /api/admin/monetization
router.get(
    "/monetization",
    approvalController.getMonetizationRequests
);


// PATCH /api/admin/monetization/:id
router.patch(
    "/monetization/:id",
    approvalController.updateMonetizationRequest
);


// ======================================================
// WITHDRAW REQUESTS
// ======================================================
//
// These routes also exist ONLY ONCE.
//

// GET /api/admin/withdraws
router.get(
    "/withdraws",
    approvalController.getWithdrawRequests
);


// PATCH /api/admin/withdraws/:id
router.patch(
    "/withdraws/:id",
    approvalController.updateWithdrawRequest
);



// ======================================================
// ADMIN NOTIFICATIONS
// ======================================================

// POST /api/admin/notifications/send

router.post(
    "/notifications/send",
    adminController.sendAdminNotification
);


// GET /api/admin/notifications/history

router.get(
    "/notifications/history",
    adminController.getAdminNotificationHistory
);


// GET /api/admin/notifications/stats

router.get(
    "/notifications/stats",
    adminController.getAdminNotificationStats
);


// ======================================================
// ADMIN TEST
// ======================================================

router.get(
    "/test",
    (req, res) => {

        return res.json({
            success: true,

            message:
                "Cave Tunes Admin API is working.",

            admin: true,

            userId:
                req.userId,

            user:
                req.user || null,
        });

    }
);

// ======================================================
// USER ANALYTICS
// ======================================================

// GET /api/admin/analytics?period=month

router.get(
    "/analytics",
    adminController.getUserAnalytics
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;