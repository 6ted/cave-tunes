// ============================================================
// CAVE TUNES
// ROYALTY CONTROLLER
//
// Supports:
// - Per-song royalty splits
// - Multiple royalty split versions
// - Registered Cave Tunes contributors
// - Unregistered contributors
// - Song-owner ownership protection
// ============================================================

const pool =
    require("../config/database");

const {
    saveSongRoyaltySplit
} = require("../services/royaltyService");


// ============================================================
// HELPER
// Get authenticated user ID
// ============================================================

function getUserId(req) {

    return (
        req.userId ||
        req.user?.id ||
        null
    );
}


// ============================================================
// SAVE / UPDATE SONG ROYALTY SPLIT
//
// POST
// /api/royalties/songs/:songId/splits
//
// Body:
//
// {
//     "splits": [
//         {
//             "user_id": 2,
//             "participant_name": "John Banda",
//             "role": "songwriter",
//             "percentage": 20
//         },
//         {
//             "user_id": 1,
//             "participant_name": "Teddy",
//             "role": "master_owner",
//             "percentage": 80
//         }
//     ]
// }
// ============================================================

exports.saveSongRoyaltySplit = async (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ----------------------------------------------------
        // AUTH
        // ----------------------------------------------------

        if (!userId) {

            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized. Please login."
            });
        }


        // ----------------------------------------------------
        // SONG ID
        // ----------------------------------------------------

        const songId =
            Number(req.params.songId);


        if (
            !Number.isInteger(songId) ||
            songId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid song ID."
            });
        }


        // ----------------------------------------------------
        // SPLITS
        // ----------------------------------------------------

        const splits =
            req.body?.splits;


        if (!Array.isArray(splits)) {

            return res.status(400).json({
                success: false,
                message:
                    "Royalty splits are required."
            });
        }


        if (splits.length === 0) {

            return res.status(400).json({
                success: false,
                message:
                    "At least one royalty participant is required."
            });
        }


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        const result =
            await saveSongRoyaltySplit(
                songId,
                userId,
                splits
            );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Royalty split saved successfully.",

            royalty: result

        });

    } catch (error) {

        console.error(
            "SAVE ROYALTY SPLIT ERROR:",
            error
        );


        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "Unable to save royalty split."

        });
    }
};


// ============================================================
// GET CURRENT SONG ROYALTY SPLIT
//
// GET
// /api/royalties/songs/:songId/splits
// ============================================================

exports.getSongRoyaltySplit = async (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ----------------------------------------------------
        // AUTH
        // ----------------------------------------------------

        if (!userId) {

            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized. Please login."
            });
        }


        // ----------------------------------------------------
        // SONG ID
        // ----------------------------------------------------

        const songId =
            Number(req.params.songId);


        if (
            !Number.isInteger(songId) ||
            songId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid song ID."
            });
        }


        // ----------------------------------------------------
        // GET SONG OWNER
        // ----------------------------------------------------

        const songResult =
            await pool.query(
                `
                SELECT
                    id,
                    user_id,
                    title,
                    artist_name
                FROM songs
                WHERE id = $1
                `,
                [songId]
            );


        if (
            songResult.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Song not found."
            });
        }


        const song =
            songResult.rows[0];


        // ----------------------------------------------------
        // OWNERSHIP PROTECTION
        // ----------------------------------------------------

        if (
            Number(song.user_id) !==
            Number(userId)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not own this song."
            });
        }


        // ----------------------------------------------------
        // GET LATEST SPLIT VERSION
        // ----------------------------------------------------

        const versionResult =
            await pool.query(
                `
                SELECT
                    id,
                    song_id,
                    version,
                    total_percentage,
                    locked,
                    locked_at,
                    created_at
                FROM song_royalty_split_versions
                WHERE song_id = $1
                ORDER BY version DESC
                LIMIT 1
                `,
                [songId]
            );


        // ----------------------------------------------------
        // NO SPLIT YET
        // ----------------------------------------------------

        if (
            versionResult.rows.length === 0
        ) {

            return res.json({

                success: true,

                song: {
                    id: song.id,
                    title: song.title,
                    artist_name:
                        song.artist_name
                },

                version: null,

                splits: []

            });
        }


        const version =
            versionResult.rows[0];


        // ----------------------------------------------------
        // GET SPLITS FOR LATEST VERSION
        // ----------------------------------------------------

        const splitResult =
            await pool.query(
                `
                SELECT
                    id,
                    song_id,
                    user_id,
                    participant_name,
                    role,
                    percentage,
                    is_registered_user,
                    is_unclaimed,
                    split_version,
                    created_at,
                    updated_at
                FROM song_royalty_splits
                WHERE song_id = $1
                AND split_version = $2
                ORDER BY id ASC
                `,
                [
                    songId,
                    version.version
                ]
            );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        return res.json({

            success: true,

            song: {
                id: song.id,
                title: song.title,
                artist_name:
                    song.artist_name
            },

            version,

            splits:
                splitResult.rows

        });

    } catch (error) {

        console.error(
            "GET SONG ROYALTY SPLIT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load royalty split."

        });
    }
};


