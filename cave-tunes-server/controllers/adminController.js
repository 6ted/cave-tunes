
const db = require("../config/database");

const {
    createNotification
} = require("../services/notificationService");

// ======================================================
// VERIFICATION LEVEL — SAME LOGIC AS AUTH CONTROLLER
// ======================================================

function booleanValue(value) {
    if (value === true || value === 1) {
        return true;
    }

    if (
        value === false ||
        value === 0 ||
        value === null ||
        value === undefined
    ) {
        return false;
    }

    return ["true", "t", "1"].includes(
        String(value).trim().toLowerCase()
    );
}


function getVerificationLevel(user) {
    const verified = booleanValue(user?.verified);
    const monetized = booleanValue(user?.monetized);

    if (verified && monetized) {
        return "master";
    }

    if (verified) {
        return "verified";
    }

    return "none";
}
// ======================================================
// CAVE TUNES ADMIN CONTROLLER
// controllers/adminController.js
// ======================================================



// ======================================================
// DASHBOARD STATISTICS
// ======================================================

exports.dashboard = async (req, res) => {

    try {

        const usersResult = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM users
        `);

        const artistsResult = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM users
            WHERE role IN (
                'artist',
                'producer',
                'dj',
                'record_label',
                'podcaster'
            )
        `);

        const listenersResult = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM users
            WHERE role = 'listener'
        `);

        const songsResult = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM songs
        `);

        const albumsResult = await db.query(`
            SELECT COUNT(DISTINCT album_name)::int AS count
            FROM songs
            WHERE album_name IS NOT NULL
            AND TRIM(album_name) <> ''
        `);

        const playsResult = await db.query(`
            SELECT COALESCE(SUM(plays), 0)::bigint AS count
            FROM songs
        `);

        const likesResult = await db.query(`
            SELECT COALESCE(SUM(likes), 0)::bigint AS count
            FROM songs
        `);

        const downloadsResult = await db.query(`
            SELECT COALESCE(SUM(downloads), 0)::bigint AS count
            FROM songs
        `);


        return res.json({

            success: true,

            stats: {

                users:
                    usersResult.rows[0].count,

                artists:
                    artistsResult.rows[0].count,

                listeners:
                    listenersResult.rows[0].count,

                songs:
                    songsResult.rows[0].count,

                albums:
                    albumsResult.rows[0].count,

                plays:
                    Number(
                        playsResult.rows[0].count
                    ),

                likes:
                    Number(
                        likesResult.rows[0].count
                    ),

                downloads:
                    Number(
                        downloadsResult.rows[0].count
                    )

            }

        });

    }

    catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load administrator dashboard."

        });

    }

};



// ======================================================
// GET ALL USERS
// ======================================================

exports.getUsers = async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                id,
                username,
                email,
                role,
                is_admin,
                country,
                profile_image_url,
                verified,
                monetized,
                created_at
            FROM users
            ORDER BY created_at DESC
        `);

        const users = result.rows.map((user) => {

            const verified = booleanValue(user.verified);
            const monetized = booleanValue(user.monetized);

            return {
                ...user,

                is_admin: booleanValue(user.is_admin),

                verified,

                monetized,

                verification_level: getVerificationLevel({
                    verified,
                    monetized
                })
            };

        });

        return res.json({

            success: true,

            users

        });

    }

    catch (error) {

        console.error(
            "ADMIN GET USERS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load users."

        });

    }

};



// ======================================================
// GET ONE USER
// ======================================================

exports.getUser = async (req, res) => {

    try {

        const userId =
            Number(req.params.id);

        if (!Number.isInteger(userId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user ID."

            });

        }

        const result = await db.query(
            `
            SELECT
                id,
                username,
                email,
                role,
                is_admin,
                country,
                profile_image_url,
                verified,
                monetized,
                created_at
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }

        const user = result.rows[0];

        const verified = booleanValue(user.verified);
        const monetized = booleanValue(user.monetized);

        const formattedUser = {

            ...user,

            is_admin: booleanValue(user.is_admin),

            verified,

            monetized,

            verification_level: getVerificationLevel({
                verified,
                monetized
            })

        };

        return res.json({

            success: true,

            user: formattedUser

        });

    }

    catch (error) {

        console.error(
            "ADMIN GET USER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load user."

        });

    }

};


