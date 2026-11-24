// ======================================================
// CAVE TUNES
// ROYALTY EARNINGS SERVICE
//
// SINGLE SOURCE OF TRUTH FOR ROYALTY CALCULATIONS
//
// Used by:
// - Royalty Management
// - Royalty Settlement
// - Wallet
//
// IMPORTANT:
// These are Cave Tunes ESTIMATED earnings rates.
// They are NOT claimed to be actual DSP payouts.
// ======================================================

const pool =
    require("../config/database");


// ======================================================
// CONFIGURABLE RATES
// ======================================================
//
// .env:
//
// CAVE_TUNES_STREAM_RATE=0.003
// CAVE_TUNES_DOWNLOAD_RATE=0.50
//
// ======================================================

const STREAM_RATE =
    Number(
        process.env.CAVE_TUNES_STREAM_RATE ||
        0.003
    );

const DOWNLOAD_RATE =
    Number(
        process.env.CAVE_TUNES_DOWNLOAD_RATE ||
        0.50
    );


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
// CALCULATE GROSS REVENUE
// ======================================================
//
// plays × stream rate
// +
// downloads × download rate
//
// ======================================================

function calculateRevenue(
    plays = 0,
    downloads = 0
) {

    const streamCount =
        toNumber(plays);

    const downloadCount =
        toNumber(downloads);


    const streamingRevenue =
        streamCount *
        STREAM_RATE;


    const downloadRevenue =
        downloadCount *
        DOWNLOAD_RATE;


    const totalRevenue =
        streamingRevenue +
        downloadRevenue;


    return {

        plays:
            streamCount,

        downloads:
            downloadCount,

        streamingRevenue:
            roundMoney(
                streamingRevenue
            ),

        downloadRevenue:
            roundMoney(
                downloadRevenue
            ),

        totalRevenue:
            roundMoney(
                totalRevenue
            )
    };
}


// ======================================================
// CALCULATE CONTRIBUTOR EARNINGS
// ======================================================
//
// Example:
//
// total revenue = $100
// percentage    = 50
//
// earnings = $50
//
// ======================================================

function calculateContributorRevenue(
    revenue,
    percentage
) {

    const totalRevenue =
        toNumber(revenue);

    const royaltyPercentage =
        toNumber(percentage);


    const share =
        royaltyPercentage / 100;


    return {

        percentage:
            royaltyPercentage,

        estimatedEarnings:
            roundMoney(
                totalRevenue *
                share
            )
    };
}


// ======================================================
// CALCULATE CONTRIBUTOR REVENUE FROM SONG
// ======================================================

function calculateSongContributorEarnings(
    song,
    percentage
) {

    const revenue =
        calculateRevenue(
            song.plays,
            song.downloads
        );


    const contributor =
        calculateContributorRevenue(
            revenue.totalRevenue,
            percentage
        );


    return {

        plays:
            revenue.plays,

        downloads:
            revenue.downloads,

        streamingRevenue:
            revenue.streamingRevenue,

        downloadRevenue:
            revenue.downloadRevenue,

        totalRevenue:
            revenue.totalRevenue,

        percentage:
            contributor.percentage,

        estimatedEarnings:
            contributor.estimatedEarnings
    };
}


// ======================================================
// CALCULATE ALL CONTRIBUTOR EARNINGS
// ======================================================
//
// Takes the latest royalty splits and calculates
// each contributor's share.
//
// ======================================================

function calculateContributorEarnings(
    song,
    splits = []
) {

    const revenue =
        calculateRevenue(
            song.plays,
            song.downloads
        );


    return splits.map(
        split => {

            const percentage =
                toNumber(
                    split.percentage
                );


            const earnings =
                calculateContributorRevenue(
                    revenue.totalRevenue,
                    percentage
                );


            return {

                id:
                    split.id ??
                    null,

                userId:
                    split.user_id ??
                    split.userId ??
                    null,

                participantName:
                    split.participant_name ??
                    split.participantName ??
                    null,

                role:
                    split.role ??
                    null,

                percentage:
                    earnings.percentage,

                isRegisteredUser:
                    Boolean(
                        split.is_registered_user ??
                        split.isRegisteredUser
                    ),

                isUnclaimed:
                    Boolean(
                        split.is_unclaimed ??
                        split.isUnclaimed
                    ),

                splitVersion:
                    split.split_version ??
                    split.splitVersion ??
                    null,

                estimatedEarnings:
                    earnings.estimatedEarnings
            };
        }
    );
}


