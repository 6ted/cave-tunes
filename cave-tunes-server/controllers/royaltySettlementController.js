// ============================================================
// CAVE TUNES
// ROYALTY SETTLEMENT CONTROLLER
//
// RESPONSIBILITIES
// ============================================================
//
// - Authentication
// - Authorization
// - Input validation
// - Settlement requests
// - Settlement history
// - Unsettled royalty estimates
// - User royalty summaries
//
// IMPORTANT:
//
// The controller NEVER calculates or creates royalty splits.
//
// royaltySettlementService is the accounting authority.
//
// Currency used by the royalty system:
// USD
//
// ============================================================

const pool = require("../config/database");

const {
    settleSong,
    getSongSettlementHistory,
    getUserSettlementHistory,
    getUserCreditedRoyalties,
    getSongUnsettledActivity,
    getUserUnsettledSongs,
    getUserRoyaltySummary,
    isSongContributor,
    getSong
} = require("../services/royaltySettlementService");

// ============================================================
// CONSTANTS
// ============================================================

const CURRENCY = "USD";

// ============================================================
// HELPERS
// ============================================================

function getUserId(req) {
    const id =
        req.userId ??
        req.user?.id ??
        null;

    const userId = Number(id);

    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {
        return null;
    }

    return userId;
}

// ------------------------------------------------------------

function getSongId(req) {
    const songId = Number(
        req.params?.songId
    );

    if (
        !Number.isInteger(songId) ||
        songId <= 0
    ) {
        return null;
    }

    return songId;
}

// ------------------------------------------------------------

