// ======================================================
// CAVE TUNES
// VERIFIED USER MIDDLEWARE
// middleware/verifiedMiddleware.js
// ======================================================

const pool = require("../config/database");


// ======================================================
// REQUIRE VERIFIED USER
// ======================================================
//
// This middleware must run AFTER authMiddleware.
//
// It checks the REAL verification status from PostgreSQL.
// The frontend cannot bypass this check.
//
// ======================================================

const requireVerifiedUser =
    async (req, res, next) => {

        try {

            // ==================================================
            // AUTHENTICATION CHECK
            // ==================================================

            if (!req.userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            // ==================================================
            // GET USER VERIFICATION STATUS
            // ==================================================

            const result =
                await pool.query(

                    `
                    SELECT
                        id,
                        verified
                    FROM users
                    WHERE id = $1
                    LIMIT 1
                    `,

                    [
                        req.userId
                    ]

                );


            // ==================================================
            // USER NOT FOUND
            // ==================================================

            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            const user =
                result.rows[0];


            // ==================================================
            // VERIFICATION CHECK
            // ==================================================

            const isVerified =
                user.verified === true ||
                user.verified === "true";


            if (!isVerified) {

                return res.status(403).json({

                    success: false,

                    code:
                        "ACCOUNT_NOT_VERIFIED",

                    message:
                        "Your Cave Tunes account must be verified before you can access this feature."

                });

            }


            // ==================================================
            // ATTACH VERIFICATION STATUS
            // ==================================================

            req.user.verified =
                true;


            req.isVerified =
                true;


            // ==================================================
            // CONTINUE
            // ==================================================

            return next();

        }

        catch (error) {

            console.error(
                "VERIFICATION CHECK ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to verify account status."

            });

        }

    };


// ======================================================
// EXPORT
// ======================================================

module.exports =
    requireVerifiedUser;