// ======================================================
// FIND USER'S ROYALTY SPLIT
// ======================================================

function findUserSplit(
    splits = [],
    userId
) {

    const numericUserId =
        toNumber(userId);


    return splits.find(
        split =>
            toNumber(
                split.user_id ??
                split.userId
            ) === numericUserId
    ) || null;
}


// ======================================================
// CALCULATE USER'S SONG EARNINGS
// ======================================================

function calculateUserSongEarnings(
    song,
    splits,
    userId
) {

    const ownSplit =
        findUserSplit(
            splits,
            userId
        );


    if (!ownSplit) {

        return {

            hasSplit: false,

            percentage: 0,

            estimatedEarnings: 0,

            revenue:
                calculateRevenue(
                    song.plays,
                    song.downloads
                )
        };
    }


    const percentage =
        toNumber(
            ownSplit.percentage
        );


    const earnings =
        calculateSongContributorEarnings(
            song,
            percentage
        );


    return {

        hasSplit: true,

        split: ownSplit,

        percentage:
            earnings.percentage,

        estimatedEarnings:
            earnings.estimatedEarnings,

        revenue: {

            streaming:
                earnings.streamingRevenue,

            downloads:
                earnings.downloadRevenue,

            total:
                earnings.totalRevenue
        },

        plays:
            earnings.plays,

        downloads:
            earnings.downloads
    };
}


// ======================================================
// CALCULATE SUMMARY
// ======================================================
//
// songs should already contain the latest royalty splits.
//
// For OWN songs:
// use the owner/user's split.
//
// For FEATURED songs:
// use the logged-in user's split.
//
// ======================================================

function calculateSummary(
    songs = [],
    userId
) {

    let totalStreams = 0;

    let totalDownloads = 0;

    let totalRevenue = 0;

    let estimatedEarnings = 0;


    for (
        const song of songs
    ) {

        const plays =
            toNumber(
                song.plays
            );

        const downloads =
            toNumber(
                song.downloads
            );


        totalStreams +=
            plays;

        totalDownloads +=
            downloads;


        const revenue =
            calculateRevenue(
                plays,
                downloads
            );


        totalRevenue +=
            revenue.totalRevenue;


        let splitUserId =
            userId;


        // --------------------------------------------------
        // OWN SONG
        // --------------------------------------------------

        if (
            song.ownerId !== undefined &&
            song.ownerId !== null &&
            userId !== undefined &&
            userId !== null &&
            toNumber(song.ownerId) ===
                toNumber(userId)
        ) {

            splitUserId =
                userId;
        }


        const ownSplit =
            findUserSplit(
                song.royalty?.splits ||
                song.splits ||
                [],
                splitUserId
            );


        if (ownSplit) {

            const contributor =
                calculateContributorRevenue(
                    revenue.totalRevenue,
                    ownSplit.percentage
                );


            estimatedEarnings +=
                contributor.estimatedEarnings;
        }
    }


    return {

        songs:
            songs.length,

        streams:
            totalStreams,

        downloads:
            totalDownloads,

        revenue:
            roundMoney(
                totalRevenue
            ),

        estimatedEarnings:
            roundMoney(
                estimatedEarnings
            )
    };
}


// ======================================================
// GET LATEST ROYALTY SPLITS FOR SONG
// ======================================================
//
// This is useful for settlement.
//
// It always loads the latest royalty version.
//
// ======================================================

