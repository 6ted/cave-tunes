// ======================================================
// CAVE TUNES
// ROYALTY MANAGEMENT SERVICE
//
// PURPOSE:
// - Show monetized songs owned by the user
// - Show featured songs where the user participates
// - Calculate estimated revenue
// - Calculate user-specific royalty earnings
// - Integrate royalty_settlements
// - Separate settled and unsettled earnings
// - Respect royalty split versions
//
// IMPORTANT:
//
// royalty_settlements is the accounting history.
//
// We NEVER recalculate historical earnings using the
// CURRENT royalty percentage.
//
// Historical earnings:
//     SUM(credited settlement rows)
//
// Current unsettled earnings:
//     NEW activity × CURRENT royalty split
//
// Therefore:
//
// Total Estimated Earnings
//     = Already Settled
//     + Unsettled Earnings
//
// Currency:
//     USD
//
// ======================================================

const pool =
    require("../config/database");

const {
    calculateRevenue,
    calculateContributorRevenue,
    calculateContributorEarnings,
    calculateSummary: calculateRoyaltySummary,
    getRates
} =
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

function firstDefined(...values) {

    return values.find(
        value =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}


// ======================================================
// BUILD DISTRIBUTION INFORMATION
// ======================================================

function buildGenerationInfo(song) {

    return {

        monetized:
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
            ),

        youtubeMonetization:
            Boolean(
                song.youtube_monetization
            ),

        streamingEnabled:
            Boolean(
                song.monetization_enabled &&
                song.streaming_royalties
            ),

        downloadsEnabled:
            Boolean(
                song.monetization_enabled &&
                song.download_sales
            ),

        platforms:
            Array.isArray(song.platforms)
                ? song.platforms
                : [],

        monetizationEnabledAt:
            song.monetization_enabled_at ||
            null
    };
}


// ======================================================
// NORMALIZE SPLIT
//
// Database uses snake_case.
//
// Frontend expects camelCase.
//
// ======================================================

function normalizeSplit(split) {

    return {

        id:
            split?.id,

        userId:
            firstDefined(
                split?.userId,
                split?.user_id,
                null
            ),

        participantName:
            firstDefined(
                split?.participantName,
                split?.participant_name,
                "Unknown"
            ),

        role:
            firstDefined(
                split?.role,
                "Contributor"
            ),

        percentage:
            toNumber(
                split?.percentage
            ),

        isRegisteredUser:
            Boolean(
                firstDefined(
                    split?.isRegisteredUser,
                    split?.is_registered_user,
                    false
                )
            ),

        isUnclaimed:
            Boolean(
                firstDefined(
                    split?.isUnclaimed,
                    split?.is_unclaimed,
                    false
                )
            ),

        splitVersion:
            toNumber(
                firstDefined(
                    split?.splitVersion,
                    split?.split_version,
                    0
                )
            )
    };
}


// ======================================================
// FORMAT SONG
// ======================================================