// ======================================================
// UPDATE ADMIN STATUS
// ======================================================

exports.updateAdminStatus = async (
    req,
    res
) => {

    try {

        const userId =
            Number(req.params.id);

        const {
            is_admin
        } = req.body;


        if (!Number.isInteger(userId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user ID."

            });

        }


        if (
            typeof is_admin !== "boolean"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "is_admin must be true or false."

            });

        }


        // Prevent administrator from
        // removing their own admin access.

        if (
            Number(req.user.id) === userId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "You cannot change your own administrator status."

            });

        }


        const result = await db.query(
            `
            UPDATE users
            SET is_admin = $1
            WHERE id = $2
            RETURNING
                id,
                username,
                email,
                role,
                is_admin
            `,
            [
                is_admin,
                userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        return res.json({

            success: true,

            message:
                is_admin
                    ? "Administrator access granted."
                    : "Administrator access removed.",

            user:
                result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "ADMIN STATUS UPDATE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update administrator status."

        });

    }

};



// ======================================================
// UPDATE USER ROLE
// ======================================================

exports.updateUserRole = async (
    req,
    res
) => {

    try {

        const userId =
            Number(req.params.id);

        const {
            role
        } = req.body;


        const allowedRoles = [
            "listener",
            "artist",
            "producer",
            "dj",
            "record_label",
            "podcaster"
        ];


        if (!Number.isInteger(userId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user ID."

            });

        }


        if (
            !allowedRoles.includes(role)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user role."

            });

        }


        const result = await db.query(
            `
            UPDATE users
            SET role = $1
            WHERE id = $2
            RETURNING
                id,
                username,
                email,
                role,
                is_admin
            `,
            [
                role,
                userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        return res.json({

            success: true,

            message:
                "User role updated successfully.",

            user:
                result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "ADMIN ROLE UPDATE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update user role."

        });

    }

};



// ======================================================
// DELETE USER
// ======================================================

exports.deleteUser = async (
    req,
    res
) => {

    try {

        const userId =
            Number(req.params.id);


        if (!Number.isInteger(userId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user ID."

            });

        }


        // Prevent administrator from
        // deleting their own account.

        if (
            Number(req.user.id) === userId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "You cannot delete your own administrator account."

            });

        }


        const result = await db.query(
            `
            DELETE FROM users
            WHERE id = $1
            RETURNING
                id,
                username,
                email
            `,
            [userId]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        return res.json({

            success: true,

            message:
                "User deleted successfully.",

            user:
                result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "ADMIN DELETE USER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to delete user."

        });

    }

};



// ======================================================
// GET ALL SONGS
// ======================================================

exports.getSongs = async (
    req,
    res
) => {

    try {

        const result = await db.query(`
            SELECT
                id,
                user_id,
                title,
                song_title,
                artist_name,
                album_name,
                release_type,
                genre,
                country,
                audio_url,
                cover_url,
                duration,
                plays,
                likes,
                downloads,
                status,
                created_at
            FROM songs
            ORDER BY created_at DESC
        `);


        return res.json({

            success: true,

            songs:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "ADMIN GET SONGS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load songs."

        });

    }

};



// ======================================================
// GET TOP SONGS
// ======================================================

exports.getTopSongs = async (
    req,
    res
) => {

    try {

        const result = await db.query(`
            SELECT
                id,
                title,
                song_title,
                artist_name,
                cover_url,
                plays,
                likes,
                downloads
            FROM songs
            ORDER BY
                COALESCE(plays, 0) DESC,
                COALESCE(likes, 0) DESC
            LIMIT 10
        `);


        return res.json({

            success: true,

            songs:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "ADMIN TOP SONGS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load top songs."

        });

    }

};



// ======================================================
// DELETE SONG
// ======================================================

exports.deleteSong = async (
    req,
    res
) => {

    try {

        const songId =
            Number(req.params.id);


        if (!Number.isInteger(songId)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid song ID."

            });

        }


        const result = await db.query(
            `
            DELETE FROM songs
            WHERE id = $1
            RETURNING
                id,
                title,
                song_title,
                audio_url,
                cover_url
            `,
            [songId]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Song not found."

            });

        }


        return res.json({

            success: true,

            message:
                "Song deleted successfully.",

            song:
                result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "ADMIN DELETE SONG ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to delete song."

        });

    }

};



