// ======================================================
// CAVE TUNES
// ROYALTY SETTLEMENT SERVICE
//
// AUTHORITATIVE ROYALTY ACCOUNTING ENGINE
//
// IMPORTANT ACCOUNTING RULES
// ======================================================
//
// 1. royalty_settlements is immutable accounting history.
// 2. One settlement call creates ONE new accounting period.
// 3. Every contributor receives their own settlement row.
// 4. Every settlement row stores the exact royalty version.
// 5. Percentages ALWAYS come from song_royalty_splits.
// 6. Registered contributors are credited automatically.
// 7. Unregistered contributors remain unclaimed.
// 8. Settlement + wallet credit are atomic.
// 9. Failed wallet credit rolls back the entire settlement.
// 10. New activity creates a NEW period.
// 11. Old periods are NEVER recalculated.
// 12. Withdrawals NEVER modify settlement history.
// 13. Song counters cannot move backwards.
// 14. USD is the authoritative royalty currency.
// 15. No-new-activity settlement does nothing.
// 16. Active royalty version is determined from the latest
//     song_royalty_split_versions row.
// 17. Historical settlement rows retain their original
//     royalty version forever.
//
// ======================================================

const pool =
    require("../config/database");

const walletService =
    require("./walletService");

const royaltyEarningsService =
    require("./royaltyEarningsService");


// ======================================================
// CONSTANTS
// ======================================================

const CURRENCY =
    "USD";


const SETTLEMENT_STATUS = Object.freeze({

    CALCULATED:
        "calculated",

    CREDITED:
        "credited",

    UNCLAIMED:
        "unclaimed",

    LOCKED:
        "locked"

});


// ======================================================
// HELPERS
// ======================================================

function toNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function roundMoney(value) {

    return Math.round(
        toNumber(value) * 1000000
    ) / 1000000;
}

function normalizeVersion(value) {

    const version =
        Number(value);

    return Number.isInteger(version) &&
        version > 0
        ? version
        : null;
}


function normalizeCounter(value) {

    const number =
        Number(value);

    return Number.isInteger(number) &&
        number >= 0
        ? number
        : 0;
}


function getStreamRate() {

    const rate =
        Number(
            royaltyEarningsService.STREAM_RATE
        );


    if (
        !Number.isFinite(rate) ||
        rate < 0
    ) {

        throw new Error(
            "Invalid streaming royalty rate."
        );
    }


    return rate;
}


function getDownloadRate() {

    const rate =
        Number(
            royaltyEarningsService.DOWNLOAD_RATE
        );


    if (
        !Number.isFinite(rate) ||
        rate < 0
    ) {

        throw new Error(
            "Invalid download royalty rate."
        );
    }


    return rate;
}


// ======================================================
// GET SONG
//
// FOR UPDATE is used by the settlement operation.
//
// ======================================================

async function getSongForSettlement(
    songId,
    client
) {

    const result =
        await client.query(
            `
            SELECT

                id,
                user_id,

                title,
                song_title,
                artist_name,

                plays,
                downloads,

                monetization_enabled,
                streaming_royalties,
                download_sales

            FROM songs

            WHERE id = $1

            FOR UPDATE
            `,
            [
                songId
            ]
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            "Song not found."
        );
    }


    return result.rows[0];
}


// ======================================================
// GET SONG WITHOUT LOCK
// ======================================================

async function getSong(
    songId
) {

    const result =
        await pool.query(
            `
            SELECT

                id,
                user_id,

                title,
                song_title,
                artist_name,

                plays,
                downloads,

                monetization_enabled,
                streaming_royalties,
                download_sales

            FROM songs

            WHERE id = $1
            `,
            [
                songId
            ]
        );


    return (
        result.rows[0] ||
        null
    );
}


// ======================================================
// GET ACTIVE ROYALTY VERSION
//
// This is the CURRENT version of the song's split.
//
// Historical settlements do NOT change when this changes.
//
// ======================================================

async function getLatestRoyaltyVersion(
    songId,
    client = pool
) {

    const result =
        await client.query(
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
            [
                songId
            ]
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            "No royalty split version exists for this song."
        );
    }


    const version =
        result.rows[0];


    const normalizedVersion =
        normalizeVersion(
            version.version
        );


    if (!normalizedVersion) {

        throw new Error(
            "Invalid royalty split version."
        );
    }


    const totalPercentage =
        roundMoney(
            version.total_percentage
        );


    if (
        totalPercentage !== 100
    ) {

        throw new Error(
            `Royalty version ${normalizedVersion} totals ${totalPercentage}%. It must total exactly 100%.`
        );
    }


    return version;
}