function formatSong(row) {

    const plays =
        toNumber(
            row.plays
        );

    const downloads =
        toNumber(
            row.downloads
        );


    // --------------------------------------------------
    // SHARED ROYALTY ENGINE
    // --------------------------------------------------

    const revenue =
        calculateRevenue(
            plays,
            downloads
        );


    const rawSplits =
        Array.isArray(row.splits)
            ? row.splits
            : [];


    const splits =
        rawSplits.map(
            normalizeSplit
        );


    const formattedSplits =
        calculateContributorEarnings(
            {
                plays,
                downloads
            },
            splits
        );


    // --------------------------------------------------
    // Preserve normalized split information.
    //
    // calculateContributorEarnings may add earnings
    // information, so merge it back into the normalized
    // split.
    // --------------------------------------------------

    const finalSplits =
        splits.map(
            split => {

                const calculated =
                    formattedSplits.find(
                        item =>
                            Number(
                                firstDefined(
                                    item?.userId,
                                    item?.user_id
                                )
                            ) ===
                            Number(
                                split.userId
                            ) &&
                            Number(
                                firstDefined(
                                    item?.percentage,
                                    0
                                )
                            ) ===
                            Number(
                                split.percentage
                            )
                    );

                return {

                    ...split,

                    ...(calculated || {}),

                    userId:
                        split.userId,

                    participantName:
                        split.participantName,

                    role:
                        split.role,

                    percentage:
                        split.percentage
                };
            }
        );


    return {

        id:
            row.id,

        ownerId:
            row.user_id,

        title:
            row.title ||
            row.song_title,

        songTitle:
            row.song_title ||
            row.title,

        artistName:
            row.artist_name,

        albumName:
            row.album_name,

        releaseType:
            row.release_type,

        genre:
            row.genre,

        country:
            row.country,

        language:
            row.language,

        coverUrl:
            row.cover_url,

        audioUrl:
            row.audio_url,

        duration:
            row.duration,

        isrc:
            row.isrc,

        status:
            row.status,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at,

        releaseDate:
            row.release_date,

        plays,

        downloads,

        generation:
            buildGenerationInfo(
                row
            ),

        revenue: {

            streaming:
                roundMoney(
                    revenue.streamingRevenue
                ),

            downloads:
                roundMoney(
                    revenue.downloadRevenue
                ),

            total:
                roundMoney(
                    revenue.totalRevenue
                )
        },

        royalty: {

            version:
                row.royalty_version
                    ? Number(
                        row.royalty_version
                    )
                    : null,

            locked:
                Boolean(
                    row.royalty_locked
                ),

            totalPercentage:
                toNumber(
                    row.royalty_total_percentage
                ),

            splits:
                finalSplits,

            // Filled later by settlement calculation.
            userEstimatedEarnings:
                0,

            alreadySettled:
                0,

            unsettledEarnings:
                0,

            unsettledActivity:
                null
        }
    };
}


// ======================================================
// BASE SONG SELECT
// ======================================================
//
// Loads:
//
// - song
// - activity
// - monetization settings
// - latest royalty version
// - latest royalty splits
//
// ======================================================

const SONG_SELECT = `

    SELECT

        s.id,

        s.user_id,

        s.title,

        s.song_title,

        s.artist_name,

        s.album_name,

        s.release_type,

        s.genre,

        s.country,

        s.language,

        s.cover_url,

        s.audio_url,

        s.duration,

        s.isrc,

        s.status,

        s.release_date,

        s.plays,

        s.downloads,

        s.platforms,

        s.youtube_monetization,

        s.streaming_royalties,

        s.download_sales,

        s.monetization_enabled,

        s.monetization_enabled_at,

        s.created_at,

        s.updated_at,

        rv.version AS royalty_version,

        rv.locked AS royalty_locked,

        rv.total_percentage AS royalty_total_percentage,

        COALESCE(

            (

                SELECT

                    json_agg(

                        json_build_object(

                            'id',
                                rs.id,

                            'user_id',
                                rs.user_id,

                            'participant_name',
                                rs.participant_name,

                            'role',
                                rs.role,

                            'percentage',
                                rs.percentage,

                            'is_registered_user',
                                rs.is_registered_user,

                            'is_unclaimed',
                                rs.is_unclaimed,

                            'split_version',
                                rs.split_version

                        )

                        ORDER BY
                            rs.id ASC

                    )

                FROM
                    song_royalty_splits rs

                WHERE
                    rs.song_id = s.id

                AND
                    rs.split_version =
                        rv.version

            ),

            '[]'::json

        ) AS splits

    FROM songs s

    LEFT JOIN LATERAL (

        SELECT

            v.version,

            v.locked,

            v.total_percentage

        FROM
            song_royalty_split_versions v

        WHERE
            v.song_id = s.id

        ORDER BY
            v.version DESC

        LIMIT 1

    ) rv ON TRUE
`;


// ======================================================
// GET USER SPLIT
// ======================================================

function getUserSplit(
    splits,
    userId
) {

    if (
        !Array.isArray(
            splits
        )
    ) {
        return null;
    }


    return (
        splits.find(
            split =>
                Number(
                    split.userId
                ) ===
                Number(userId)
        ) ||
        null
    );
}


