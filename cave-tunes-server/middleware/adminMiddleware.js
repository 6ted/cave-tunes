
// ======================================================
// CAVE TUNES ADMIN MIDDLEWARE
// middleware/adminMiddleware.js
// ======================================================

const db = require("../config/database");

// ======================================================
// REQUIRE ADMIN ACCESS
// ======================================================

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (!req.adminSessionId) {
            return res.status(401).json({
                success: false,
                message: "Administrator session missing. Please login again."
            });
        }

        // Verify all three conditions:
        // 1. Session belongs to the authenticated user.
        // 2. Session has not expired, been revoked, or been inactive.
        // 3. User is still an administrator.

        const result = await db.query(
            `
            UPDATE admin_sessions AS s

            SET last_activity_at = NOW()

            FROM users AS u

            WHERE
                s.session_id = $1::uuid
                AND s.user_id = $2
                AND u.id = s.user_id
                AND u.is_admin = TRUE
                AND s.revoked_at IS NULL
                AND s.expires_at > NOW()
                AND s.last_activity_at >
                    NOW() - INTERVAL '30 minutes'

            RETURNING
                u.id,
                u.username,
                u.email,
                u.role,
                u.is_admin
            `,
            [
                req.adminSessionId,
                req.userId
            ]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message:
                    "Administrator session expired or revoked. Please login again."
            });
        }

        const user = result.rows[0];

        req.adminUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            is_admin: true
        };

        req.isAdmin = true;

        return next();

    } catch (error) {
        console.error(
            "ADMIN MIDDLEWARE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify administrator access."
        });
    }
};

module.exports = adminMiddleware;
