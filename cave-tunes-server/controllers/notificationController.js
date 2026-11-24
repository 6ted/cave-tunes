// ======================================================
// CAVE TUNES
// NOTIFICATION CONTROLLER
// controllers/notificationController.js
// ======================================================

const {

    getUserNotifications,

    getUnreadNotificationCount,

    markNotificationRead:
        markNotificationReadService,

    markAllNotificationsRead:
        markAllNotificationsReadService,

} = require(
    "../services/notificationService"
);

// ======================================================
// GET CURRENT USER ID
// ======================================================

function getAuthenticatedUserId(
    req
) {

    return (
        req.userId ||
        req.user?.id ||
        null
    );

}


// ======================================================
// GET NOTIFICATIONS
// GET /api/notifications
// ======================================================

exports.getNotifications =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getAuthenticatedUserId(
                    req
                );


            if (!userId) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Unauthorized. Please login.",
                    });

            }


            const limit =
                req.query.limit;


            const offset =
                req.query.offset;


            const notifications =
                await getUserNotifications({
                    userId,
                    limit,
                    offset,
                });


            const unreadCount =
                await getUnreadNotificationCount(
                    userId
                );


            return res.json({

                success: true,

                notifications,

                unreadCount,

                total:
                    notifications.length,

            });

        }

        catch (error) {

            console.error(
                "GET NOTIFICATIONS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to load notifications.",

                });

        }

    };


// ======================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// ======================================================

exports.getUnreadCount =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getAuthenticatedUserId(
                    req
                );


            if (!userId) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Unauthorized. Please login.",
                    });

            }


            const unreadCount =
                await getUnreadNotificationCount(
                    userId
                );


            return res.json({

                success: true,

                unreadCount,

            });

        }

        catch (error) {

            console.error(
                "GET UNREAD COUNT ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to load unread notification count.",

                });

        }

    };


// ======================================================
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// ======================================================

exports.markNotificationRead =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getAuthenticatedUserId(
                    req
                );


            if (!userId) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Unauthorized. Please login.",
                    });

            }


            const notificationId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    notificationId
                ) ||
                notificationId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid notification ID.",

                    });

            }


            const notification =
                await markNotificationReadService(
                    notificationId,
                    userId
                );


            if (!notification) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Notification not found.",

                    });

            }


            return res.json({

                success: true,

                message:
                    "Notification marked as read.",

                notification,

            });

        }

        catch (error) {

            console.error(
                "MARK NOTIFICATION READ ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to mark notification as read.",

                });

        }

    };


// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ======================================================

exports.markAllNotificationsRead =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getAuthenticatedUserId(
                    req
                );


            if (!userId) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Unauthorized. Please login.",
                    });

            }


            const result =
                await markAllNotificationsReadService(
                    userId
                );


            return res.json({

                success: true,

                message:
                    "All notifications marked as read.",

                updated:
                    result.count,

            });

        }

        catch (error) {

            console.error(
                "MARK ALL NOTIFICATIONS READ ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to mark notifications as read.",

                });

        }

    };

    