// ======================================================
// GET VERIFICATION REQUESTS
// ======================================================

exports.getVerificationRequests = async (
    req,
    res
) => {

    try {

        const result = await db.query(`
            SELECT
                vr.id,
                vr.user_id,
                vr.role,
                vr.email,
                vr.country,
                vr.payment_method,
                vr.payment_proof_url,
                vr.verification_fee,
                vr.status,
                vr.created_at,
                vr.admin_notes,
                vr.reviewed_by,
                vr.reviewed_at,

                u.username

            FROM verification_requests vr

            LEFT JOIN users u
            ON vr.user_id = u.id

            ORDER BY vr.created_at DESC
        `);


        return res.json({

            success: true,

            requests:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "GET VERIFICATION REQUESTS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load verification requests."

        });

    }

};



// ======================================================
// UPDATE VERIFICATION REQUEST
// ======================================================

exports.updateVerificationRequest = async (
    req,
    res
) => {

    try {

        const requestId =
            Number(req.params.id);

        const {
            status,
            admin_notes
        } = req.body;


        if (
            !Number.isInteger(requestId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid request ID."

            });

        }


        if (
            ![
                "approved",
                "rejected",
                "pending"
            ].includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid verification status."

            });

        }


        // --------------------------------------------------
        // GET EXISTING REQUEST
        // --------------------------------------------------

        const existingResult =
            await db.query(
                `
                SELECT
                    id,
                    user_id,
                    status
                FROM verification_requests
                WHERE id = $1
                `,
                [requestId]
            );


        if (
            existingResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Verification request not found."

            });

        }


        const existingRequest =
            existingResult.rows[0];

        const oldStatus =
            existingRequest.status;


        // --------------------------------------------------
        // UPDATE REQUEST
        // --------------------------------------------------

        const result =
            await db.query(
                `
                UPDATE verification_requests

                SET
                    status = $1,
                    admin_notes = COALESCE($2, admin_notes),
                    reviewed_by = $3,
                    reviewed_at = NOW()

                WHERE id = $4

                RETURNING *
                `,
                [
                    status,
                    admin_notes || null,
                    req.user.id,
                    requestId
                ]
            );


        const updatedRequest =
            result.rows[0];


        // --------------------------------------------------
        // UPDATE USER VERIFICATION STATUS
        // --------------------------------------------------

        if (
            status === "approved"
        ) {

            await db.query(
                `
                UPDATE users
                SET verified = true
                WHERE id = $1
                `,
                [
                    updatedRequest.user_id
                ]
            );

        }


        else if (
            status === "rejected"
        ) {

            await db.query(
                `
                UPDATE users
                SET verified = false
                WHERE id = $1
                `,
                [
                    updatedRequest.user_id
                ]
            );

        }


        // --------------------------------------------------
        // NOTIFY REQUESTING USER
        // ONLY WHEN STATUS CHANGES
        // --------------------------------------------------

        if (
            oldStatus !== status
        ) {

            try {

                if (
                    status === "approved"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "verification_approved",

                        title:
                            "Verification approved",

                        message:
                            "Congratulations! Your Cave Tunes verification request has been approved. Your profile is now verified.",

                        actionUrl:
                            "/profile",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "verification",

                            status:
                                "approved"

                        }

                    });

                }


                else if (
                    status === "rejected"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "verification_rejected",

                        title:
                            "Verification request rejected",

                        message:
                            "Your Cave Tunes verification request was not approved. Please review your verification details and submit a new request if you are eligible.",

                        actionUrl:
                            "/verification",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "verification",

                            status:
                                "rejected",

                            admin_notes:
                                updatedRequest.admin_notes || null

                        }

                    });

                }

            }

            catch (notificationError) {

                console.error(
                    "VERIFICATION NOTIFICATION ERROR:",
                    notificationError
                );

            }

        }


        return res.json({

            success: true,

            message:
                `Verification request ${status}.`,

            request:
                updatedRequest

        });

    }

    catch (error) {

        console.error(
            "UPDATE VERIFICATION ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update verification request."

        });

    }

};



// ======================================================
// GET MONETIZATION REQUESTS
// ======================================================