// ============================================================
// GET ALL ROYALTY SPLIT VERSIONS
//
// GET
// /api/royalties/songs/:songId/splits/versions
//
// Useful later for:
// - Royalty history
// - Locked versions
// - Admin auditing
// ============================================================

exports.getSongRoyaltySplitVersions =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getUserId(req);


            // ------------------------------------------------
            // AUTH
            // ------------------------------------------------

            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Unauthorized. Please login."
                });
            }


            // ------------------------------------------------
            // SONG ID
            // ------------------------------------------------

            const songId =
                Number(req.params.songId);


            if (
                !Number.isInteger(songId) ||
                songId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid song ID."
                });
            }


            // ------------------------------------------------
            // VERIFY OWNERSHIP
            // ------------------------------------------------

            const songResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id
                    FROM songs
                    WHERE id = $1
                    `,
                    [songId]
                );


            if (
                songResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Song not found."
                });
            }


            if (
                Number(
                    songResult.rows[0].user_id
                ) !==
                Number(userId)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You do not own this song."
                });
            }


            // ------------------------------------------------
            // GET VERSIONS
            // ------------------------------------------------

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        song_id,
                        version,
                        total_percentage,
                        locked,
                        locked_at,
                        created_at
                    FROM song_royalty_split_versions
                    WHERE song_id = $1
                    ORDER BY version DESC
                    `,
                    [songId]
                );


            return res.json({

                success: true,

                versions:
                    result.rows

            });

        } catch (error) {

            console.error(
                "GET ROYALTY SPLIT VERSIONS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load royalty split history."

            });
        }
    };



// ============================================================
// ROYALTY MANAGEMENT
// ============================================================

const {
    getOwnRoyaltyManagement,
    getFeaturedRoyaltyManagement,
    calculateSummary,
    STREAM_RATE,
    DOWNLOAD_RATE
} = require("../services/royaltyManagementService");


// ============================================================
// GET OWN MONETIZED SONGS
//
// GET
// /api/royalties/management/own
// ============================================================

exports.getOwnRoyaltyManagement =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getUserId(req);

            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized. Please login."

                });
            }

            const songs =
                await getOwnRoyaltyManagement(
                    userId
                );

            return res.json({

                success: true,

                tab:
                    "own",

                songs,

                summary:
                    calculateSummary(
                        songs
                    ),

                estimateRates: {

                    streamingPerPlay:
                        STREAM_RATE,

                    downloadPerSale:
                        DOWNLOAD_RATE

                }

            });

        } catch (error) {

            console.error(
                "GET OWN ROYALTY MANAGEMENT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your royalty management data."

            });
        }
    };


// ============================================================
// GET FEATURED MONETIZED SONGS
//
// GET
// /api/royalties/management/featured
// ============================================================

exports.getFeaturedRoyaltyManagement =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                getUserId(req);

            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized. Please login."

                });
            }

            const songs =
                await getFeaturedRoyaltyManagement(
                    userId
                );

            return res.json({

                success: true,

                tab:
                    "featured",

                songs,

                summary:
                    calculateSummary(
                        songs
                    ),

                estimateRates: {

                    streamingPerPlay:
                        STREAM_RATE,

                    downloadPerSale:
                        DOWNLOAD_RATE

                }

            });

        } catch (error) {

            console.error(
                "GET FEATURED ROYALTY MANAGEMENT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load featured royalty data."

            });
        }
    };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    saveSongRoyaltySplit:
        exports.saveSongRoyaltySplit,

    getSongRoyaltySplit:
        exports.getSongRoyaltySplit,

    getSongRoyaltySplitVersions:
        exports.getSongRoyaltySplitVersions,

    getOwnRoyaltyManagement:
        exports.getOwnRoyaltyManagement,

    getFeaturedRoyaltyManagement:
        exports.getFeaturedRoyaltyManagement
};