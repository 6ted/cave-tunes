
// ======================================================
// CAVE TUNES - USER SETTINGS ROUTES
// routes/settingsRoutes.js
// ======================================================

const express = require("express");
const router = express.Router();

const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// GET LOGGED-IN USER PREFERENCES
// GET /api/settings/preferences
// ======================================================

router.get(
    "/preferences",
    authMiddleware,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT theme_preference
                 FROM users
                 WHERE id = $1`,
                [req.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User account not found."
                });
            }

            return res.json({
                success: true,
                theme_preference:
                    result.rows[0].theme_preference || "dark"
            });

        } catch (error) {
            console.error(
                "GET USER PREFERENCES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Could not load account preferences."
            });
        }
    }
);

// ======================================================
// UPDATE LOGGED-IN USER PREFERENCES
// PUT /api/settings/preferences
// ======================================================

router.put(
    "/preferences",
    authMiddleware,
    async (req, res) => {
        try {
            const { theme_preference } = req.body;

            if (
                !["light", "dark"].includes(theme_preference)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid theme preference."
                });
            }

            const result = await db.query(
                `UPDATE users
                 SET theme_preference = $1
                 WHERE id = $2
                 RETURNING theme_preference`,
                [
                    theme_preference,
                    req.userId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User account not found."
                });
            }

            return res.json({
                success: true,
                message: "Theme preference saved successfully.",
                theme_preference:
                    result.rows[0].theme_preference
            });

        } catch (error) {
            console.error(
                "UPDATE USER PREFERENCES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Could not save account preferences."
            });
        }
    }
);

module.exports = router;