exports.getMonetizationRequests = async (
    req,
    res
) => {

    try {

        const result = await db.query(
            `
            SELECT
                mr.id,
                mr.user_id,
                mr.status,
                mr.created_at,

                u.username,
                u.email,
                u.role

            FROM monetization_requests mr

            JOIN users u
            ON u.id = mr.user_id

            ORDER BY mr.created_at DESC
            `
        );


        return res.json({

            success: true,

            requests:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "GET MONETIZATION REQUESTS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load monetization requests."

        });

    }

};



// ======================================================
// UPDATE MONETIZATION REQUEST
// ======================================================

exports.updateMonetizationRequest = async (
    req,
    res
) => {

    try {

        const requestId =
            Number(req.params.id);

        const {
            status
        } = req.body;


        if (
            !Number.isInteger(requestId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid request ID."

            });

        }


        if (
            ![
                "approved",
                "rejected"
            ].includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid status."

            });

        }


        // --------------------------------------------------
        // GET EXISTING REQUEST
        // --------------------------------------------------

        const existingResult =
            await db.query(
                `
                SELECT
                    id,
                    user_id,
                    status
                FROM monetization_requests
                WHERE id = $1
                `,
                [requestId]
            );


        if (
            existingResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Request not found."

            });

        }


        const monetizationRequest =
            existingResult.rows[0];

        const oldStatus =
            monetizationRequest.status;


        // --------------------------------------------------
        // UPDATE REQUEST
        // --------------------------------------------------

        const result =
            await db.query(
                `
                UPDATE monetization_requests

                SET status = $1

                WHERE id = $2

                RETURNING *
                `,
                [
                    status,
                    requestId
                ]
            );


        const updatedRequest =
            result.rows[0];


        // --------------------------------------------------
        // ACTIVATE MONETIZATION
        // --------------------------------------------------

        if (
            status === "approved"
        ) {

            await db.query(
                `
                UPDATE users
                SET monetized = true
                WHERE id = $1
                `,
                [
                    updatedRequest.user_id
                ]
            );

        }


        // --------------------------------------------------
        // NOTIFY REQUESTING USER
        // --------------------------------------------------

        if (
            oldStatus !== status
        ) {

            try {

                if (
                    status === "approved"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "monetization_approved",

                        title:
                            "Monetization approved",

                        message:
                            "Congratulations! Your Cave Tunes account has been approved for monetization.",

                        actionUrl:
                            "/monetization",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "monetization",

                            status:
                                "approved"

                        }

                    });

                }


                else if (
                    status === "rejected"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "monetization_rejected",

                        title:
                            "Monetization application rejected",

                        message:
                            "Your Cave Tunes monetization application was not approved. Please review the requirements and try again.",

                        actionUrl:
                            "/monetization",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "monetization",

                            status:
                                "rejected"

                        }

                    });

                }

            }

            catch (notificationError) {

                console.error(
                    "MONETIZATION NOTIFICATION ERROR:",
                    notificationError
                );

            }

        }


        return res.json({

            success: true,

            message:
                `Monetization request ${status}.`,

            request:
                updatedRequest

        });

    }

    catch (error) {

        console.error(
            "UPDATE MONETIZATION ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update monetization request."

        });

    }

};



// ======================================================
// GET WITHDRAW REQUESTS
// ======================================================

exports.getWithdrawRequests = async (
    req,
    res
) => {

    try {

        const result = await db.query(
            `
            SELECT
                wr.id,
                wr.user_id,
                wr.amount,
                wr.payment_method,
                wr.account_details,
                wr.status,
                wr.created_at,

                u.username,
                u.email

            FROM withdraw_requests wr

            JOIN users u
            ON u.id = wr.user_id

            ORDER BY wr.created_at DESC
            `
        );


        return res.json({

            success: true,

            requests:
                result.rows

        });

    }

    catch (error) {

        console.error(
            "GET WITHDRAW REQUESTS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load withdrawal requests."

        });

    }

};



// ======================================================
// UPDATE WITHDRAW REQUEST
// ======================================================

