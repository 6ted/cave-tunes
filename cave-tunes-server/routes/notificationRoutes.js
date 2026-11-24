// ======================================================
// CAVE TUNES
// NOTIFICATION ROUTES
// routes/notificationRoutes.js
// ======================================================

const express =
    require("express");

const router =
    express.Router();


const authMiddleware =
    require(
        "../middleware/authMiddleware"
    );


const notificationController =
    require(
        "../controllers/notificationController"
    );


// ======================================================
// GET NOTIFICATIONS
// GET /api/notifications
// ======================================================

router.get(
    "/",
    authMiddleware,
    notificationController.getNotifications
);


// ======================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// ======================================================

router.get(
    "/unread-count",
    authMiddleware,
    notificationController.getUnreadCount
);


// ======================================================
// MARK ALL READ
// PATCH /api/notifications/read-all
// ======================================================

router.patch(
    "/read-all",
    authMiddleware,
    notificationController.markAllNotificationsRead
);



// ======================================================
// MARK ONE READ
// PATCH /api/notifications/:id/read
// ======================================================

router.patch(
    "/:id/read",
    authMiddleware,
    notificationController.markNotificationRead
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;