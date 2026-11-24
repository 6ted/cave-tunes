
const pool = require("../config/database");

// ======================================================
// CAVE TUNES CHART CONFIGURATION
// ======================================================

const CHART_PERIOD_DAYS = 30;
const DEFAULT_LIMIT = 50;

const COUNTRY_CHARTS = {
    malawi: {
        name: "Top Malawi",
        country: "Malawi"
    },
    uk: {
        name: "Top UK",
        country: "United Kingdom"
    },
    usa: {
        name: "Top USA",
        country: "United States"
    },
    france: {
        name: "Top France",
        country: "France"
    }
};

const AFRICAN_COUNTRIES = [
    "Algeria", "Angola", "Benin", "Botswana",
    "Burkina Faso", "Burundi", "Cabo Verde",
    "Cameroon", "Central African Republic", "Chad",
    "Comoros", "Democratic Republic of the Congo",
    "Republic of the Congo", "Djibouti", "Egypt",
    "Equatorial Guinea", "Eritrea", "Eswatini",
    "Ethiopia", "Gabon", "Gambia", "Ghana",
    "Guinea", "Guinea-Bissau", "Ivory Coast",
    "Kenya", "Lesotho", "Liberia", "Libya",
    "Madagascar", "Malawi", "Mali", "Mauritania",
    "Mauritius", "Morocco", "Mozambique", "Namibia",
    "Niger", "Nigeria", "Rwanda",
    "Sao Tome and Principe", "Senegal", "Seychelles",
    "Sierra Leone", "Somalia", "South Africa",
    "South Sudan", "Sudan", "Tanzania", "Togo",
    "Tunisia", "Uganda", "Zambia", "Zimbabwe"
];

// ======================================================
// COUNTRY SLUG ALIASES
// ======================================================

const CHART_ALIASES = {
    "united-kingdom": "uk",
    "great-britain": "uk",
    "united-states": "usa",
    "united-states-of-america": "usa",
    "us": "usa",
    "top-africa": "africa"
};