async function getLatestSongRoyaltySplits(
    songId,
    client = pool
) {

    const result =
        await client.query(
            `
                SELECT

                    rs.id,

                    rs.song_id,

                    rs.user_id,

                    rs.participant_name,

                    rs.role,

                    rs.percentage,

                    rs.is_registered_user,

                    rs.is_unclaimed,

                    rs.split_version,

                    rv.version,

                    rv.locked,

                    rv.total_percentage

                FROM song_royalty_splits rs

                INNER JOIN song_royalty_split_versions rv

                    ON rv.song_id =
                        rs.song_id

                    AND rv.version =
                        rs.split_version

                WHERE
                    rs.song_id = $1

                AND
                    rs.split_version = (

                        SELECT
                            MAX(v.version)

                        FROM song_royalty_split_versions v

                        WHERE
                            v.song_id = $1

                    )

                ORDER BY
                    rs.id ASC
            `,
            [
                songId
            ]
        );


    return result.rows;
}


// ======================================================
// GET SONG WITH ROYALTY INFORMATION
// ======================================================
//
// Used by settlement and other backend services.
//
// ======================================================

async function getSongRoyaltyData(
    songId,
    client = pool
) {

    const songResult =
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

                    s.download_sales

                FROM songs s

                WHERE
                    s.id = $1

                LIMIT 1
            `,
            [
                songId
            ]
        );


    if (
        songResult.rows.length === 0
    ) {

        return null;
    }


    const song =
        songResult.rows[0];


    const splits =
        await getLatestSongRoyaltySplits(
            songId,
            client
        );


    const revenue =
        calculateRevenue(
            song.plays,
            song.downloads
        );


    const contributors =
        calculateContributorEarnings(
            song,
            splits
        );


    return {

        song,

        revenue,

        splits,

        contributors,

        royaltyVersion:
            splits.length > 0
                ? splits[0].version
                : null,

        royaltyLocked:
            splits.length > 0
                ? Boolean(
                    splits[0].locked
                )
                : false,

        royaltyTotalPercentage:
            splits.reduce(
                (
                    total,
                    split
                ) =>
                    total +
                    toNumber(
                        split.percentage
                    ),
                0
            )
    };
}


// ======================================================
// GET USER ROYALTY EARNINGS FOR SONG
// ======================================================

async function getUserSongRoyaltyEarnings(
    songId,
    userId,
    client = pool
) {

    const data =
        await getSongRoyaltyData(
            songId,
            client
        );


    if (!data) {

        return null;
    }


    const userSplit =
        findUserSplit(
            data.splits,
            userId
        );


    if (!userSplit) {

        return {

            ...data,

            userId,

            hasSplit: false,

            userPercentage: 0,

            userEstimatedEarnings: 0
        };
    }


    const userEarnings =
        calculateContributorRevenue(
            data.revenue.totalRevenue,
            userSplit.percentage
        );


    return {

        ...data,

        userId,

        hasSplit: true,

        userPercentage:
            userEarnings.percentage,

        userEstimatedEarnings:
            userEarnings.estimatedEarnings
    };
}


// ======================================================
// VALIDATE ROYALTY SPLITS
// ======================================================
//
// The royalty system requires 100%.
//
// We keep this validation here so settlement cannot
// accidentally credit an invalid split.
//
// ======================================================

function validateSplits(
    splits = []
) {

    const total =
        splits.reduce(
            (
                sum,
                split
            ) =>
                sum +
                toNumber(
                    split.percentage
                ),
            0
        );


    const roundedTotal =
        Math.round(
            total * 100
        ) / 100;


    return {

        valid:
            roundedTotal === 100,

        totalPercentage:
            roundedTotal
    };
}


// ======================================================
// GET RATES
// ======================================================

function getRates() {

    return {

        streamingPerPlay:
            STREAM_RATE,

        downloadPerSale:
            DOWNLOAD_RATE
    };
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    STREAM_RATE,

    DOWNLOAD_RATE,

    roundMoney,

    calculateRevenue,

    calculateContributorRevenue,

    calculateSongContributorEarnings,

    calculateContributorEarnings,

    findUserSplit,

    calculateUserSongEarnings,

    calculateSummary,

    getLatestSongRoyaltySplits,

    getSongRoyaltyData,

    getUserSongRoyaltyEarnings,

    validateSplits,

    getRates
};