// ======================================================
// GET SPECIFIC ROYALTY VERSION
// ======================================================

async function getRoyaltyVersionByNumber(
    songId,
    version,
    client = pool
) {

    const normalizedVersion =
        normalizeVersion(version);


    if (!normalizedVersion) {

        throw new Error(
            "Invalid royalty version."
        );
    }


    const result =
        await client.query(
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

            AND version = $2

            LIMIT 1
            `,
            [
                songId,
                normalizedVersion
            ]
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            `Royalty version ${normalizedVersion} does not exist for this song.`
        );
    }


    const row =
        result.rows[0];


    if (
        roundMoney(
            row.total_percentage
        ) !== 100
    ) {

        throw new Error(
            `Royalty version ${normalizedVersion} does not total 100%.`
        );
    }


    return row;
}


// ======================================================
// GET ROYALTY SPLITS
//
// NEVER hard-code percentages.
//
// ======================================================

async function getRoyaltySplits(
    songId,
    version,
    client = pool
) {

    const normalizedVersion =
        normalizeVersion(version);


    if (!normalizedVersion) {

        throw new Error(
            "Invalid royalty split version."
        );
    }


    const result =
        await client.query(
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
                normalizedVersion
            ]
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            `No royalty splits found for version ${normalizedVersion}.`
        );
    }


    let totalPercentage = 0;


    for (
        const split
        of result.rows
    ) {

        const percentage =
            toNumber(
                split.percentage
            );


        if (
            percentage < 0
        ) {

            throw new Error(
                `Invalid royalty percentage for ${split.participant_name || "contributor"}.`
            );
        }


        totalPercentage +=
            percentage;
    }


    totalPercentage =
        roundMoney(
            totalPercentage
        );


    if (
        totalPercentage !== 100
    ) {

        throw new Error(
            `Royalty version ${normalizedVersion} splits total ${totalPercentage}%. Expected 100%.`
        );
    }


    return result.rows;
}


// ======================================================
// GET LAST SETTLEMENT
//
// The latest settlement defines the activity boundary.
//
// ======================================================

async function getLastSettlement(
    songId,
    client = pool
) {

    const result =
        await client.query(
            `
            SELECT *

            FROM royalty_settlements

            WHERE song_id = $1

            ORDER BY

                period_number DESC,
                id DESC

            LIMIT 1
            `,
            [
                songId
            ]
        );


    return (
        result.rows[0] ||
        null
    );
}


// ======================================================
// GET NEXT PERIOD
// ======================================================

async function getNextPeriodNumber(
    songId,
    client
) {

    const result =
        await client.query(
            `
            SELECT

                COALESCE(
                    MAX(period_number),
                    0
                ) + 1 AS next_period

            FROM royalty_settlements

            WHERE song_id = $1
            `,
            [
                songId
            ]
        );


    return Number(
        result.rows[0].next_period
    );
}


// ======================================================
// CALCULATE NEW ACTIVITY
//
// Counters are cumulative.
//
// Example:
//
// Previous settlement:
// plays_end = 100
//
// Current song:
// plays = 150
//
// New royalty activity:
// 50 plays
//
// ======================================================

function calculateNewActivity(
    song,
    previousSettlement
) {

    const currentPlays =
        normalizeCounter(
            song.plays
        );


    const currentDownloads =
        normalizeCounter(
            song.downloads
        );


    const previousPlays =
        previousSettlement
            ? normalizeCounter(
                previousSettlement.plays_end
            )
            : 0;


    const previousDownloads =
        previousSettlement
            ? normalizeCounter(
                previousSettlement.downloads_end
            )
            : 0;


    const newPlays =
        currentPlays -
        previousPlays;


    const newDownloads =
        currentDownloads -
        previousDownloads;


    if (
        newPlays < 0
    ) {

        throw new Error(
            `Song play counter moved backwards. Previous settled plays: ${previousPlays}; current plays: ${currentPlays}.`
        );
    }


    if (
        newDownloads < 0
    ) {

        throw new Error(
            `Song download counter moved backwards. Previous settled downloads: ${previousDownloads}; current downloads: ${currentDownloads}.`
        );
    }


    return {

        playsStart:
            previousPlays,

        playsEnd:
            currentPlays,

        downloadsStart:
            previousDownloads,

        downloadsEnd:
            currentDownloads,

        royaltyPlays:
            newPlays,

        royaltyDownloads:
            newDownloads

    };
}


// ======================================================
// CALCULATE REVENUE
// ======================================================

function calculateSettlementRevenue(
    royaltyPlays,
    royaltyDownloads
) {

    const streamRate =
        getStreamRate();


    const downloadRate =
        getDownloadRate();


    const streamingRevenue =
        toNumber(
            royaltyPlays
        ) *
        streamRate;


    const downloadRevenue =
        toNumber(
            royaltyDownloads
        ) *
        downloadRate;


    const grossRevenue =
        streamingRevenue +
        downloadRevenue;


    return {

        streamRate,

        downloadRate,

        streamingRevenue:
            roundMoney(
                streamingRevenue
            ),

        downloadRevenue:
            roundMoney(
                downloadRevenue
            ),

        grossRevenue:
            roundMoney(
                grossRevenue
            )

    };
}


// ======================================================
// CREATE SETTLEMENT ROW
//
// One contributor = one immutable accounting row.
//
// ======================================================

async function createSettlementRow({

    song,
    split,

    royaltyVersion,
    periodNumber,

    activity,
    revenue,

    client

}) {

    const percentage =
        toNumber(
            split.percentage
        );


    const earnedAmount =
        roundMoney(
            revenue.grossRevenue *
            (
                percentage /
                100
            )
        );


    const participantName =
        String(
            split.participant_name ||
            "Unknown"
        ).trim();


    const initialStatus =
        earnedAmount > 0
            ? SETTLEMENT_STATUS.CALCULATED
            : SETTLEMENT_STATUS.LOCKED;


    // ==================================================
    // INSERT
    //
    // The database should additionally have a UNIQUE
    // constraint protecting song/version/period/user.
    //
    // ==================================================

    const result =
        await client.query(
            `
            INSERT INTO royalty_settlements (

                song_id,
                user_id,

                participant_name,
                role,

                royalty_version,
                royalty_percentage,
                period_number,

                plays_start,
                plays_end,

                downloads_start,
                downloads_end,

                royalty_plays,
                royalty_downloads,

                stream_rate,
                download_rate,

                streaming_revenue,
                download_revenue,
                gross_revenue,

                earned_amount,

                currency,
                status

            )

            VALUES (

                $1,
                $2,

                $3,
                $4,

                $5,
                $6,
                $7,

                $8,
                $9,

                $10,
                $11,

                $12,
                $13,

                $14,
                $15,

                $16,
                $17,
                $18,

                $19,

                $20,
                $21

            )

            RETURNING *
            `,
            [

                song.id,

                split.user_id ||
                    null,

                participantName,

                split.role ||
                    null,

                royaltyVersion,

                percentage,

                periodNumber,

                activity.playsStart,
                activity.playsEnd,

                activity.downloadsStart,
                activity.downloadsEnd,

                activity.royaltyPlays,
                activity.royaltyDownloads,

                revenue.streamRate,
                revenue.downloadRate,

                revenue.streamingRevenue,
                revenue.downloadRevenue,
                revenue.grossRevenue,

                earnedAmount,

                CURRENCY,

                initialStatus

            ]
        );


    return result.rows[0];
}


// ======================================================
// CREDIT CONTRIBUTOR
//
// Registered:
//     wallet transaction created.
//
// Unregistered:
//     settlement becomes unclaimed.
//
// ZERO:
//     settlement becomes locked.
//
// ======================================================

async function creditContributor({

    settlement,
    split,

    song,
    royaltyVersion,
    periodNumber,

    client

}) {

    const earnedAmount =
        roundMoney(
            settlement.earned_amount
        );


    // ==================================================
    // ZERO AMOUNT
    // ==================================================

    if (
        earnedAmount <= 0
    ) {

        await client.query(
            `
            UPDATE royalty_settlements

            SET

                status = $1,

                locked_at =
                    COALESCE(
                        locked_at,
                        CURRENT_TIMESTAMP
                    ),

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                SETTLEMENT_STATUS.LOCKED,
                settlement.id
            ]
        );


        return {

            settlementId:
                settlement.id,

            credited:
                false,

            status:
                SETTLEMENT_STATUS.LOCKED,

            amount:
                0,

            reason:
                "No royalty revenue was generated for this contributor."

        };
    }


    // ==================================================
    // UNREGISTERED CONTRIBUTOR
    // ==================================================

    if (
        !split.user_id
    ) {

        await client.query(
            `
            UPDATE royalty_settlements

            SET

                status = $1,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                SETTLEMENT_STATUS.UNCLAIMED,
                settlement.id
            ]
        );


        return {

            settlementId:
                settlement.id,

            credited:
                false,

            status:
                SETTLEMENT_STATUS.UNCLAIMED,

            amount:
                earnedAmount,

            reason:
                "Contributor is not registered with Cave Tunes."

        };
    }


    // ==================================================
    // WALLET REFERENCE
    // ==================================================

    const reference =
        `ROYALTY-S${song.id}` +
        `-V${royaltyVersion}` +
        `-P${periodNumber}` +
        `-R${settlement.id}`;


    // ==================================================
    // WALLET CREDIT
    //
    // SAME POSTGRES CLIENT.
    //
    // This means:
    //
    // settlement INSERT
    // +
    // wallet transaction
    // +
    // settlement update
    //
    // all succeed or all rollback.
    //
    // ==================================================

    const transaction =
        await walletService.addWalletTransaction({

            userId:
                split.user_id,

            amount:
                earnedAmount,

            type:
                walletService
                    .TRANSACTION_TYPES
                    .ROYALTY,

            description:
                `Royalty earnings for "${song.title || song.song_title}" - Period ${periodNumber}`,

            sourceType:
                "royalty_settlement",

            sourceId:
                settlement.id,

            reference,

            metadata: {

                songId:
                    song.id,

                songTitle:
                    song.title ||
                    song.song_title,

                artistName:
                    song.artist_name,

                royaltyVersion,

                periodNumber,

                settlementId:
                    settlement.id,

                participantName:
                    split.participant_name,

                role:
                    split.role,

                royaltyPercentage:
                    percentageOrZero(
                        split.percentage
                    ),

                royaltyPlays:
                    settlement.royalty_plays,

                royaltyDownloads:
                    settlement.royalty_downloads,

                playsStart:
                    settlement.plays_start,

                playsEnd:
                    settlement.plays_end,

                downloadsStart:
                    settlement.downloads_start,

                downloadsEnd:
                    settlement.downloads_end,

                streamRate:
                    settlement.stream_rate,

                downloadRate:
                    settlement.download_rate,

                grossRevenue:
                    settlement.gross_revenue,

                earnedAmount:
                    settlement.earned_amount,

                currency:
                    CURRENCY

            },

            status:
                walletService
                    .TRANSACTION_STATUSES
                    .COMPLETED,

            client

        });


    if (
        !transaction ||
        !transaction.id
    ) {

        throw new Error(
            "Wallet transaction was not created."
        );
    }


    const updated =
        await client.query(
            `
            UPDATE royalty_settlements

            SET

                wallet_id = $1,

                wallet_transaction_id = $2,

                wallet_reference = $3,

                status = $4,

                locked_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $5

            AND status = $6

            RETURNING *
            `,
            [

                transaction.wallet_id,

                transaction.id,

                reference,

                SETTLEMENT_STATUS.CREDITED,

                settlement.id,

                SETTLEMENT_STATUS.CALCULATED

            ]
        );


    if (
        updated.rows.length === 0
    ) {

        throw new Error(
            `Settlement ${settlement.id} could not be finalized as credited.`
        );
    }


    return {

        settlementId:
            settlement.id,

        credited:
            true,

        status:
            SETTLEMENT_STATUS.CREDITED,

        amount:
            earnedAmount,

        walletId:
            transaction.wallet_id,

        walletTransactionId:
            transaction.id,

        reference

    };
}


// ======================================================
// SMALL HELPER
// ======================================================

function percentageOrZero(value) {

    return toNumber(value);
}


// ======================================================
// SETTLE SONG
//
// ONE CALL:
//
// current counters
//        ↓
// last settlement boundary
//        ↓
// new activity
//        ↓
// active royalty version
//        ↓
// exact splits
//        ↓
// NEW period
//        ↓
// contributor rows
//        ↓
// wallet credits
//        ↓
// COMMIT
//
// ======================================================

async function settleSong(
    songId
) {

    const normalizedSongId =
        Number(songId);


    if (
        !Number.isInteger(
            normalizedSongId
        ) ||
        normalizedSongId <= 0
    ) {

        throw new Error(
            "Invalid song ID."
        );
    }


    const client =
        await pool.connect();


    try {

        await client.query(
            "BEGIN"
        );


        // ==================================================
        // 1. LOCK SONG
        // ==================================================

        const song =
            await getSongForSettlement(
                normalizedSongId,
                client
            );


        // ==================================================
        // 2. MONETIZATION
        // ==================================================

        if (
            !song.monetization_enabled
        ) {

            throw new Error(
                "Royalty settlement is not enabled for this song."
            );
        }


        // ==================================================
        // 3. LAST SETTLED BOUNDARY
        // ==================================================

        const previousSettlement =
            await getLastSettlement(
                normalizedSongId,
                client
            );


        // ==================================================
        // 4. NEW ACTIVITY
        // ==================================================

        const activity =
            calculateNewActivity(
                song,
                previousSettlement
            );


        // ==================================================
        // 5. NOTHING TO SETTLE
        // ==================================================

        if (

            activity.royaltyPlays === 0 &&

            activity.royaltyDownloads === 0

        ) {

            await client.query(
                "COMMIT"
            );


            return {

                settled:
                    false,

                created:
                    false,

                locked:
                    true,

                reason:
                    "No new plays or downloads since the previous settlement.",

                songId:
                    song.id,

                songTitle:
                    song.title ||
                    song.song_title,

                royaltyVersion:
                    previousSettlement
                        ? normalizeVersion(
                            previousSettlement
                                .royalty_version
                        )
                        : null,

                previousPeriod:
                    previousSettlement
                        ? Number(
                            previousSettlement.period_number
                        )
                        : null,

                currentPlays:
                    activity.playsEnd,

                currentDownloads:
                    activity.downloadsEnd,

                unsettled: {

                    newPlays:
                        0,

                    newDownloads:
                        0,

                    estimatedRevenue:
                        0

                }

            };
        }


        // ==================================================
        // 6. ACTIVE ROYALTY VERSION
        //
        // IMPORTANT:
        //
        // We use the CURRENT version here.
        //
        // The previous settlement's version remains historical.
        //
        // ==================================================

        const activeVersionRow =
            await getLatestRoyaltyVersion(
                normalizedSongId,
                client
            );


        const royaltyVersion =
            normalizeVersion(
                activeVersionRow.version
            );


        if (!royaltyVersion) {

            throw new Error(
                "Invalid active royalty version."
            );
        }


        // ==================================================
        // 7. GET EXACT ACTIVE SPLITS
        // ==================================================

        const splits =
            await getRoyaltySplits(
                normalizedSongId,
                royaltyVersion,
                client
            );


        // ==================================================
        // 8. PERIOD
        // ==================================================

        const periodNumber =
            await getNextPeriodNumber(
                normalizedSongId,
                client
            );


        // ==================================================
        // 9. REVENUE
        // ==================================================

        const revenue =
            calculateSettlementRevenue(
                activity.royaltyPlays,
                activity.royaltyDownloads
            );


        // ==================================================
        // 10. CREATE ALL SETTLEMENT ROWS
        // ==================================================

        const settlementResults = [];


        for (
            const split
            of splits
        ) {

            const settlement =
                await createSettlementRow({

                    song,

                    split,

                    royaltyVersion,

                    periodNumber,

                    activity,

                    revenue,

                    client

                });


            settlementResults.push({

                settlement,

                split

            });
        }


        // ==================================================
        // 11. CREDIT CONTRIBUTORS
        // ==================================================

        const walletCredits = [];


        for (
            const item
            of settlementResults
        ) {

            const credit =
                await creditContributor({

                    settlement:
                        item.settlement,

                    split:
                        item.split,

                    song,

                    royaltyVersion,

                    periodNumber,

                    client

                });


            walletCredits.push(
                credit
            );
        }


        // ==================================================
        // 12. COMMIT
        // ==================================================

        await client.query(
            "COMMIT"
        );


        // ==================================================
        // 13. RESULT
        // ==================================================

        return {

            settled:
                true,

            created:
                true,

            locked:
                true,

            songId:
                song.id,

            songTitle:
                song.title ||
                song.song_title,

            artistName:
                song.artist_name,

            royaltyVersion,

            periodNumber,

            currency:
                CURRENCY,

            activity: {

                playsStart:
                    activity.playsStart,

                playsEnd:
                    activity.playsEnd,

                newPlays:
                    activity.royaltyPlays,

                downloadsStart:
                    activity.downloadsStart,

                downloadsEnd:
                    activity.downloadsEnd,

                newDownloads:
                    activity.royaltyDownloads

            },

            revenue,

            contributorCount:
                splits.length,

            contributors:
                walletCredits

        };

    } catch (error) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "ROYALTY ROLLBACK ERROR:",
                rollbackError
            );
        }


        throw error;

    } finally {

        client.release();

    }
}


// ======================================================
// GET SONG SETTLEMENT HISTORY
// ======================================================

async function getSongSettlementHistory(
    songId
) {

    const result =
        await pool.query(
            `
            SELECT

                rs.*,

                s.title AS song_title,
                s.artist_name

            FROM royalty_settlements rs

            INNER JOIN songs s
                ON s.id = rs.song_id

            WHERE rs.song_id = $1

            ORDER BY

                rs.period_number DESC,
                rs.id DESC
            `,
            [
                songId
            ]
        );


    return result.rows;
}


// ======================================================
// GET USER SETTLEMENT HISTORY
// ======================================================

async function getUserSettlementHistory(
    userId
) {

    const result =
        await pool.query(
            `
            SELECT

                rs.*,

                s.title AS song_title,
                s.artist_name

            FROM royalty_settlements rs

            INNER JOIN songs s
                ON s.id = rs.song_id

            WHERE rs.user_id = $1

            ORDER BY

                rs.created_at DESC,
                rs.id DESC
            `,
            [
                userId
            ]
        );


    return result.rows;
}


// ======================================================
// GET USER CREDITED ROYALTIES
// ======================================================

async function getUserCreditedRoyalties(
    userId
) {

    const result =
        await pool.query(
            `
            SELECT

                rs.*,

                s.title AS song_title,
                s.artist_name

            FROM royalty_settlements rs

            INNER JOIN songs s
                ON s.id = rs.song_id

            WHERE

                rs.user_id = $1

            AND rs.status = $2

            ORDER BY

                rs.locked_at DESC,
                rs.id DESC
            `,
            [
                userId,
                SETTLEMENT_STATUS.CREDITED
            ]
        );


    return result.rows;
}


// ======================================================
// GET SONG UNSETTLED ACTIVITY
//
// IMPORTANT:
//
// This is an ESTIMATE.
//
// It does NOT create accounting rows.
//
// The activity boundary comes from the latest settlement.
//
// The royalty percentage comes from the ACTIVE version.
//
// ======================================================

async function getSongUnsettledActivity(
    songId
) {

    const result =
        await pool.query(
            `
            SELECT

                s.id AS song_id,

                s.title,
                s.song_title,
                s.artist_name,

                s.plays AS current_plays,
                s.downloads AS current_downloads,

                COALESCE(
                    latest.plays_end,
                    0
                ) AS settled_plays,

                COALESCE(
                    latest.downloads_end,
                    0
                ) AS settled_downloads,

                latest.period_number AS last_period,
                latest.royalty_version AS last_royalty_version,

                active.version AS active_royalty_version,
                active.total_percentage AS active_total_percentage

            FROM songs s

            LEFT JOIN LATERAL (

                SELECT

                    rs.plays_end,
                    rs.downloads_end,

                    rs.period_number,
                    rs.royalty_version

                FROM royalty_settlements rs

                WHERE rs.song_id = s.id

                ORDER BY

                    rs.period_number DESC,
                    rs.id DESC

                LIMIT 1

            ) latest ON TRUE

            LEFT JOIN LATERAL (

                SELECT

                    srv.version,
                    srv.total_percentage

                FROM song_royalty_split_versions srv

                WHERE srv.song_id = s.id

                ORDER BY srv.version DESC

                LIMIT 1

            ) active ON TRUE

            WHERE s.id = $1

            LIMIT 1
            `,
            [
                songId
            ]
        );


    if (
        result.rows.length === 0
    ) {

        return null;
    }


    const row =
        result.rows[0];


    const currentPlays =
        normalizeCounter(
            row.current_plays
        );


    const currentDownloads =
        normalizeCounter(
            row.current_downloads
        );


    const settledPlays =
        normalizeCounter(
            row.settled_plays
        );


    const settledDownloads =
        normalizeCounter(
            row.settled_downloads
        );


    const newPlays =
        currentPlays -
        settledPlays;


    const newDownloads =
        currentDownloads -
        settledDownloads;


    const activeVersion =
        normalizeVersion(
            row.active_royalty_version
        );


    // ==================================================
    // COUNTER PROTECTION
    // ==================================================

    if (
        newPlays < 0 ||
        newDownloads < 0
    ) {

        return {

            songId:
                row.song_id,

            title:
                row.title ||
                row.song_title,

            artistName:
                row.artist_name,

            currentPlays,

            currentDownloads,

            settledPlays,

            settledDownloads,

            newPlays:
                0,

            newDownloads:
                0,

            estimatedNewRevenue:
                0,

            estimatedStreamingRevenue:
                0,

            estimatedDownloadRevenue:
                0,

            lastSettlementPeriod:
                row.last_period
                    ? Number(
                        row.last_period
                    )
                    : null,

            lastRoyaltyVersion:
                row.last_royalty_version
                    ? Number(
                        row.last_royalty_version
                    )
                    : null,

            activeRoyaltyVersion:
                activeVersion,

            currency:
                CURRENCY,

            blocked:
                true,

            error:
                "Song activity counters moved backwards. Settlement is blocked until the counters are corrected."

        };
    }


    // ==================================================
    // NO ACTIVE VERSION
    // ==================================================

    if (
        !activeVersion
    ) {

        return {

            songId:
                row.song_id,

            title:
                row.title ||
                row.song_title,

            artistName:
                row.artist_name,

            currentPlays,

            currentDownloads,

            settledPlays,

            settledDownloads,

            newPlays,

            newDownloads,

            estimatedNewRevenue:
                0,

            estimatedStreamingRevenue:
                0,

            estimatedDownloadRevenue:
                0,

            lastSettlementPeriod:
                row.last_period
                    ? Number(
                        row.last_period
                    )
                    : null,

            lastRoyaltyVersion:
                row.last_royalty_version
                    ? Number(
                        row.last_royalty_version
                    )
                    : null,

            activeRoyaltyVersion:
                null,

            currency:
                CURRENCY,

            blocked:
                true,

            error:
                "No active royalty split version exists for this song."

        };
    }


    // ==================================================
    // REVENUE
    // ==================================================

    const revenue =
        calculateSettlementRevenue(
            newPlays,
            newDownloads
        );


    return {

        songId:
            row.song_id,

        title:
            row.title ||
            row.song_title,

        artistName:
            row.artist_name,

        currentPlays,

        currentDownloads,

        settledPlays,

        settledDownloads,

        newPlays,

        newDownloads,

        estimatedNewRevenue:
            revenue.grossRevenue,

        estimatedStreamingRevenue:
            revenue.streamingRevenue,

        estimatedDownloadRevenue:
            revenue.downloadRevenue,

        streamRate:
            revenue.streamRate,

        downloadRate:
            revenue.downloadRate,

        lastSettlementPeriod:
            row.last_period
                ? Number(
                    row.last_period
                )
                : null,

        lastRoyaltyVersion:
            row.last_royalty_version
                ? Number(
                    row.last_royalty_version
                )
                : null,

        activeRoyaltyVersion:
            activeVersion,

        royaltyVersionChanged:
            Boolean(
                row.last_royalty_version &&
                Number(
                    row.last_royalty_version
                ) !== activeVersion
            ),

        currency:
            CURRENCY,

        blocked:
            false

    };
}


// ======================================================
// GET USER ROYALTY SUMMARY
// ======================================================

async function getUserRoyaltySummary(
    userId
) {

    const result =
        await pool.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        rs.earned_amount
                    ),
                    0
                ) AS total_settled,

                COALESCE(
                    SUM(
                        CASE
                            WHEN rs.status = 'credited'
                            THEN rs.earned_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS credited,

                COALESCE(
                    SUM(
                        CASE
                            WHEN rs.status = 'unclaimed'
                            THEN rs.earned_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS unclaimed,

                COALESCE(
                    SUM(
                        CASE
                            WHEN rs.status = 'locked'
                            THEN rs.earned_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS locked,

                COALESCE(
                    SUM(
                        CASE
                            WHEN rs.status = 'calculated'
                            THEN rs.earned_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS calculated

            FROM royalty_settlements rs

            WHERE rs.user_id = $1
            `,
            [
                userId
            ]
        );


    const row =
        result.rows[0];


    return {

        currency:
            CURRENCY,

        totalSettled:
            roundMoney(
                row.total_settled
            ),

        credited:
            roundMoney(
                row.credited
            ),

        unclaimed:
            roundMoney(
                row.unclaimed
            ),

        locked:
            roundMoney(
                row.locked
            ),

        calculated:
            roundMoney(
                row.calculated
            )

    };
}


