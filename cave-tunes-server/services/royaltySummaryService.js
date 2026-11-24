// ======================================================
// CAVE TUNES
// ROYALTY SUMMARY SERVICE
//
// SINGLE SUMMARY SOURCE FOR:
// - Royalty Management
// - Wallet
//
// IMPORTANT:
//
// estimated = current song activity
// settled    = historical royalty settlements
// unsettled = estimated - settled
//
// Historical settlements are NEVER recalculated using
// today's royalty split.
//
// All royalty accounting is USD.
// ======================================================

const pool =
    require("../config/database");

const walletService =
    require("./walletService");

const royaltyEarningsService =
    require("./royaltyEarningsService");


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


// ======================================================
// GET USER MONETIZED SONGS
//
// Uses the SAME royalty engine and latest royalty split.
//
// This includes:
// - songs owned by the user
// - featured songs where the user has a royalty split
// ======================================================

async function getUserRoyaltySongs(
    userId,
    client = pool
) {

    const result =
        await client.query(
            `
            SELECT

                s.id,
                s.user_id,
                s.title,
                s.song_title,

                s.plays,
                s.downloads,

                s.monetization_enabled,
                s.streaming_royalties,
                s.download_sales,

                latest.version AS royalty_version,

                latest.locked AS royalty_locked,

                latest.total_percentage
                    AS royalty_total_percentage,

                my_split.id
                    AS split_id,

                my_split.percentage
                    AS split_percentage,

                my_split.role
                    AS split_role,

                my_split.participant_name
                    AS split_participant_name,

                my_split.is_registered_user
                    AS split_is_registered_user,

                my_split.is_unclaimed
                    AS split_is_unclaimed,

                my_split.split_version

            FROM songs s


            -- ------------------------------------------
            -- LATEST ROYALTY VERSION
            -- ------------------------------------------

            LEFT JOIN LATERAL (

                SELECT

                    v.version,
                    v.locked,
                    v.total_percentage

                FROM song_royalty_split_versions v

                WHERE
                    v.song_id = s.id

                ORDER BY
                    v.version DESC

                LIMIT 1

            ) latest ON TRUE


            -- ------------------------------------------
            -- USER'S SPLIT IN LATEST VERSION
            -- ------------------------------------------

            LEFT JOIN LATERAL (

                SELECT

                    rs.id,
                    rs.percentage,
                    rs.role,
                    rs.participant_name,
                    rs.is_registered_user,
                    rs.is_unclaimed,
                    rs.split_version

                FROM song_royalty_splits rs

                WHERE
                    rs.song_id = s.id

                AND
                    rs.user_id = $1

                AND
                    rs.split_version =
                        latest.version

                LIMIT 1

            ) my_split ON TRUE


            WHERE

                s.monetization_enabled = TRUE

            AND

                (

                    s.user_id = $1

                    OR

                    my_split.id IS NOT NULL

                )

            ORDER BY
                s.created_at DESC
            `,
            [
                userId
            ]
        );


    return result.rows;
}


// ======================================================
// CALCULATE CURRENT ESTIMATED EARNINGS
//
// IMPORTANT:
//
// This uses CURRENT song counters and CURRENT latest
// royalty split.
//
// It does NOT touch settlement history.
//
// ======================================================

function calculateEstimated(
    songs
) {

    let streaming =
        0;

    let downloads =
        0;

    let total =
        0;

    let streams =
        0;

    let downloadCount =
        0;


    const songEstimates =
        [];


    for (
        const song
        of songs
    ) {

        const plays =
            toNumber(
                song.plays
            );

        const downloadsForSong =
            toNumber(
                song.downloads
            );


        streams +=
            plays;

        downloadCount +=
            downloadsForSong;


        const revenue =
            royaltyEarningsService
                .calculateRevenue(
                    plays,
                    downloadsForSong
                );


        const percentage =
            toNumber(
                song.split_percentage
            );


        const contributor =
            royaltyEarningsService
                .calculateContributorRevenue(
                    revenue.totalRevenue,
                    percentage
                );


        const streamingEarnings =
            roundMoney(
                revenue.streamingRevenue *
                (
                    percentage /
                    100
                )
            );


        const downloadEarnings =
            roundMoney(
                revenue.downloadRevenue *
                (
                    percentage /
                    100
                )
            );


        streaming +=
            streamingEarnings;

        downloads +=
            downloadEarnings;

        total +=
            contributor.estimatedEarnings;


        songEstimates.push({

            songId:
                song.id,

            title:
                song.title ||
                song.song_title,

            ownerId:
                song.user_id,

            plays,

            downloads:
                downloadsForSong,

            royaltyVersion:
                song.royalty_version
                    ? Number(
                        song.royalty_version
                    )
                    : null,

            percentage,

            streaming:
                streamingEarnings,

            downloadsRevenue:
                downloadEarnings,

            total:
                contributor.estimatedEarnings
        });
    }


    return {

        streams,

        downloads:
            downloadCount,

        streaming:
            roundMoney(
                streaming
            ),

        downloadsRevenue:
            roundMoney(
                downloads
            ),

        total:
            roundMoney(
                total
            ),

        songs:
            songEstimates
    };
}


// ======================================================
// GET SETTLED ROYALTIES
//
// IMPORTANT:
//
// We use historical settlement rows.
//
// We DO NOT recalculate historical settlements using
// the current royalty split.
//
// Each settlement already contains:
// - royalty_percentage
// - streaming_revenue
// - download_revenue
// - earned_amount
// - royalty_version
// - period_number
//
// Only CREDITED settlements represent money actually
// credited to a registered user's wallet.
// ======================================================

