// ======================================================
// CAVE TUNES
// NOTIFICATION SERVICE
// services/notificationService.js
// ======================================================

const db =
    require("../config/database");

const {
    sendNotificationEmail,
} = require("./emailService");


// ======================================================
// FRONTEND URL
// ======================================================

const FRONTEND_URL =
    (
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");


// ======================================================
// BUILD EMAIL ACTION URL
// ======================================================

function buildEmailActionUrl(
    actionUrl
) {

    if (!actionUrl) {
        return null;
    }


    // Already a complete URL.
    if (
        /^https?:\/\//i.test(
            actionUrl
        )
    ) {

        return actionUrl;

    }


    // Convert relative URL to full URL.
    return (
        `${FRONTEND_URL}/` +
        String(actionUrl)
            .replace(/^\/+/, "")
    );

}


// ======================================================
// CREATE ONE NOTIFICATION
// ======================================================

async function createNotification({

    userId,

    actorUserId = null,

    songId = null,

    type = "system",

    title,

    message,

    actionUrl = null,

    metadata = {},

}) {

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!userId) {

        throw new Error(
            "Notification user ID is required."
        );

    }


    if (!title) {

        throw new Error(
            "Notification title is required."
        );

    }


    if (!message) {

        throw new Error(
            "Notification message is required."
        );

    }


    // ==================================================
    // CREATE IN-APP NOTIFICATION
    // ==================================================

    const result =
        await db.query(
            `
            INSERT INTO notifications
            (
                user_id,
                actor_user_id,
                song_id,
                type,
                title,
                message,
                action_url,
                metadata
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8::jsonb
            )

            RETURNING *
            `,
            [
                userId,

                actorUserId,

                songId,

                type,

                title,

                message,

                actionUrl,

                JSON.stringify(
                    metadata || {}
                ),
            ]
        );


    const notification =
        result.rows[0];


    // ==================================================
    // GET RECIPIENT EMAIL
    // ==================================================

    let userEmail = null;


    try {

        const userResult =
            await db.query(
                `
                SELECT
                    email

                FROM users

                WHERE id = $1

                LIMIT 1
                `,
                [
                    userId,
                ]
            );


        userEmail =
            userResult.rows[0]?.email
                ?.trim()
                ?.toLowerCase() ||
            null;

    }

    catch (error) {

        console.error(
            "NOTIFICATION EMAIL LOOKUP ERROR:",
            error
        );

    }


    // ==================================================
    // BUILD EMAIL LINK
    // ==================================================

    const emailActionUrl =
        buildEmailActionUrl(
            actionUrl
        );


    // ==================================================
    // SEND EMAIL
    // ==================================================

    if (userEmail) {

        try {

            const emailResult =
                await sendNotificationEmail({

                    to:
                        userEmail,

                    title,

                    message,

                    actionUrl:
                        emailActionUrl,

                });


            // ==========================================
            // EMAIL SUCCESS
            // ==========================================

            if (
                emailResult?.success
            ) {

                console.log(
                    "=================================================="
                );

                console.log(
                    "CAVE TUNES NOTIFICATION EMAIL SENT"
                );

                console.log(
                    "Notification ID:",
                    notification.id
                );

                console.log(
                    "User ID:",
                    userId
                );

                console.log(
                    "Recipient:",
                    userEmail
                );

                console.log(
                    "Email ID:",
                    emailResult.id || "N/A"
                );

                console.log(
                    "=================================================="
                );

            }

            // ==========================================
            // EMAIL NOT SENT
            // ==========================================

            else {

                console.warn(
                    "CAVE TUNES NOTIFICATION EMAIL NOT SENT:",
                    {
                        notificationId:
                            notification.id,

                        userId,

                        email:
                            userEmail,

                        reason:
                            emailResult?.reason ||
                            "UNKNOWN",
                    }
                );

            }

        }

        catch (error) {

            // IMPORTANT:
            //
            // Email failure must NEVER
            // destroy the in-app notification.
            //

            console.error(
                "CAVE TUNES NOTIFICATION EMAIL FAILED:",
                {
                    notificationId:
                        notification.id,

                    userId,

                    email:
                        userEmail,

                    error:
                        error?.message ||
                        error,
                }
            );

        }

    }

    else {

        console.warn(
            `CAVE TUNES NOTIFICATION EMAIL SKIPPED: ` +
            `User ${userId} has no email address.`
        );

    }


    // ==================================================
    // RETURN CREATED NOTIFICATION
    // ==================================================

    return notification;

}


// ======================================================
// CREATE MANY NOTIFICATIONS
// ======================================================

async function createNotifications(
    notifications = []
) {

    if (
        !Array.isArray(
            notifications
        ) ||
        notifications.length === 0
    ) {

        return [];

    }


    const created = [];


    for (
        const notification
        of notifications
    ) {

        try {

            const result =
                await createNotification(
                    notification
                );


            created.push(
                result
            );

        }

        catch (error) {

            console.error(
                "CREATE NOTIFICATION ERROR:",
                error
            );

        }

    }


    return created;

}


// ======================================================
// GET USER NOTIFICATIONS
// ======================================================

async function getUserNotifications({

    userId,

    limit = 100,

    offset = 0,

}) {

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 100,
                1
            ),
            200
        );


    const safeOffset =
        Math.max(
            Number(offset) || 0,
            0
        );


    const result =
        await db.query(
            `
            SELECT

                n.id,

                n.user_id,

                n.actor_user_id,

                n.song_id,

                n.type,

                n.title,

                n.message,

                n.action_url,

                n.metadata,

                n.is_read,

                n.read_at,

                n.created_at,

                actor.username
                    AS actor_username,

                actor.profile_image_url
                    AS actor_profile_image_url

            FROM notifications n

            LEFT JOIN users actor
                ON actor.id =
                    n.actor_user_id

            WHERE
                n.user_id = $1

            ORDER BY
                n.created_at DESC,
                n.id DESC

            LIMIT $2
            OFFSET $3
            `,
            [
                userId,

                safeLimit,

                safeOffset,
            ]
        );


    return result.rows;

}


// ======================================================
// GET UNREAD COUNT
// ======================================================

async function getUnreadNotificationCount(
    userId
) {

    const result =
        await db.query(
            `
            SELECT

                COUNT(*)::integer
                    AS unread_count

            FROM notifications

            WHERE
                user_id = $1

                AND

                is_read = FALSE
            `,
            [
                userId,
            ]
        );


    return Number(
        result.rows[0]?.unread_count || 0
    );

}


// ======================================================
// MARK ONE NOTIFICATION READ
// ======================================================

async function markNotificationRead(
    notificationId,
    userId
) {

    const result =
        await db.query(
            `
            UPDATE notifications

            SET

                is_read = TRUE,

                read_at =
                    COALESCE(
                        read_at,
                        NOW()
                    )

            WHERE

                id = $1

                AND

                user_id = $2

            RETURNING *
            `,
            [
                notificationId,

                userId,
            ]
        );


    return (
        result.rows[0] ||
        null
    );

}


// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================

async function markAllNotificationsRead(
    userId
) {

    const result =
        await db.query(
            `
            UPDATE notifications

            SET

                is_read = TRUE,

                read_at =
                    COALESCE(
                        read_at,
                        NOW()
                    )

            WHERE

                user_id = $1

                AND

                is_read = FALSE

            RETURNING id
            `,
            [
                userId,
            ]
        );


    return {

        count:
            result.rowCount || 0,

    };

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    createNotification,

    createNotifications,

    getUserNotifications,

    getUnreadNotificationCount,

    markNotificationRead,

    markAllNotificationsRead,

};