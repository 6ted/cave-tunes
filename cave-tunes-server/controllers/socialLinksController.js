
const db = require("../config/database");

// Only these platforms can be saved.
const ALLOWED_PLATFORMS = [
    "instagram",
    "tiktok",
    "facebook",
    "youtube",
    "x",
    "soundcloud",
    "audiomack",
    "spotify",
    "whatsapp",
    "telegram",
    "threads",
    "snapchat",
    "linkedin",
    "website"
];

function validUserId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0;
}

function validateUrl(value) {
    try {
        const parsed = new URL(String(value).trim());

        return (
            ["http:", "https:"].includes(parsed.protocol) &&
            Boolean(parsed.hostname)
        );
    } catch {
        return false;
    }
}

// ======================================================
// GET MY SOCIAL LINKS
// GET /api/auth/social-links
// ======================================================

exports.getMySocialLinks = async (req, res) => {
    try {
        const userId = Number(req.userId);

        if (!validUserId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        const result = await db.query(
            `
            SELECT platform, url
            FROM user_social_links
            WHERE user_id = $1
            ORDER BY platform ASC
            `,
            [userId]
        );

        return res.json({
            success: true,
            social_links: result.rows
        });

    } catch (error) {
        console.error("GET MY SOCIAL LINKS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load social media links."
        });
    }
};

// ======================================================
// SAVE MY SOCIAL LINKS
// PUT /api/auth/social-links
//
// Replaces the user's current social links with the
// submitted list. An empty list removes all their links.
// ======================================================

exports.saveMySocialLinks = async (req, res) => {
    try {
        const userId = Number(req.userId);

        if (!validUserId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        const links = req.body.links;

        if (!Array.isArray(links)) {
            return res.status(400).json({
                success: false,
                message: "Social links must be provided as an array."
            });
        }

        if (links.length > ALLOWED_PLATFORMS.length) {
            return res.status(400).json({
                success: false,
                message: "Too many social links were submitted."
            });
        }

        const cleanedLinks = [];
        const usedPlatforms = new Set();

        for (const item of links) {
            const platform = String(item?.platform || "")
                .trim()
                .toLowerCase();

            const url = String(item?.url || "").trim();

            if (!ALLOWED_PLATFORMS.includes(platform)) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported social platform: ${platform || "unknown"}.`
                });
            }

            if (usedPlatforms.has(platform)) {
                return res.status(400).json({
                    success: false,
                    message: `Only one ${platform} link is allowed.`
                });
            }

            usedPlatforms.add(platform);

            // Blank URLs mean the user removed that platform.
            if (!url) continue;

            if (url.length > 2048 || !validateUrl(url)) {
                return res.status(400).json({
                    success: false,
                    message: `Please enter a valid HTTP or HTTPS URL for ${platform}.`
                });
            }

            cleanedLinks.push({ platform, url });
        }

        const result = await db.query(
            `
            WITH incoming AS (
                SELECT platform, url
                FROM jsonb_to_recordset($2::jsonb)
                    AS item(platform TEXT, url TEXT)
            ),

            deleted AS (
                DELETE FROM user_social_links existing
                WHERE existing.user_id = $1
                  AND NOT EXISTS (
                      SELECT 1
                      FROM incoming
                      WHERE incoming.platform = existing.platform
                  )
                RETURNING id
            ),

            upserted AS (
                INSERT INTO user_social_links (
                    user_id,
                    platform,
                    url,
                    created_at,
                    updated_at
                )
                SELECT
                    $1,
                    platform,
                    url,
                    NOW(),
                    NOW()
                FROM incoming

                ON CONFLICT (user_id, platform)
                DO UPDATE SET
                    url = EXCLUDED.url,
                    updated_at = NOW()

                RETURNING platform, url
            )

            SELECT platform, url
            FROM user_social_links
            WHERE user_id = $1
            ORDER BY platform ASC
            `,
            [userId, JSON.stringify(cleanedLinks)]
        );

        return res.json({
            success: true,
            message: "Social media links saved successfully.",
            social_links: result.rows
        });

    } catch (error) {
        console.error("SAVE SOCIAL LINKS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save social media links."
        });
    }
};
