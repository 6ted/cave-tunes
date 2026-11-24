// ======================================================
// CAVE TUNES YOUTUBE ROUTES
// Production-ready YouTube search + discovery service
//
// BASE:
// /api/youtube
//
// ENDPOINTS:
// GET /api/youtube/search
// GET /api/youtube/discovery
// GET /api/youtube/status
//
// IMPORTANT:
// - YouTube API key NEVER reaches the frontend.
// - Cave Tunes does NOT download or store YouTube audio.
// - YouTube videos are played through official embeds.
// ======================================================

const express = require("express");
const axios = require("axios");

const router = express.Router();

// ======================================================
// CONFIGURATION
// ======================================================

const YOUTUBE_API_URL =
    "https://www.googleapis.com/youtube/v3/search";

const YOUTUBE_API_KEY =
    process.env.YOUTUBE_API_KEY;

const DEFAULT_REGION =
    "MW";

const SEARCH_CACHE_DURATION =
    30 * 60 * 1000;

const DISCOVERY_CACHE_DURATION =
    12 * 60 * 60 * 1000;

const MAX_CACHE_ENTRIES =
    300;

const MAX_RESULTS =
    50;

const YOUTUBE_TIMEOUT =
    10000;

// ======================================================
// DISCOVERY CONFIGURATION
// ======================================================

const DISCOVERY_CATEGORIES = [
    {
        id: "african",
        title: "African Music",
        subtitle: "Fresh sounds from across Africa",
        query: "African music 2026"
    },

    {
        id: "malawi",
        title: "Malawi Music",
        subtitle: "Discover music from Malawi",
        query: "Malawi music 2026"
    },

    {
        id: "afrobeats",
        title: "Afrobeats",
        subtitle: "The sounds moving Africa",
        query: "Afrobeats 2026"
    },

    {
        id: "amapiano",
        title: "Amapiano",
        subtitle: "South Africa's signature sound",
        query: "Amapiano 2026"
    },

    {
        id: "rnb",
        title: "African R&B",
        subtitle: "Smooth sounds and soulful music",
        query: "African R&B music 2026"
    },

    {
        id: "gospel",
        title: "Gospel",
        subtitle: "Music of faith and inspiration",
        query: "African gospel music 2026"
    }
];

const DISCOVERY_MAX_RESULTS =
    8;

// ======================================================
// MEMORY CACHE
// ======================================================

const searchCache =
    new Map();

const discoveryCache =
    new Map();

// ======================================================
// IN-FLIGHT REQUESTS
// ======================================================

const inFlightRequests =
    new Map();

// ======================================================
// RATE LIMITER
// ======================================================

const rateLimitStore =
    new Map();

const RATE_LIMIT_WINDOW =
    60 * 1000;

const RATE_LIMIT_MAX_REQUESTS =
    30;

// ======================================================
// NORMALIZE QUERY
// ======================================================

