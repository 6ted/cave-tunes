// ======================================================
// CAVE TUNES
// MONETIZATION ACCESS MIDDLEWARE
// middleware/requireMonetized.js
// ======================================================

const pool = require("../config/database");

async function requireMonetized(req, res, next) {

    try {

        const userId =
            Number(
                req.user?.id ||
                req.userId
            );

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized. Please login."

            });

        }

        // PostgreSQL is the source of truth.
        const result =
            await pool.query(

                `
                SELECT monetized
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [userId]

            );

        if (!result.rows.length) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }

        const monetized =
            result.rows[0].monetized === true;

        if (!monetized) {

            return res.status(403).json({

                success: false,

                monetized: false,

                message:
                    "Monetization approval is required to access this feature."

            });

        }

        return next();

    } catch (error) {

        console.error(
            "MONETIZATION ACCESS CHECK ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to verify monetization access."

        });

    }

}

module.exports = requireMonetized;