exports.updateWithdrawRequest = async (
    req,
    res
) => {

    try {

        const requestId =
            Number(req.params.id);

        const {
            status
        } = req.body;


        if (
            !Number.isInteger(requestId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid request ID."

            });

        }


        if (
            ![
                "paid",
                "rejected"
            ].includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid withdrawal status."

            });

        }


        // --------------------------------------------------
        // GET EXISTING WITHDRAWAL
        // --------------------------------------------------

        const existingResult =
            await db.query(
                `
                SELECT
                    id,
                    user_id,
                    status
                FROM withdraw_requests
                WHERE id = $1
                `,
                [requestId]
            );


        if (
            existingResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Withdrawal request not found."

            });

        }


        const withdrawalRequest =
            existingResult.rows[0];

        const oldStatus =
            withdrawalRequest.status;


        // --------------------------------------------------
        // UPDATE WITHDRAWAL
        // --------------------------------------------------

        const result =
            await db.query(
                `
                UPDATE withdraw_requests

                SET status = $1

                WHERE id = $2

                RETURNING *
                `,
                [
                    status,
                    requestId
                ]
            );


        const updatedRequest =
            result.rows[0];


        // --------------------------------------------------
        // NOTIFY REQUESTING USER
        // --------------------------------------------------

        if (
            oldStatus !== status
        ) {

            try {

                if (
                    status === "paid"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "withdrawal_approved",

                        title:
                            "Withdrawal approved",

                        message:
                            "Your Cave Tunes withdrawal request has been approved and marked as paid.",

                        actionUrl:
                            "/wallet",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "withdrawal",

                            status:
                                "paid",

                            amount:
                                updatedRequest.amount

                        }

                    });

                }


                else if (
                    status === "rejected"
                ) {

                    await createNotification({

                        userId:
                            updatedRequest.user_id,

                        actorUserId:
                            req.user.id,

                        type:
                            "withdrawal_rejected",

                        title:
                            "Withdrawal request rejected",

                        message:
                            "Your Cave Tunes withdrawal request was not approved. Please review your withdrawal details or contact support.",

                        actionUrl:
                            "/wallet",

                        metadata: {

                            request_id:
                                updatedRequest.id,

                            request_type:
                                "withdrawal",

                            status:
                                "rejected",

                            amount:
                                updatedRequest.amount

                        }

                    });

                }

            }

            catch (notificationError) {

                console.error(
                    "WITHDRAWAL NOTIFICATION ERROR:",
                    notificationError
                );

            }

        }


        return res.json({

            success: true,

            message:
                `Withdrawal request ${status}.`,

            request:
                updatedRequest

        });

    }

    catch (error) {

        console.error(
            "UPDATE WITHDRAW ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update withdrawal request."

        });

    }

};


// ======================================================
// USER ANALYTICS
// GET /api/admin/analytics?period=month
// ======================================================