function normalizeQuery(query) {

    return String(query || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

// ======================================================
// CLIENT IDENTIFIER
// ======================================================

function getClientIdentifier(req) {

    const forwarded =
        req.headers["x-forwarded-for"];

    if (forwarded) {

        return String(forwarded)
            .split(",")[0]
            .trim();
    }

    return (
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}

// ======================================================
// RATE LIMIT CHECK
// ======================================================

function isRateLimited(req) {

    const identifier =
        getClientIdentifier(req);

    const now =
        Date.now();

    const existing =
        rateLimitStore.get(identifier);

    if (!existing) {

        rateLimitStore.set(
            identifier,
            {
                count: 1,
                resetAt:
                    now +
                    RATE_LIMIT_WINDOW
            }
        );

        return false;
    }

    if (
        now >=
        existing.resetAt
    ) {

        rateLimitStore.set(
            identifier,
            {
                count: 1,
                resetAt:
                    now +
                    RATE_LIMIT_WINDOW
            }
        );

        return false;
    }

    existing.count++;

    return (
        existing.count >
        RATE_LIMIT_MAX_REQUESTS
    );
}

// ======================================================
// CLEAN RATE LIMIT STORE
// ======================================================

function cleanupRateLimitStore() {

    const now =
        Date.now();

    for (
        const [
            identifier,
            data
        ]
        of rateLimitStore.entries()
    ) {

        if (
            now >=
            data.resetAt
        ) {

            rateLimitStore.delete(
                identifier
            );
        }
    }
}

// ======================================================
// CACHE KEY
// ======================================================

function createSearchCacheKey({
    query,
    pageToken,
    regionCode,
    maxResults
}) {

    return [
        normalizeQuery(query),
        pageToken || "FIRST_PAGE",
        regionCode || DEFAULT_REGION,
        maxResults || 20
    ].join("|");
}

// ======================================================
// GET SEARCH CACHE
// ======================================================

function getSearchCache(key) {

    const cached =
        searchCache.get(key);

    if (!cached) {
        return null;
    }

    const age =
        Date.now() -
        cached.timestamp;

    if (
        age >
        cached.duration
    ) {

        searchCache.delete(key);

        return null;
    }

    return cached;
}

// ======================================================
// SAVE SEARCH CACHE
// ======================================================

function saveSearchCache(
    key,
    data,
    duration
) {

    if (
        searchCache.size >=
        MAX_CACHE_ENTRIES
    ) {

        const oldestKey =
            searchCache.keys()
                .next()
                .value;

        if (oldestKey) {

            searchCache.delete(
                oldestKey
            );
        }
    }

    searchCache.set(
        key,
        {
            timestamp:
                Date.now(),

            duration,

            data
        }
    );
}

// ======================================================
// TEXT CLEANER
// ======================================================

function cleanText(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

// ======================================================
// FORMAT VIDEO
// ======================================================

function formatVideo(item) {

    if (
        !item?.id?.videoId
    ) {
        return null;
    }

    const videoId =
        item.id.videoId;

    const snippet =
        item.snippet || {};

    const thumbnails =
        snippet.thumbnails || {};

    return {

        videoId,

        title:
            cleanText(
                snippet.title
            ),

        description:
            cleanText(
                snippet.description
            ),

        channelId:
            snippet.channelId ||
            "",

        channelTitle:
            cleanText(
                snippet.channelTitle
            ),

        publishedAt:
            snippet.publishedAt ||
            "",

        thumbnails: {

            default:
                thumbnails.default?.url ||
                "",

            medium:
                thumbnails.medium?.url ||
                "",

            high:
                thumbnails.high?.url ||
                ""
        },

        youtubeUrl:
            `https://www.youtube.com/watch?v=${videoId}`,

        embedUrl:
            `https://www.youtube.com/embed/${videoId}`
    };
}

// ======================================================
// FORMAT VIDEOS
// ======================================================

function formatVideos(items) {

    return (items || [])
        .map(formatVideo)
        .filter(Boolean);
}

// ======================================================
// REQUEST YOUTUBE API
// ======================================================

async function requestYouTube({
    query,
    pageToken,
    regionCode,
    maxResults
}) {

    if (!YOUTUBE_API_KEY) {

        const error =
            new Error(
                "YOUTUBE_API_KEY is not configured."
            );

        error.code =
            "YOUTUBE_CONFIGURATION_ERROR";

        throw error;
    }

    const response =
        await axios.get(
            YOUTUBE_API_URL,
            {
                timeout:
                    YOUTUBE_TIMEOUT,

                params: {

                    key:
                        YOUTUBE_API_KEY,

                    part:
                        "snippet",

                    q:
                        query,

                    type:
                        "video",

                    maxResults,

                    regionCode,

                    pageToken:
                        pageToken ||
                        undefined
                }
            }
        );

    const data =
        response.data || {};

    return {

        success: true,

        query,

        results:
            formatVideos(
                data.items
            ),

        nextPageToken:
            data.nextPageToken ||
            null,

        prevPageToken:
            data.prevPageToken ||
            null,

        pageInfo:
            data.pageInfo ||
            {}
    };
}

// ======================================================
// EXECUTE CACHED SEARCH
// ======================================================

async function executeSearch({
    query,
    pageToken,
    regionCode,
    maxResults
}) {

    const cacheKey =
        createSearchCacheKey({
            query,
            pageToken,
            regionCode,
            maxResults
        });

    const cached =
        getSearchCache(
            cacheKey
        );

    if (cached) {

        return {
            ...cached.data,
            cached: true,
            cacheAge:
                Date.now() -
                cached.timestamp
        };
    }

    // --------------------------------------------------
    // Deduplicate identical active requests
    // --------------------------------------------------

    if (
        inFlightRequests.has(
            cacheKey
        )
    ) {

        const result =
            await inFlightRequests.get(
                cacheKey
            );

        return {
            ...result,
            cached: false,
            deduplicated: true
        };
    }

    const request =
        requestYouTube({
            query,
            pageToken,
            regionCode,
            maxResults
        });

    inFlightRequests.set(
        cacheKey,
        request
    );

    try {

        const result =
            await request;

        saveSearchCache(
            cacheKey,
            result,
            SEARCH_CACHE_DURATION
        );

        return {
            ...result,
            cached: false,
            deduplicated: false
        };

    } finally {

        inFlightRequests.delete(
            cacheKey
        );
    }
}

// ======================================================
// SEARCH ROUTE
// ======================================================

router.get(
    "/search",
    async (req, res) => {

        try {

            // ==========================================
            // RATE LIMIT
            // ==========================================

            if (
                isRateLimited(req)
            ) {

                return res
                    .status(429)
                    .json({

                        success: false,

                        message:
                            "Too many YouTube searches. Please try again shortly.",

                        code:
                            "YOUTUBE_RATE_LIMITED"
                    });
            }

            // ==========================================
            // PARAMETERS
            // ==========================================

            const {
                q,
                pageToken,
                regionCode =
                    DEFAULT_REGION,
                maxResults = 20
            } = req.query;

            // ==========================================
            // QUERY VALIDATION
            // ==========================================

            if (
                !q ||
                !String(q).trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Search query is required.",

                        code:
                            "INVALID_QUERY"
                    });
            }

            const searchQuery =
                String(q)
                    .trim()
                    .replace(
                        /\s+/g,
                        " "
                    );

            if (
                searchQuery.length >
                200
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Search query is too long.",

                        code:
                            "QUERY_TOO_LONG"
                    });
            }

            // ==========================================
            // REGION
            // ==========================================

            const requestedRegion =
                String(
                    regionCode ||
                    DEFAULT_REGION
                ).toUpperCase();

            const safeRegion =
                /^[A-Z]{2}$/.test(
                    requestedRegion
                )
                    ? requestedRegion
                    : DEFAULT_REGION;

            // ==========================================
            // RESULTS
            // ==========================================

            const parsedMax =
                Number(
                    maxResults
                );

            const safeMaxResults =
                Math.min(
                    Math.max(
                        Number.isFinite(
                            parsedMax
                        )
                            ? Math.floor(
                                parsedMax
                            )
                            : 20,
                        1
                    ),
                    MAX_RESULTS
                );

            // ==========================================
            // PAGE TOKEN
            // ==========================================

            const safePageToken =
                pageToken
                    ? String(
                        pageToken
                    ).trim()
                    : null;

            // ==========================================
            // SEARCH
            // ==========================================

            const result =
                await executeSearch({

                    query:
                        searchQuery,

                    pageToken:
                        safePageToken,

                    regionCode:
                        safeRegion,

                    maxResults:
                        safeMaxResults
                });

            return res.json(
                result
            );

        } catch (error) {

            return handleYouTubeError(
                error,
                res,
                "search"
            );
        }
    }
);