function toNumber(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

// ------------------------------------------------------------

function roundMoney(value) {
    return Math.round(
        toNumber(value) * 100
    ) / 100;
}

// ------------------------------------------------------------

function isAdminFromRequest(req) {
    return (
        req.user?.is_admin === true ||
        req.user?.isAdmin === true
    );
}

// ============================================================
// DATABASE ADMIN CHECK
// ============================================================

async function isAdmin(userId) {
    if (!userId) {
        return false;
    }

    const result = await pool.query(
        `
        SELECT is_admin
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
    );

    if (!result.rows.length) {
        return false;
    }

    return result.rows[0].is_admin === true;
}

// ============================================================
// CHECK SONG OWNER
// ============================================================

function isSongOwner(userId, song) {
    if (!userId || !song) {
        return false;
    }

    return (
        Number(song.user_id) ===
        Number(userId)
    );
}

// ============================================================
// CHECK OWNER / ADMIN
// ============================================================

async function canManageSong(
    userId,
    song,
    req
) {
    if (!userId || !song) {
        return false;
    }

    const admin =
        isAdminFromRequest(req) ||
        await isAdmin(userId);

    const owner =
        isSongOwner(
            userId,
            song
        );

    return admin || owner;
}

// ============================================================
// BUILD SETTLEMENT SUMMARY
//
// Settled:
//     Permanent accounting history.
//
// Unsettled:
//     New song activity that has not yet been converted into
//     a royalty_settlements row.
//
// Total estimated:
//     Settled + unsettled.
//
// ============================================================

function buildSettlementSummary(
    settlements = [],
    unsettledAmount = 0
) {
    let totalSettled = 0;
    let credited = 0;
    let unclaimed = 0;
    let locked = 0;
    let calculated = 0;

    for (const settlement of settlements) {
        const amount = roundMoney(
            settlement?.earned_amount
        );

        totalSettled += amount;

        const status = String(
            settlement?.status ?? ""
        ).toLowerCase();

        switch (status) {
            case "credited":
                credited += amount;
                break;

            case "unclaimed":
                unclaimed += amount;
                break;

            case "locked":
                locked += amount;
                break;

            case "calculated":
                calculated += amount;
                break;

            default:
                break;
        }
    }

    totalSettled =
        roundMoney(totalSettled);

    const unsettled =
        roundMoney(unsettledAmount);

    return {
        currency: CURRENCY,

        settlementCount:
            settlements.length,

        totalSettled,

        alreadySettled:
            totalSettled,

        credited:
            roundMoney(credited),

        unclaimed:
            roundMoney(unclaimed),

        locked:
            roundMoney(locked),

        calculated:
            roundMoney(calculated),

        unsettled,

        unsettledEarnings:
            unsettled,

        totalEstimated:
            roundMoney(
                totalSettled +
                unsettled
            )
    };
}

// ============================================================
// BUILD SONG RESPONSE
// ============================================================

function buildSongResponse(song) {
    return {
        id: song.id,

        title:
            song.title ??
            song.song_title ??
            "Untitled",

        artistName:
            song.artist_name ??
            null,

        plays:
            toNumber(song.plays),

        downloads:
            toNumber(song.downloads),

        monetizationEnabled:
            Boolean(
                song.monetization_enabled
            ),

        streamingRoyalties:
            Boolean(
                song.streaming_royalties
            ),

        downloadSales:
            Boolean(
                song.download_sales
            )
    };
}

// ============================================================
// GET CONTRIBUTOR SPLIT
//
// IMPORTANT:
//
// This reads the active version returned by the settlement
// service. It does NOT create or modify royalty percentages.
//
// ============================================================

async function getContributorSplit(
    songId,
    userId,
    royaltyVersion
) {
    if (
        !songId ||
        !userId ||
        !royaltyVersion
    ) {
        return null;
    }

    const result = await pool.query(
        `
        SELECT
            percentage,
            participant_name,
            role,
            split_version
        FROM song_royalty_splits
        WHERE
            song_id = $1
            AND user_id = $2
            AND split_version = $3
        LIMIT 1
        `,
        [
            songId,
            userId,
            royaltyVersion
        ]
    );

    if (!result.rows.length) {
        return null;
    }

    const split = result.rows[0];

    return {
        percentage:
            toNumber(
                split.percentage
            ),

        participantName:
            split.participant_name ??
            null,

        role:
            split.role ??
            null,

        splitVersion:
            toNumber(
                split.split_version
            )
    };
}

// ============================================================
// CALCULATE CONTRIBUTOR SHARE
//
// This is NOT determining the royalty percentage.
//
// The percentage comes directly from the existing split.
//
// ============================================================

function buildContributorPosition(
    position,
    split
) {
    if (
        !position ||
        position.blocked ||
        !split
    ) {
        return null;
    }

    const percentage =
        toNumber(
            split.percentage
        );

    const multiplier =
        percentage / 100;

    return {
        ...position,

        royaltyPercentage:
            percentage,

        splitVersion:
            split.splitVersion,

        participantName:
            split.participantName,

        role:
            split.role,

        estimatedNewRevenue:
            roundMoney(
                toNumber(
                    position.estimatedNewRevenue
                ) *
                multiplier
            ),

        estimatedStreamingRevenue:
            roundMoney(
                toNumber(
                    position.estimatedStreamingRevenue
                ) *
                multiplier
            ),

        estimatedDownloadRevenue:
            roundMoney(
                toNumber(
                    position.estimatedDownloadRevenue
                ) *
                multiplier
            )
    };
}

// ============================================================
// GET USER SETTLEMENT HISTORY FOR ONE SONG
// ============================================================

async function getUserSettlementHistoryForSong(
    songId,
    userId
) {
    const result = await pool.query(
        `
        SELECT
            rs.*,
            s.title AS song_title,
            s.artist_name
        FROM royalty_settlements rs
        INNER JOIN songs s
            ON s.id = rs.song_id
        WHERE
            rs.song_id = $1
            AND rs.user_id = $2
        ORDER BY
            rs.period_number DESC,
            rs.id DESC
        `,
        [
            songId,
            userId
        ]
    );

    return result.rows;
}

// ============================================================
// POST
//
// /api/royalty-settlements/songs/:songId/settle
//
// ============================================================

async function settleSongController(
    req,
    res
) {
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

        const songId =
            getSongId(req);

        if (!songId) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid song ID."
            });
        }

        const song =
            await getSong(songId);

        if (!song) {
            return res.status(404).json({
                success: false,
                message:
                    "Song not found."
            });
        }

        const allowed =
            await canManageSong(
                userId,
                song,
                req
            );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to settle royalties for this song."
            });
        }

        const settlement =
            await settleSong(songId);

        return res.status(200).json({
            success: true,

            message:
                settlement?.settled
                    ? "Royalty settlement completed successfully."
                    : (
                        settlement?.reason ??
                        "No new royalty activity was available for settlement."
                    ),

            currency:
                CURRENCY,

            settlement:
                settlement ?? null
        });

    } catch (error) {
        console.error(
            "ROYALTY SETTLEMENT CONTROLLER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ??
                "Unable to settle royalties."
        });
    }
}

// ============================================================
// GET
//
// /api/royalty-settlements/songs/:songId
//
// ============================================================

async function getSongSettlements(
    req,
    res
) {
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

        const songId =
            getSongId(req);

        if (!songId) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid song ID."
            });
        }

        const song =
            await getSong(songId);

        if (!song) {
            return res.status(404).json({
                success: false,
                message:
                    "Song not found."
            });
        }

        const admin =
            await isAdmin(userId);

        const owner =
            isSongOwner(
                userId,
                song
            );

        // ====================================================
        // OWNER / ADMIN
        // ====================================================

        if (admin || owner) {
            const [
                settlements,
                unsettled
            ] = await Promise.all([
                getSongSettlementHistory(
                    songId
                ),

                getSongUnsettledActivity(
                    songId
                )
            ]);

            const unsettledAmount =
                unsettled &&
                !unsettled.blocked
                    ? toNumber(
                        unsettled.estimatedNewRevenue
                    )
                    : 0;

            const summary =
                buildSettlementSummary(
                    settlements,
                    unsettledAmount
                );

            return res.json({
                success: true,

                currency:
                    CURRENCY,

                song:
                    buildSongResponse(song),

                summary,

                unsettled:
                    unsettled ?? null,

                settlements:
                    settlements ?? []
            });
        }

        // ====================================================
        // CONTRIBUTOR
        // ====================================================

        const contributor =
            await isSongContributor(
                songId,
                userId
            );

        if (!contributor) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not a royalty contributor for this song."
            });
        }

        const [
            settlements,
            position
        ] = await Promise.all([
            getUserSettlementHistoryForSong(
                songId,
                userId
            ),

            getSongUnsettledActivity(
                songId
            )
        ]);

        if (
            !position ||
            position.blocked
        ) {
            const summary =
                buildSettlementSummary(
                    settlements,
                    0
                );

            return res.json({
                success: true,

                currency:
                    CURRENCY,

                song:
                    buildSongResponse(song),

                summary,

                contributor: {
                    percentage: 0,
                    participantName: null,
                    role: null,
                    splitVersion: null
                },

                unsettled:
                    position ?? null,

                settlements
            });
        }

        const split =
            await getContributorSplit(
                songId,
                userId,
                position.activeRoyaltyVersion
            );

        if (!split) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not part of the active royalty split for this song."
            });
        }

        const contributorPosition =
            buildContributorPosition(
                position,
                split
            );

        const summary =
            buildSettlementSummary(
                settlements,
                contributorPosition
                    ?.estimatedNewRevenue ?? 0
            );

        return res.json({
            success: true,

            currency:
                CURRENCY,

            song:
                buildSongResponse(song),

            summary,

            contributor: {
                percentage:
                    split.percentage,

                participantName:
                    split.participantName,

                role:
                    split.role,

                splitVersion:
                    split.splitVersion
            },

            unsettled:
                contributorPosition,

            settlements
        });

    } catch (error) {
        console.error(
            "GET SONG SETTLEMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load settlement history."
        });
    }
}

// ============================================================
// GET
//
// /api/royalty-settlements/my
//
// ============================================================

async function getMySettlements(
    req,
    res
) {
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

        const [
            settlements,
            credited,
            summary,
            unsettledSongs
        ] = await Promise.all([
            getUserSettlementHistory(
                userId
            ),

            getUserCreditedRoyalties(
                userId
            ),

            getUserRoyaltySummary(
                userId
            ),

            getUserUnsettledSongs(
                userId
            )
        ]);

        const safeSettlements =
            Array.isArray(settlements)
                ? settlements
                : [];

        const safeCredited =
            Array.isArray(credited)
                ? credited
                : [];

        const safeUnsettledSongs =
            Array.isArray(unsettledSongs)
                ? unsettledSongs
                : [];

        const unsettled =
            roundMoney(
                safeUnsettledSongs.reduce(
                    (
                        total,
                        song
                    ) => {
                        return (
                            total +
                            toNumber(
                                song?.estimatedEarnings
                            )
                        );
                    },
                    0
                )
            );

        const totalSettled =
            roundMoney(
                summary?.totalSettled
            );

        const creditedAmount =
            roundMoney(
                summary?.credited
            );

        const unclaimed =
            roundMoney(
                summary?.unclaimed
            );

        const locked =
            roundMoney(
                summary?.locked
            );

        const calculated =
            roundMoney(
                summary?.calculated
            );

        const totalEstimated =
            roundMoney(
                totalSettled +
                unsettled
            );

        const earnings = {
            currency:
                CURRENCY,

            totalEstimated,

            totalSettled,

            alreadySettled:
                totalSettled,

            credited:
                creditedAmount,

            unclaimed,

            locked,

            calculated,

            unsettled,

            unsettledEarnings:
                unsettled
        };

        return res.json({
            success: true,

            currency:
                CURRENCY,

            summary: {
                ...(summary || {}),

                currency:
                    CURRENCY,

                totalSettled,

                alreadySettled:
                    totalSettled,

                credited:
                    creditedAmount,

                unclaimed,

                locked,

                calculated,

                unsettled,

                unsettledEarnings:
                    unsettled,

                totalEstimated
            },

            earnings,

            unsettledSongs:
                safeUnsettledSongs,

            settlements:
                safeSettlements,

            credited:
                safeCredited
        });

    } catch (error) {
        console.error(
            "GET MY SETTLEMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load your royalty settlements."
        });
    }
}

// ============================================================
// GET
//
// /api/royalty-settlements/songs/:songId/unsettled
//
// ============================================================

async function getUnsettledSong(
    req,
    res
) {
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

        const songId =
            getSongId(req);

        if (!songId) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid song ID."
            });
        }

        const song =
            await getSong(songId);

        if (!song) {
            return res.status(404).json({
                success: false,
                message:
                    "Song not found."
            });
        }

        const admin =
            await isAdmin(userId);

        const owner =
            isSongOwner(
                userId,
                song
            );

        const position =
            await getSongUnsettledActivity(
                songId
            );

        // ====================================================
        // OWNER / ADMIN
        // ====================================================

        if (admin || owner) {
            return res.json({
                success: true,

                currency:
                    CURRENCY,

                position:
                    position ?? null
            });
        }

        // ====================================================
        // CONTRIBUTOR
        // ====================================================

        const contributor =
            await isSongContributor(
                songId,
                userId
            );

        if (!contributor) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not a royalty contributor for this song."
            });
        }

        if (
            !position ||
            position.blocked
        ) {
            return res.json({
                success: true,

                currency:
                    CURRENCY,

                position:
                    position ?? null
            });
        }

        const split =
            await getContributorSplit(
                songId,
                userId,
                position.activeRoyaltyVersion
            );

        if (!split) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not part of the active royalty split for this song."
            });
        }

        const contributorPosition =
            buildContributorPosition(
                position,
                split
            );

        return res.json({
            success: true,

            currency:
                CURRENCY,

            position:
                contributorPosition
        });

    } catch (error) {
        console.error(
            "GET UNSETTLED SONG ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to calculate unsettled royalty activity."
        });
    }
}

// ============================================================
// GET
//
// /api/royalty-settlements/my/unsettled
//
// ============================================================

async function getMyUnsettledSongsController(
    req,
    res
) {
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
            await getUserUnsettledSongs(
                userId
            );

        const safeSongs =
            Array.isArray(songs)
                ? songs
                : [];

        const total =
            roundMoney(
                safeSongs.reduce(
                    (
                        sum,
                        song
                    ) => {
                        return (
                            sum +
                            toNumber(
                                song?.estimatedEarnings
                            )
                        );
                    },
                    0
                )
            );

        return res.json({
            success: true,

            currency:
                CURRENCY,

            totalUnsettled:
                total,

            count:
                safeSongs.length,

            songs:
                safeSongs
        });

    } catch (error) {
        console.error(
            "GET MY UNSETTLED SONGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load unsettled royalty songs."
        });
    }
}

// ============================================================
// POST
//
// /api/royalty-settlements/my/settle
//
// Settle all royalty-enabled songs owned by the
// authenticated user.
//
// IMPORTANT:
// - Does NOT calculate royalties here.
// - Does NOT modify royalty percentages.
// - settleSong() remains the accounting authority.
// - Each song creates its own accounting period.
// ============================================================

async function settleMyRoyalties(
    req,
    res
) {
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

        // ----------------------------------------------------
        // Find songs owned by this user that have monetization
        // enabled.
        // ----------------------------------------------------

        const result =
            await pool.query(
                `
                SELECT
                    id,
                    title,
                    song_title
                FROM songs
                WHERE user_id = $1
                AND monetization_enabled = TRUE
                ORDER BY id ASC
                `,
                [userId]
            );

        const songs =
            Array.isArray(result.rows)
                ? result.rows
                : [];

        const settlements = [];
        const skipped = [];
        const failed = [];

        // ----------------------------------------------------
        // IMPORTANT:
        //
        // settleSong() owns its own PostgreSQL transaction.
        //
        // Therefore we intentionally settle songs one at a
        // time instead of wrapping everything in another
        // transaction.
        // ----------------------------------------------------

        for (const song of songs) {
            try {
                const settlement =
                    await settleSong(song.id);

                if (settlement?.settled) {
                    settlements.push({
                        songId:
                            Number(song.id),

                        songTitle:
                            song.title ||
                            song.song_title ||
                            "Untitled",

                        ...settlement
                    });
                } else {
                    skipped.push({
                        songId:
                            Number(song.id),

                        songTitle:
                            song.title ||
                            song.song_title ||
                            "Untitled",

                        reason:
                            settlement?.reason ||
                            "No new royalty activity."
                    });
                }
            } catch (error) {
                console.error(
                    `Failed to settle song ${song.id}:`,
                    error
                );

                failed.push({
                    songId:
                        Number(song.id),

                    songTitle:
                        song.title ||
                        song.song_title ||
                        "Untitled",

                    message:
                        error.message ||
                        "Unable to settle this song."
                });
            }
        }

        // ----------------------------------------------------
        // Calculate amount settled during THIS request.
        //
        // This is only a response value. The database remains
        // the source of truth.
        // ----------------------------------------------------

        const totalSettled =
            roundMoney(
                settlements.reduce(
                    (
                        total,
                        settlement
                    ) => {
                        return (
                            total +
                            toNumber(
                                settlement?.revenue?.total
                            )
                        );
                    },
                    0
                )
            );

        return res.status(200).json({
            success: true,

            currency:
                CURRENCY,

            message:
                settlements.length > 0
                    ? "Royalty settlement completed successfully."
                    : "There was no new royalty activity to settle.",

            settledCount:
                settlements.length,

            skippedCount:
                skipped.length,

            failedCount:
                failed.length,

            totalSettled,

            settlements,

            skipped,

            failed
        });

    } catch (error) {
        console.error(
            "SETTLE MY ROYALTIES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to settle your royalties."
        });
    }
}




// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    settleSong:
        settleSongController,

    settleMyRoyalties,

    getSongSettlements,

    getMySettlements,

    getUnsettledSong,

    getMyUnsettledSongs:
        getMyUnsettledSongsController
};