exports.getUserAnalytics = async (req, res) => {
    try {
        const period = String(
            req.query.period || "month"
        ).toLowerCase();

        // --------------------------------------------------
        // ALLOWED ANALYTICS PERIODS
        // --------------------------------------------------

        const periods = {
            "7days": {
                start: "CURRENT_DATE - INTERVAL '6 days'",
                previousStart: "CURRENT_DATE - INTERVAL '13 days'",
                previousEnd: "CURRENT_DATE - INTERVAL '6 days'",
                grouping: "day"
            },

            month: {
                start: "DATE_TRUNC('month', NOW())",
                previousStart: "DATE_TRUNC('month', NOW()) - INTERVAL '1 month'",
                previousEnd: "DATE_TRUNC('month', NOW())",
                grouping: "day"
            },

            last_month: {
                start: "DATE_TRUNC('month', NOW()) - INTERVAL '1 month'",
                previousStart: "DATE_TRUNC('month', NOW()) - INTERVAL '2 months'",
                previousEnd: "DATE_TRUNC('month', NOW()) - INTERVAL '1 month'",
                grouping: "day"
            },

            "3months": {
                start: "DATE_TRUNC('month', NOW()) - INTERVAL '2 months'",
                previousStart: "DATE_TRUNC('month', NOW()) - INTERVAL '5 months'",
                previousEnd: "DATE_TRUNC('month', NOW()) - INTERVAL '2 months'",
                grouping: "month"
            },

            "6months": {
                start: "DATE_TRUNC('month', NOW()) - INTERVAL '5 months'",
                previousStart: "DATE_TRUNC('month', NOW()) - INTERVAL '11 months'",
                previousEnd: "DATE_TRUNC('month', NOW()) - INTERVAL '5 months'",
                grouping: "month"
            },

            year: {
                start: "DATE_TRUNC('year', NOW())",
                previousStart: "DATE_TRUNC('year', NOW()) - INTERVAL '1 year'",
                previousEnd: "DATE_TRUNC('year', NOW())",
                grouping: "month"
            },

            all: {
                start: "COALESCE((SELECT MIN(created_at) FROM users), NOW())",
                previousStart: null,
                previousEnd: null,
                grouping: "month"
            }
        };

        const selectedPeriod = periods[period];

        if (!selectedPeriod) {
            return res.status(400).json({
                success: false,
                message: "Invalid analytics period."
            });
        }

        const grouping = selectedPeriod.grouping;

        const startExpression = selectedPeriod.start;

        // --------------------------------------------------
        // REGISTRATION SUMMARY
        // --------------------------------------------------

        let previousUsersExpression = "0";

        if (
            selectedPeriod.previousStart &&
            selectedPeriod.previousEnd
        ) {
            previousUsersExpression = `
                (
                    SELECT COUNT(*)::int
                    FROM users
                    WHERE created_at >=
                        ${selectedPeriod.previousStart}
                    AND created_at <
                        ${selectedPeriod.previousEnd}
                )
            `;
        }

        const summaryQuery = `
            WITH boundaries AS (
                SELECT
                    (${startExpression})::timestamp AS period_start,
                    NOW()::timestamp AS period_end
            )

            SELECT
                (
                    SELECT COUNT(*)::int
                    FROM users, boundaries
                    WHERE users.created_at >= boundaries.period_start
                    AND users.created_at < boundaries.period_end
                ) AS new_users,

                ${previousUsersExpression} AS previous_users,

                (
                    SELECT COUNT(*)::int
                    FROM users
                ) AS total_users,

                (
                    SELECT COUNT(*)::int
                    FROM users
                    WHERE verified = TRUE
                ) AS verified_users,

                (
                    SELECT COUNT(*)::int
                    FROM users
                    WHERE monetized = TRUE
                ) AS monetized_users
        `;

        const summaryResult = await db.query(
            summaryQuery
        );

        const summary = summaryResult.rows[0];

        // --------------------------------------------------
        // REGISTRATION GRAPH
        // --------------------------------------------------

        const graphQuery = `
            WITH boundaries AS (
                SELECT
                    (${startExpression})::timestamp AS period_start,
                    NOW()::timestamp AS period_end
            ),

            date_series AS (
                SELECT generate_series(
                    DATE_TRUNC(
                        '${grouping}',
                        boundaries.period_start
                    ),
                    DATE_TRUNC(
                        '${grouping}',
                        boundaries.period_end
                    ),
                    make_interval(
                        ${grouping === "day" ? "days => 1" : "months => 1"}
                    )
                ) AS date

                FROM boundaries
            ),

            registrations AS (
                SELECT
                    DATE_TRUNC(
                        '${grouping}',
                        users.created_at
                    ) AS date,

                    COUNT(*)::int AS users

                FROM users, boundaries

                WHERE users.created_at >= boundaries.period_start
                AND users.created_at < boundaries.period_end

                GROUP BY 1
            )

            SELECT
                TO_CHAR(
                    date_series.date,
                    '${grouping === "day" ? "YYYY-MM-DD" : "YYYY-MM"}'
                ) AS date,

                COALESCE(
                    registrations.users,
                    0
                ) AS users

            FROM date_series

            LEFT JOIN registrations
                ON registrations.date = date_series.date

            ORDER BY date_series.date ASC
        `;

        const graphResult = await db.query(
            graphQuery
        );

        // --------------------------------------------------
        // USERS BY ROLE
        // --------------------------------------------------

        const roleResult = await db.query(`
            SELECT
                COALESCE(role, 'unknown') AS role,
                COUNT(*)::int AS users

            FROM users

            GROUP BY role

            ORDER BY users DESC
        `);

        // --------------------------------------------------
        // USERS BY COUNTRY
        // --------------------------------------------------

        const countryResult = await db.query(`
            SELECT
                COALESCE(
                    NULLIF(TRIM(country), ''),
                    'Unknown'
                ) AS country,

                COUNT(*)::int AS users

            FROM users

            GROUP BY 1

            ORDER BY users DESC

            LIMIT 10
        `);

        // --------------------------------------------------
        // GROWTH PERCENTAGE
        // --------------------------------------------------

        const currentUsers = Number(
            summary.new_users || 0
        );

        const previousUsers = Number(
            summary.previous_users || 0
        );

        let growthPercentage = null;

        // All-time has no previous comparison period.
        if (
            selectedPeriod.previousStart &&
            selectedPeriod.previousEnd
        ) {
            growthPercentage = 0;

            if (previousUsers > 0) {
                growthPercentage = Number(
                    (
                        (
                            (currentUsers - previousUsers) /
                            previousUsers
                        ) * 100
                    ).toFixed(2)
                );
            } else if (currentUsers > 0) {
                growthPercentage = 100;
            }
        }

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.json({
            success: true,

            period,

            summary: {
                newUsers: currentUsers,

                previousUsers,

                totalUsers: Number(
                    summary.total_users || 0
                ),

                verifiedUsers: Number(
                    summary.verified_users || 0
                ),

                monetizedUsers: Number(
                    summary.monetized_users || 0
                ),

                growthPercentage
            },

            registrations: graphResult.rows.map(
                item => ({
                    date: item.date,
                    users: Number(item.users)
                })
            ),

            roles: roleResult.rows.map(
                item => ({
                    role: item.role,
                    users: Number(item.users)
                })
            ),

            countries: countryResult.rows.map(
                item => ({
                    country: item.country,
                    users: Number(item.users)
                })
            )
        });

    } catch (error) {
        console.error(
            "ADMIN USER ANALYTICS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load user analytics."
        });
    }
};