// ======================================================
// GET USER ROYALTY DATA
// ======================================================

async function getUserRoyaltyData(
    userId
) {

    const [
        settlements,
        credited,
        summary
    ] = await Promise.all([

        getUserSettlementHistory(
            userId
        ),

        getUserCreditedRoyalties(
            userId
        ),

        getUserRoyaltySummary(
            userId
        )

    ]);


    return {

        currency:
            CURRENCY,

        summary,

        settlements,

        credited

    };
}


// ======================================================
// GET USER UNSETTLED SONGS
// ======================================================

async function getUserUnsettledSongs(
    userId
) {

    const result =
        await pool.query(
            `
            SELECT DISTINCT

                s.id,
                s.title,
                s.song_title,
                s.artist_name,

                s.plays,
                s.downloads,

                s.monetization_enabled

            FROM songs s

            INNER JOIN song_royalty_splits srs
                ON srs.song_id = s.id

            WHERE

                srs.user_id = $1

            AND s.monetization_enabled = TRUE

            ORDER BY s.id DESC
            `,
            [
                userId
            ]
        );


    const songs = [];


    for (
        const song
        of result.rows
    ) {

        const activity =
            await getSongUnsettledActivity(
                song.id
            );


        if (!activity) {
            continue;
        }


        if (
            activity.blocked
        ) {
            continue;
        }


        if (
            activity.newPlays <= 0 &&
            activity.newDownloads <= 0
        ) {
            continue;
        }


        const activeVersion =
            activity.activeRoyaltyVersion;


        if (!activeVersion) {
            continue;
        }


        const splitResult =
            await pool.query(
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

                    song.id,

                    userId,

                    activeVersion

                ]
            );


        if (
            splitResult.rows.length === 0
        ) {

            continue;
        }


        const split =
            splitResult.rows[0];


        const percentage =
            toNumber(
                split.percentage
            );


        const estimated =
            roundMoney(
                activity.estimatedNewRevenue *
                (
                    percentage /
                    100
                )
            );


        songs.push({

            songId:
                song.id,

            title:
                song.title ||
                song.song_title,

            artistName:
                song.artist_name,

            royaltyPercentage:
                percentage,

            splitVersion:
                activeVersion,

            newPlays:
                activity.newPlays,

            newDownloads:
                activity.newDownloads,

            estimatedStreamingRevenue:
                roundMoney(
                    activity
                        .estimatedStreamingRevenue *
                    (
                        percentage /
                        100
                    )
                ),

            estimatedDownloadRevenue:
                roundMoney(
                    activity
                        .estimatedDownloadRevenue *
                    (
                        percentage /
                        100
                    )
                ),

            estimatedEarnings:
                estimated,

            currency:
                CURRENCY

        });
    }


    return songs;
}


// ======================================================
// CHECK WHETHER USER IS A CONTRIBUTOR
// ======================================================
//
// This checks the split table rather than settlement history.
//
// Therefore a contributor can access a song BEFORE their
// first settlement has been created.
//
// ======================================================

async function isSongContributor(
    songId,
    userId
) {

    const result =
        await pool.query(
            `
            SELECT 1

            FROM song_royalty_splits

            WHERE

                song_id = $1

            AND user_id = $2

            LIMIT 1
            `,
            [
                songId,
                userId
            ]
        );


    return (
        result.rows.length > 0
    );
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    // Main settlement
    settleSong,

    // History
    getSongSettlementHistory,

    getUserSettlementHistory,

    getUserCreditedRoyalties,

    // Unsettled
    getSongUnsettledActivity,

    getUserUnsettledSongs,

    // Summary
    getUserRoyaltySummary,

    getUserRoyaltyData,

    // Access
    isSongContributor,

    // Calculations
    calculateNewActivity,

    calculateSettlementRevenue,

    // Versions
    getLatestRoyaltyVersion,

    getRoyaltyVersionByNumber,

    getRoyaltySplits,

    // Song
    getSong

};