// ======================================================
// DISCOVERY CACHE
// ======================================================

function getDiscoveryCache() {

    const cached =
        discoveryCache.get(
            "main"
        );

    if (!cached) {
        return null;
    }

    if (
        Date.now() -
            cached.timestamp >
        DISCOVERY_CACHE_DURATION
    ) {

        discoveryCache.delete(
            "main"
        );

        return null;
    }

    return cached;
}

// ======================================================
// DISCOVERY REQUEST
// ======================================================

async function buildDiscovery() {

    const existing =
        discoveryCache.get(
            "main"
        );

    if (
        existing &&
        Date.now() -
            existing.timestamp <
            DISCOVERY_CACHE_DURATION
    ) {

        return {
            ...existing.data,
            cached: true,
            cacheAge:
                Date.now() -
                existing.timestamp
        };
    }

    const discoveryResults =
        {};

    // --------------------------------------------------
    // Sequential requests intentionally.
    //
    // This avoids firing six YouTube API requests at
    // exactly the same moment.
    // --------------------------------------------------

    for (
        const category
        of DISCOVERY_CATEGORIES
    ) {

        try {

            const result =
                await executeSearch({

                    query:
                        category.query,

                    pageToken:
                        null,

                    regionCode:
                        DEFAULT_REGION,

                    maxResults:
                        DISCOVERY_MAX_RESULTS
                });

            discoveryResults[
                category.id
            ] = {

                ...category,

                results:
                    result.results || []
            };

        } catch (error) {

            console.warn(
                `YouTube discovery failed for ${category.id}:`,
                error.message
            );

            discoveryResults[
                category.id
            ] = {

                ...category,

                results: []
            };
        }
    }

    const data = {

        success: true,

        categories:
            discoveryResults,

        generatedAt:
            new Date().toISOString()
    };

    discoveryCache.set(
        "main",
        {
            timestamp:
                Date.now(),

            data
        }
    );

    return {
        ...data,
        cached: false,
        cacheAge: 0
    };
}

// ======================================================
// DISCOVERY ROUTE
// ======================================================

router.get(
    "/discovery",
    async (req, res) => {

        try {

            // ------------------------------------------
            // Discovery is expensive, so rate-limit it
            // more strictly.
            // ------------------------------------------

            if (
                isRateLimited(req)
            ) {

                return res
                    .status(429)
                    .json({

                        success: false,

                        message:
                            "Too many YouTube requests. Please try again shortly.",

                        code:
                            "YOUTUBE_RATE_LIMITED"
                    });
            }

            const result =
                await buildDiscovery();

            return res.json(
                result
            );

        } catch (error) {

            return handleYouTubeError(
                error,
                res,
                "discovery"
            );
        }
    }
);