// ======================================================
// ADMIN NOTIFICATIONS
// ======================================================

const crypto = require("crypto");


// ======================================================
// SEND ADMIN NOTIFICATION
// POST /api/admin/notifications/send
// ======================================================

exports.sendAdminNotification = async (req, res) => {

    try {

        const {
            audience,
            userId,
            title,
            message,
            actionUrl,
            delivery = "in_app"
        } = req.body;


        // --------------------------------------------------
        // VALIDATION
        // --------------------------------------------------

        if (!["all", "user"].includes(audience)) {

            return res.status(400).json({
                success: false,
                message: "Select a valid notification audience."
            });

        }


        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150
        ) {

            return res.status(400).json({
                success: false,
                message: "Title is required and must not exceed 150 characters."
            });

        }


        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.trim().length > 5000
        ) {

            return res.status(400).json({
                success: false,
                message: "Message is required and must not exceed 5000 characters."
            });

        }


        if (!["in_app", "email"].includes(delivery)) {

            return res.status(400).json({
                success: false,
                message: "Invalid notification delivery method."
            });

        }


        if (
            actionUrl !== undefined &&
            actionUrl !== null &&
            (
                typeof actionUrl !== "string" ||
                actionUrl.length > 500 ||
                !actionUrl.startsWith("/") ||
                actionUrl.startsWith("//")
            )
        ) {

            return res.status(400).json({
                success: false,
                message: "Action URL must be a valid relative frontend path."
            });

        }


        // --------------------------------------------------
        // IDENTIFY RECIPIENTS
        // --------------------------------------------------

        let recipients;

        if (audience === "all") {

            recipients = await db.query(`
                SELECT id
                FROM users
                ORDER BY id ASC
            `);

        } else {

            const targetUserId = Number(userId);

            if (
                !Number.isSafeInteger(targetUserId) ||
                targetUserId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "A valid user ID is required."
                });

            }

            recipients = await db.query(
                `
                SELECT id
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
                [targetUserId]
            );

        }


        if (recipients.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    audience === "user"
                        ? "Selected user was not found."
                        : "No users are available."
            });

        }


        // --------------------------------------------------
        // GENERATE ANNOUNCEMENT ID
        // --------------------------------------------------

        const broadcastId = crypto.randomUUID();

        const actorUserId =
            req.user.id;


        const metadata = {
            broadcast_id: broadcastId,
            audience,
            delivery,
            sent_by: actorUserId
        };


        // --------------------------------------------------
        // IN-APP ONLY DELIVERY
        // --------------------------------------------------

        if (delivery === "in_app") {

            const insertResult = await db.query(
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

                SELECT
                    u.id,
                    $1,
                    NULL,
                    'admin_announcement',
                    $2,
                    $3,
                    $4,
                    $5::jsonb

                FROM users u

                WHERE
                    $6::boolean = TRUE
                    OR u.id = $7

                RETURNING id
                `,
                [
                    actorUserId,
                    title.trim(),
                    message.trim(),
                    actionUrl || null,
                    JSON.stringify(metadata),
                    audience === "all",
                    audience === "user"
                        ? Number(userId)
                        : null
                ]
            );


            return res.status(201).json({

                success: true,

                message:
                    audience === "all"
                        ? "Global announcement sent successfully."
                        : "User notification sent successfully.",

                broadcastId,

                audience,

                delivery,

                recipients:
                    insertResult.rowCount

            });

        }


        // --------------------------------------------------
        // IN-APP + EMAIL DELIVERY
        // --------------------------------------------------

        let created = 0;

        let failed = 0;


        for (const recipient of recipients.rows) {

            try {

                await createNotification({

                    userId: recipient.id,

                    actorUserId,

                    type: "admin_announcement",

                    title: title.trim(),

                    message: message.trim(),

                    actionUrl: actionUrl || null,

                    metadata

                });

                created++;

            }

            catch (error) {

                failed++;

                console.error(
                    "ADMIN NOTIFICATION DELIVERY ERROR:",
                    {
                        userId: recipient.id,
                        error: error.message
                    }
                );

            }

        }


        return res.status(201).json({

            success: true,

            message:
                "Notification processing completed.",

            broadcastId,

            audience,

            delivery,

            recipients: recipients.rows.length,

            created,

            failed

        });

    }

    catch (error) {

        console.error(
            "ADMIN SEND NOTIFICATION ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to send administrator notification."

        });

    }

};