const normalizeSlug = (slug) => {
    const cleanSlug = String(slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    return CHART_ALIASES[cleanSlug] || cleanSlug;
};

// ======================================================
// CHART SQL
//
// Unique listener:       100 points
// Qualifying play:         3 points
// Like:                   10 points
// Playlist addition:       8 points
//
// Period: Rolling 30 days
// Zero-engagement songs are excluded.
// ======================================================

const getChartSongs = async (countries, limit = DEFAULT_LIMIT) => {

    const result = await pool.query(
        `
        WITH eligible_songs AS (

            SELECT
                s.id,
                s.user_id,
                s.title,
                s.song_title,
                s.artist_name,
                s.album_name,
                s.release_type,
                s.genre,
                s.cover_url,
                s.audio_url,
                s.duration,
                s.created_at,

                u.username AS artist_username,
                u.country AS artist_country,
                u.profile_image AS artist_profile_image

            FROM songs s

            INNER JOIN users u
                ON u.id = s.user_id

            WHERE
                LOWER(TRIM(COALESCE(u.role, ''))) = 'artist'

                AND LOWER(TRIM(COALESCE(u.country, '')))
                    = ANY($1::text[])

                AND LOWER(TRIM(COALESCE(s.status, ''))) = 'published'
        ),

        play_stats AS (

            SELECT
                p.track_id AS song_id,

                COUNT(*) AS qualifying_plays,

                COUNT(
                    DISTINCT
                    CASE
                        WHEN p.user_id IS NOT NULL
                        THEN 'user:' || p.user_id::text

                        WHEN NULLIF(TRIM(p.visitor_id), '') IS NOT NULL
                        THEN 'visitor:' || TRIM(p.visitor_id)

                        ELSE NULL
                    END
                ) AS unique_listeners,

                MAX(p.played_at) AS latest_play

            FROM plays p

            INNER JOIN eligible_songs es
                ON es.id = p.track_id

            WHERE
                p.played_at >= NOW() - INTERVAL '30 days'

            GROUP BY p.track_id
        ),

        like_stats AS (

            SELECT
                sl.song_id,

                COUNT(DISTINCT sl.user_id) AS total_likes

            FROM song_likes sl

            INNER JOIN eligible_songs es
                ON es.id = sl.song_id

            WHERE
                sl.created_at >= NOW() - INTERVAL '30 days'

            GROUP BY sl.song_id
        ),

        playlist_stats AS (

            SELECT
                ps.song_id,

                COUNT(DISTINCT pl.user_id) AS playlist_additions

            FROM playlist_songs ps

            INNER JOIN playlists pl
                ON pl.id = ps.playlist_id

            INNER JOIN eligible_songs es
                ON es.id = ps.song_id

            WHERE
                ps.added_at >= NOW() - INTERVAL '30 days'

            GROUP BY ps.song_id
        )

        SELECT
            es.*,

            COALESCE(p.qualifying_plays, 0)::integer
                AS qualifying_plays,

            COALESCE(p.unique_listeners, 0)::integer
                AS unique_listeners,

            COALESCE(l.total_likes, 0)::integer
                AS total_likes,

            COALESCE(ps.playlist_additions, 0)::integer
                AS playlist_additions,

            (
                COALESCE(p.unique_listeners, 0) * 100
                +
                COALESCE(p.qualifying_plays, 0) * 3
                +
                COALESCE(l.total_likes, 0) * 10
                +
                COALESCE(ps.playlist_additions, 0) * 8
            )::integer AS chart_score,

            p.latest_play

        FROM eligible_songs es

        LEFT JOIN play_stats p
            ON p.song_id = es.id

        LEFT JOIN like_stats l
            ON l.song_id = es.id

        LEFT JOIN playlist_stats ps
            ON ps.song_id = es.id

        -- EXCLUDE SONGS WITH ZERO ENGAGEMENT
        WHERE
            COALESCE(p.unique_listeners, 0) > 0
            OR COALESCE(p.qualifying_plays, 0) > 0
            OR COALESCE(l.total_likes, 0) > 0
            OR COALESCE(ps.playlist_additions, 0) > 0

        ORDER BY
            chart_score DESC,
            unique_listeners DESC,
            qualifying_plays DESC,
            total_likes DESC,
            latest_play DESC NULLS LAST,
            es.created_at DESC

        LIMIT $2
        `,
        [
            countries.map(country => country.toLowerCase()),
            limit
        ]
    );

    return result.rows.map((song, index) => ({
        ...song,
        rank: index + 1
    }));
};

// ======================================================
// GET FEATURED CHARTS
// ======================================================

exports.getFeaturedCharts = async (req, res) => {

    try {

        const chartDefinitions = [
            ...Object.entries(COUNTRY_CHARTS).map(
                ([slug, chart]) => ({
                    slug,
                    name: chart.name,
                    countries: [chart.country]
                })
            ),

            {
                slug: "africa",
                name: "Top Africa",
                countries: AFRICAN_COUNTRIES
            }
        ];

        const charts = await Promise.all(
            chartDefinitions.map(async chart => {

                const songs = await getChartSongs(
                    chart.countries,
                    10
                );

                return {
                    slug: chart.slug,
                    name: chart.name,
                    count: songs.length,
                    songs
                };
            })
        );

        return res.json({
            success: true,
            period_days: CHART_PERIOD_DAYS,
            charts
        });

    } catch (error) {

        console.error("FEATURED CHARTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load featured charts."
        });
    }
};

// ======================================================
// GET AVAILABLE CHARTS
// ======================================================

exports.getAvailableCharts = async (req, res) => {

    try {

        const charts = [
            ...Object.entries(COUNTRY_CHARTS).map(
                ([slug, chart]) => ({
                    slug,
                    name: chart.name,
                    country: chart.country,
                    type: "country"
                })
            ),

            {
                slug: "africa",
                name: "Top Africa",
                country: "Africa",
                type: "region"
            }
        ];

        return res.json({
            success: true,
            charts
        });

    } catch (error) {

        console.error("AVAILABLE CHARTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load available charts."
        });
    }
};

// ======================================================
// GET INDIVIDUAL CHART
// ======================================================

exports.getChart = async (req, res) => {

    try {

        const slug = normalizeSlug(req.params.slug);

        let chart;

        if (slug === "africa") {

            chart = {
                slug: "africa",
                name: "Top Africa",
                countries: AFRICAN_COUNTRIES
            };

        } else if (COUNTRY_CHARTS[slug]) {

            chart = {
                slug,
                name: COUNTRY_CHARTS[slug].name,
                countries: [
                    COUNTRY_CHARTS[slug].country
                ]
            };

        } else {

            return res.status(404).json({
                success: false,
                message: "Chart not found."
            });
        }

        const songs = await getChartSongs(
            chart.countries,
            DEFAULT_LIMIT
        );

        return res.json({
            success: true,
            chart: {
                slug: chart.slug,
                name: chart.name,
                period_days: CHART_PERIOD_DAYS,
                count: songs.length,
                songs
            }
        });

    } catch (error) {

        console.error("INDIVIDUAL CHART ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load chart."
        });
    }
};