async function getSettled(
    userId,
    client = pool
) {

    const result =
        await client.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        rs.earned_amount
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS total,

                COALESCE(
                    SUM(
                        rs.streaming_revenue *
                        (
                            rs.royalty_percentage /
                            100
                        )
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS streaming,

                COALESCE(
                    SUM(
                        rs.download_revenue *
                        (
                            rs.royalty_percentage /
                            100
                        )
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS downloads,

                COUNT(
                    *
                )
                FILTER (
                    WHERE
                        rs.status = 'credited'
                ) AS settlement_rows

            FROM royalty_settlements rs

            WHERE
                rs.user_id = $1
            `,
            [
                userId
            ]
        );


    const row =
        result.rows[0];


    return {

        total:
            roundMoney(
                row.total
            ),

        streaming:
            roundMoney(
                row.streaming
            ),

        downloads:
            roundMoney(
                row.downloads
            ),

        settlementRows:
            Number(
                row.settlement_rows || 0
            )
    };
}


// ======================================================
// BUILD UNSETTLED
//
// estimated - settled
//
// We never allow the displayed amount to become negative.
// ======================================================

function calculateUnsettled(
    estimated,
    settled
) {

    const streaming =
        Math.max(
            0,
            roundMoney(
                estimated.streaming -
                settled.streaming
            )
        );


    const downloads =
        Math.max(
            0,
            roundMoney(
                estimated.downloadsRevenue -
                settled.downloads
            )
        );


    const total =
        Math.max(
            0,
            roundMoney(
                estimated.total -
                settled.total
            )
        );


    return {

        streaming,

        downloads,

        total
    };
}


// ======================================================
// GET WALLET
// ======================================================

async function getWalletSummary(
    userId
) {

    const wallet =
        await walletService.getWallet(
            userId
        );


    return {

        available:
            roundMoney(
                wallet?.available_balance ??
                wallet?.availableBalance ??
                0
            ),

        pending:
            roundMoney(
                wallet?.pending_balance ??
                wallet?.pendingBalance ??
                0
            ),

        lifetimeEarnings:
            roundMoney(
                wallet?.lifetime_earnings ??
                wallet?.lifetimeEarnings ??
                0
            ),

        currency:
            wallet?.currency ||
            "USD"
    };
}


// ======================================================
// GET COMPLETE USER ROYALTY SUMMARY
//
// THIS IS THE MAIN FUNCTION.
//
// Used by:
// - Royalty Management
// - Wallet
// ======================================================

async function getUserRoyaltySummary(
    userId
) {

    const numericUserId =
        Number(userId);


    if (
        !Number.isFinite(
            numericUserId
        )
    ) {

        throw new Error(
            "Invalid user ID."
        );
    }


    // --------------------------------------------------
    // CURRENT ESTIMATES
    // --------------------------------------------------

    const songs =
        await getUserRoyaltySongs(
            numericUserId
        );


    const estimated =
        calculateEstimated(
            songs
        );


    // --------------------------------------------------
    // HISTORICAL SETTLEMENTS
    // --------------------------------------------------

    const settled =
        await getSettled(
            numericUserId
        );


    // --------------------------------------------------
    // CURRENT UNSETTLED AMOUNT
    // --------------------------------------------------

    const unsettled =
        calculateUnsettled(
            estimated,
            settled
        );


    // --------------------------------------------------
    // WALLET
    // --------------------------------------------------

    const wallet =
        await getWalletSummary(
            numericUserId
        );


    return {

        currency:
            "USD",


        estimated: {

            songs:
                estimated.songs.length,

            streams:
                estimated.streams,

            downloads:
                estimated.downloads,

            streaming:
                estimated.streaming,

            downloadsRevenue:
                estimated.downloadsRevenue,

            total:
                estimated.total
        },


        settled: {

            streaming:
                settled.streaming,

            downloads:
                settled.downloads,

            total:
                settled.total,

            settlementRows:
                settled.settlementRows
        },


        unsettled: {

            streaming:
                unsettled.streaming,

            downloads:
                unsettled.downloads,

            total:
                unsettled.total
        },


        wallet,


        rates:
            royaltyEarningsService
                .getRates(),

        songs:
            estimated.songs
    };
}


// ======================================================
// GET USER SETTLEMENT SUMMARY BY SONG
//
// Useful for Royalty Management song cards.
//
// ======================================================

async function getUserSongSettlementSummary(
    userId,
    songId
) {

    const result =
        await pool.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        rs.earned_amount
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS settled_total,

                COALESCE(
                    SUM(
                        rs.streaming_revenue *
                        (
                            rs.royalty_percentage /
                            100
                        )
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS settled_streaming,

                COALESCE(
                    SUM(
                        rs.download_revenue *
                        (
                            rs.royalty_percentage /
                            100
                        )
                    )
                    FILTER (
                        WHERE
                            rs.status = 'credited'
                    ),
                    0
                ) AS settled_downloads

            FROM royalty_settlements rs

            WHERE
                rs.user_id = $1

            AND
                rs.song_id = $2
            `,
            [
                userId,
                songId
            ]
        );


    const row =
        result.rows[0];


    return {

        settled:
            roundMoney(
                row.settled_total
            ),

        streaming:
            roundMoney(
                row.settled_streaming
            ),

        downloads:
            roundMoney(
                row.settled_downloads
            )
    };
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getUserRoyaltySummary,

    getUserSongSettlementSummary,

    getUserRoyaltySongs,

    calculateEstimated,

    getSettled,

    calculateUnsettled
};