// ======================================================
// ADMIN NOTIFICATION HISTORY
// GET /api/admin/notifications/history
// ======================================================

exports.getAdminNotificationHistory = async (req, res) => {

    try {

        const result = await db.query(
            `
            SELECT

                n.metadata->>'broadcast_id'
                    AS broadcast_id,

                n.metadata->>'audience'
                    AS audience,

                n.metadata->>'delivery'
                    AS delivery,

                n.title,

                n.message,

                n.action_url,

                COUNT(*)::int
                    AS recipients,

                COUNT(*) FILTER (
                    WHERE n.is_read = TRUE
                )::int AS read_count,

                COUNT(*) FILTER (
                    WHERE n.is_read = FALSE
                )::int AS unread_count,

                MAX(n.created_at)
                    AS created_at,

                admin.username
                    AS sent_by_username

            FROM notifications n

            LEFT JOIN users admin
                ON admin.id = n.actor_user_id

            WHERE
                n.type = 'admin_announcement'

            GROUP BY
                n.metadata->>'broadcast_id',
                n.metadata->>'audience',
                n.metadata->>'delivery',
                n.title,
                n.message,
                n.action_url,
                admin.username

            ORDER BY
                MAX(n.created_at) DESC

            LIMIT 100
            `
        );


        return res.json({

            success: true,

            notifications: result.rows

        });

    }

    catch (error) {

        console.error(
            "ADMIN NOTIFICATION HISTORY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load notification history."

        });

    }

};


// ======================================================
// ADMIN NOTIFICATION STATISTICS
// GET /api/admin/notifications/stats
// ======================================================

exports.getAdminNotificationStats = async (req, res) => {

    try {

        const result = await db.query(`
            SELECT

                COUNT(*)::int AS total_notifications,

                COUNT(*) FILTER (
                    WHERE is_read = TRUE
                )::int AS read_notifications,

                COUNT(*) FILTER (
                    WHERE is_read = FALSE
                )::int AS unread_notifications,

                COUNT(DISTINCT metadata->>'broadcast_id')::int
                    AS total_announcements

            FROM notifications

            WHERE
                type = 'admin_announcement'
        `);


        const stats = result.rows[0];


        return res.json({

            success: true,

            stats: {

                totalNotifications:
                    Number(stats.total_notifications),

                readNotifications:
                    Number(stats.read_notifications),

                unreadNotifications:
                    Number(stats.unread_notifications),

                totalAnnouncements:
                    Number(stats.total_announcements)

            }

        });

    }

    catch (error) {

        console.error(
            "ADMIN NOTIFICATION STATS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load notification statistics."

        });

    }

};