// ======================================================
// ERROR HANDLER
// ======================================================

function handleYouTubeError(
    error,
    res,
    operation
) {

    console.error(
        "======================================"
    );

    console.error(
        `YOUTUBE ${String(operation).toUpperCase()} ERROR`
    );

    console.error(
        error.response?.data ||
        error.message
    );

    console.error(
        "======================================"
    );

    const youtubeError =
        error.response?.data?.error;

    // ==============================================
    // QUOTA
    // ==============================================

    const quotaExceeded =
        youtubeError?.errors?.some(
            item =>
                item.reason ===
                "quotaExceeded"
        );

    if (
        quotaExceeded
    ) {

        return res
            .status(503)
            .json({

                success: false,

                message:
                    "YouTube search is temporarily unavailable. Please try again later.",

                code:
                    "YOUTUBE_QUOTA_EXCEEDED"
            });
    }

    // ==============================================
    // INVALID KEY / FORBIDDEN
    // ==============================================

    const configurationError =
        error.code ===
            "YOUTUBE_CONFIGURATION_ERROR" ||
        youtubeError?.errors?.some(
            item =>
                [
                    "keyInvalid",
                    "forbidden"
                ].includes(
                    item.reason
                )
        );

    if (
        configurationError
    ) {

        return res
            .status(503)
            .json({

                success: false,

                message:
                    "YouTube service is currently unavailable.",

                code:
                    "YOUTUBE_CONFIGURATION_ERROR"
            });
    }

    // ==============================================
    // TIMEOUT
    // ==============================================

    if (
        error.code ===
            "ECONNABORTED" ||
        error.code ===
            "ETIMEDOUT"
    ) {

        return res
            .status(504)
            .json({

                success: false,

                message:
                    "YouTube took too long to respond. Please try again.",

                code:
                    "YOUTUBE_TIMEOUT"
            });
    }

    // ==============================================
    // NETWORK ERROR
    // ==============================================

    if (
        !error.response
    ) {

        return res
            .status(502)
            .json({

                success: false,

                message:
                    "Unable to reach YouTube right now.",

                code:
                    "YOUTUBE_NETWORK_ERROR"
            });
    }

    // ==============================================
    // GENERIC
    // ==============================================

    return res
        .status(
            error.response?.status >= 400 &&
            error.response?.status < 600
                ? error.response.status
                : 500
        )
        .json({

            success: false,

            message:
                youtubeError?.message ||
                `Failed to ${operation} YouTube.`,

            code:
                "YOUTUBE_ERROR",

            error:
                process.env.NODE_ENV ===
                "development"
                    ? (
                        youtubeError ||
                        error.message
                    )
                    : undefined
        });
}

// ======================================================
// STATUS
// ======================================================

router.get(
    "/status",
    (req, res) => {

        const discovery =
            getDiscoveryCache();

        res.json({

            success: true,

            service:
                "Cave Tunes YouTube",

            status:
                YOUTUBE_API_KEY
                    ? "operational"
                    : "configuration_error",

            apiConfigured:
                Boolean(
                    YOUTUBE_API_KEY
                ),

            cache: {

                searchEntries:
                    searchCache.size,

                searchMaximum:
                    MAX_CACHE_ENTRIES,

                searchDuration:
                    SEARCH_CACHE_DURATION,

                discoveryCached:
                    Boolean(
                        discovery
                    ),

                discoveryDuration:
                    DISCOVERY_CACHE_DURATION
            },

            activeRequests:
                inFlightRequests.size,

            rateLimit: {

                window:
                    RATE_LIMIT_WINDOW,

                maximum:
                    RATE_LIMIT_MAX_REQUESTS
            },

            timestamp:
                new Date().toISOString()
        });
    }
);

// ======================================================
// PERIODIC CLEANUP
// ======================================================

const cleanupInterval =
    setInterval(
        () => {

            const now =
                Date.now();

            // ------------------------------------------
            // Search cache
            // ------------------------------------------

            for (
                const [
                    key,
                    cached
                ]
                of searchCache.entries()
            ) {

                if (
                    now -
                        cached.timestamp >
                    cached.duration
                ) {

                    searchCache.delete(
                        key
                    );
                }
            }

            // ------------------------------------------
            // Discovery cache
            // ------------------------------------------

            const discovery =
                discoveryCache.get(
                    "main"
                );

            if (
                discovery &&
                now -
                    discovery.timestamp >
                    DISCOVERY_CACHE_DURATION
            ) {

                discoveryCache.delete(
                    "main"
                );
            }

            // ------------------------------------------
            // Rate limits
            // ------------------------------------------

            cleanupRateLimitStore();

        },
        5 * 60 * 1000
    );

cleanupInterval.unref();

// ======================================================
// EXPORT
// ======================================================

module.exports =
    router;