// ======================================================
// GET SETTLEMENT ACCOUNTING
//
// This is the important part.
//
// Historical:
//     SUM(credited)
//
// Current:
//     current counters - last settlement boundary
//
// The current activity is valued using the CURRENT
// royalty split version.
//
// ======================================================

async function getUserSongSettlementAccounting(
    song,
    userId
) {

    // --------------------------------------------------
    // GET ALREADY CREDITED HISTORY
    // --------------------------------------------------

    const creditedResult =
        await pool.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        earned_amount
                    ),
                    0
                ) AS already_settled,

                COUNT(*) AS settlement_count

            FROM royalty_settlements

            WHERE
                song_id = $1

            AND
                user_id = $2

            AND
                status = 'credited'
            `,
            [
                song.id,
                userId
            ]
        );


    const alreadySettled =
        roundMoney(
            creditedResult.rows[0]
                ?.already_settled
        );


    const settlementCount =
        Number(
            creditedResult.rows[0]
                ?.settlement_count ||
            0
        );


    // --------------------------------------------------
    // GET LATEST SONG-WIDE SETTLEMENT BOUNDARY
    //
    // This is intentionally song-wide.
    //
    // All contributors in one period use the same
    // activity boundary.
    // --------------------------------------------------

    const latestResult =
        await pool.query(
            `
            SELECT

                period_number,

                royalty_version,

                plays_start,

                plays_end,

                downloads_start,

                downloads_end,

                created_at

            FROM royalty_settlements

            WHERE
                song_id = $1

            ORDER BY
                period_number DESC,

                id DESC

            LIMIT 1
            `,
            [
                song.id
            ]
        );


    const latest =
        latestResult.rows[0] ||
        null;


    const settledPlays =
        latest
            ? toNumber(
                latest.plays_end
            )
            : 0;


    const settledDownloads =
        latest
            ? toNumber(
                latest.downloads_end
            )
            : 0;


    const currentPlays =
        toNumber(
            song.plays
        );


    const currentDownloads =
        toNumber(
            song.downloads
        );


    // --------------------------------------------------
    // DO NOT ALLOW COUNTERS TO GO BACKWARDS.
    //
    // Settlement service itself throws on this.
    // Management simply reports zero unsettled activity
    // until the issue is resolved.
    // --------------------------------------------------

    const countersValid =
        currentPlays >= settledPlays &&
        currentDownloads >= settledDownloads;


    const newPlays =
        countersValid
            ? currentPlays -
              settledPlays
            : 0;


    const newDownloads =
        countersValid
            ? currentDownloads -
              settledDownloads
            : 0;


    // --------------------------------------------------
    // CURRENT USER SPLIT
    // --------------------------------------------------

    const split =
        getUserSplit(
            song.royalty.splits,
            userId
        );


    const percentage =
        split
            ? toNumber(
                split.percentage
            )
            : 0;


    // --------------------------------------------------
    // CURRENT UNSETTLED REVENUE
    //
    // Uses the same rates as the settlement service.
    // --------------------------------------------------

    const revenue =
        calculateRevenue(
            newPlays,
            newDownloads
        );


    const grossUnsettledRevenue =
        roundMoney(
            revenue.totalRevenue
        );


    const unsettledEarnings =
        split
            ? roundMoney(
                grossUnsettledRevenue *
                (
                    percentage / 100
                )
            )
            : 0;


    // --------------------------------------------------
    // TOTAL ESTIMATED USER EARNINGS
    //
    // Historical credited money
    // +
    // current unsettled activity
    //
    // This remains correct even when royalty versions
    // change.
    // --------------------------------------------------

    const totalEstimatedEarnings =
        roundMoney(
            alreadySettled +
            unsettledEarnings
        );


    return {

        alreadySettled,

        settlementCount,

        settledPlays,

        settledDownloads,

        currentPlays,

        currentDownloads,

        newPlays,

        newDownloads,

        percentage,

        royaltyVersion:
            song.royalty.version,

        settlementPeriod:
            latest
                ? Number(
                    latest.period_number
                )
                : null,

        lastSettlementAt:
            latest?.created_at ||
            null,

        streamingRevenue:
            roundMoney(
                revenue.streamingRevenue
            ),

        downloadRevenue:
            roundMoney(
                revenue.downloadRevenue
            ),

        grossUnsettledRevenue,

        unsettledEarnings,

        totalEstimatedEarnings,

        countersValid
    };
}


// ======================================================
// ADD SETTLEMENT INFORMATION TO SONG
// ======================================================

async function attachSettlementAccounting(
    song,
    userId
) {

    const accounting =
        await getUserSongSettlementAccounting(
            song,
            userId
        );


    return {

        ...song,

        royalty: {

            ...song.royalty,

            userEstimatedEarnings:
                accounting.totalEstimatedEarnings,

            alreadySettled:
                accounting.alreadySettled,

            unsettledEarnings:
                accounting.unsettledEarnings,

            unsettledActivity: {

                currentPlays:
                    accounting.currentPlays,

                currentDownloads:
                    accounting.currentDownloads,

                settledPlays:
                    accounting.settledPlays,

                settledDownloads:
                    accounting.settledDownloads,

                newPlays:
                    accounting.newPlays,

                newDownloads:
                    accounting.newDownloads,

                estimatedRevenue:
                    accounting.grossUnsettledRevenue,

                streamingRevenue:
                    accounting.streamingRevenue,

                downloadRevenue:
                    accounting.downloadRevenue,

                royaltyPercentage:
                    accounting.percentage,

                royaltyVersion:
                    accounting.royaltyVersion,

                settlementPeriod:
                    accounting.settlementPeriod,

                countersValid:
                    accounting.countersValid
            }
        }
    };
}


// ======================================================
// GET OWN MONETIZED SONGS
// ======================================================

async function getOwnRoyaltyManagement(
    userId
) {

    const result =
        await pool.query(

            `

                ${SONG_SELECT}

                WHERE
                    s.user_id = $1

                AND
                    s.monetization_enabled = TRUE

                ORDER BY
                    s.created_at DESC

            `,

            [
                userId
            ]
        );


    const songs =
        result.rows.map(
            formatSong
        );


    return Promise.all(
        songs.map(
            song =>
                attachSettlementAccounting(
                    song,
                    userId
                )
        )
    );
}


// ======================================================
// GET FEATURED MONETIZED SONGS
// ======================================================
//
// User must appear in the LATEST royalty split.
//
// Owner's own songs are excluded.
// ======================================================

async function getFeaturedRoyaltyManagement(
    userId
) {

    const result =
        await pool.query(

            `

                ${SONG_SELECT}

                INNER JOIN LATERAL (

                    SELECT

                        rs.user_id,

                        rs.percentage,

                        rs.role,

                        rs.participant_name

                    FROM
                        song_royalty_splits rs

                    WHERE
                        rs.song_id = s.id

                    AND
                        rs.user_id = $1

                    AND
                        rs.split_version =

                        COALESCE(

                            (

                                SELECT
                                    MAX(v.version)

                                FROM
                                    song_royalty_split_versions v

                                WHERE
                                    v.song_id = s.id

                            ),

                            0

                        )

                    LIMIT 1

                ) my_split ON TRUE

                WHERE

                    s.monetization_enabled =
                        TRUE

                AND

                    s.user_id != $1

                ORDER BY
                    s.created_at DESC

            `,

            [
                userId
            ]
        );


    const songs =
        result.rows.map(
            formatSong
        );


    const songsWithAccounting =
        await Promise.all(
            songs.map(
                song =>
                    attachSettlementAccounting(
                        song,
                        userId
                    )
            )
        );


    return songsWithAccounting.map(
        song => {

            const ownSplit =
                getUserSplit(
                    song.royalty.splits,
                    userId
                );


            const percentage =
                ownSplit
                    ? toNumber(
                        ownSplit.percentage
                    )
                    : 0;


            const estimatedEarnings =
                roundMoney(
                    song.royalty
                        .userEstimatedEarnings
                );


            return {

                ...song,

                featured: {

                    isFeatured:
                        true,

                    role:
                        ownSplit?.role ||
                        null,

                    participantName:
                        ownSplit?.participantName ||
                        null,

                    percentage,

                    estimatedEarnings,

                    alreadySettled:
                        song.royalty
                            .alreadySettled,

                    unsettledEarnings:
                        song.royalty
                            .unsettledEarnings
                }
            };
        }
    );
}


// ======================================================
// GET MANAGEMENT SUMMARY
// ======================================================
//
// IMPORTANT:
//
// Summary is based on each song's settlement-aware
// user earnings.
//
// This prevents historical royalty versions from being
// recalculated using today's percentage.
// ======================================================

function calculateSummary(
    songs,
    userId
) {

    if (
        !Array.isArray(
            songs
        )
    ) {

        return {

            songs: 0,

            streams: 0,

            downloads: 0,

            revenue: 0,

            estimatedEarnings: 0,

            alreadySettled: 0,

            unsettledEarnings: 0
        };
    }


    const summary =
        songs.reduce(
            (
                result,
                song
            ) => {

                result.songs += 1;

                result.streams +=
                    toNumber(
                        song.plays
                    );

                result.downloads +=
                    toNumber(
                        song.downloads
                    );

                result.revenue +=
                    toNumber(
                        song.revenue?.total
                    );

                result.estimatedEarnings +=
                    toNumber(
                        song.royalty
                            ?.userEstimatedEarnings
                    );

                result.alreadySettled +=
                    toNumber(
                        song.royalty
                            ?.alreadySettled
                    );

                result.unsettledEarnings +=
                    toNumber(
                        song.royalty
                            ?.unsettledEarnings
                    );

                return result;
            },
            {

                songs: 0,

                streams: 0,

                downloads: 0,

                revenue: 0,

                estimatedEarnings: 0,

                alreadySettled: 0,

                unsettledEarnings: 0
            }
        );


    return {

        songs:
            summary.songs,

        streams:
            summary.streams,

        downloads:
            summary.downloads,

        revenue:
            roundMoney(
                summary.revenue
            ),

        estimatedEarnings:
            roundMoney(
                summary.estimatedEarnings
            ),

        alreadySettled:
            roundMoney(
                summary.alreadySettled
            ),

        unsettledEarnings:
            roundMoney(
                summary.unsettledEarnings
            )
    };
}


// ======================================================
// GET ESTIMATE RATES
// ======================================================

function getEstimateRates() {

    const rates =
        getRates();


    return {

        streamingPerPlay:
            rates.streamingPerPlay,

        downloadPerSale:
            rates.downloadPerSale
    };
}


// ======================================================
// GET USER SETTLEMENT TOTALS
//
// Useful for Wallet / Royalty Management.
//
// ======================================================

async function getUserSettlementTotals(
    userId
) {

    const result =
        await pool.query(
            `
            SELECT

                COALESCE(
                    SUM(
                        earned_amount
                    ),
                    0
                ) AS total_credited,

                COUNT(*) AS settlement_count

            FROM royalty_settlements

            WHERE
                user_id = $1

            AND
                status = 'credited'
            `,
            [
                userId
            ]
        );


    const row =
        result.rows[0] ||
        {};


    return {

        totalCredited:
            roundMoney(
                row.total_credited
            ),

        settlementCount:
            Number(
                row.settlement_count ||
                0
            )
    };
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

            WHERE
                rs.user_id = $1

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

            AND
                rs.status = 'credited'

            ORDER BY
                rs.locked_at DESC,

                rs.id DESC
            `,
            [
                userId
            ]
        );


    return result.rows;
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    // Management
    getOwnRoyaltyManagement,

    getFeaturedRoyaltyManagement,

    calculateSummary,

    getEstimateRates,

    // Shared royalty engine
    calculateRevenue,

    calculateContributorRevenue,

    calculateContributorEarnings,

    getRates,

    // Settlement-aware accounting
    getUserSettlementTotals,

    getUserSettlementHistory,

    getUserCreditedRoyalties,

    // Rates
    STREAM_RATE:
        getRates()
            .streamingPerPlay,

    DOWNLOAD_RATE:
        getRates()
            .downloadPerSale
};