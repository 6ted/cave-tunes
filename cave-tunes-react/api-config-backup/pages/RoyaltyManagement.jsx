// ============================================================
// CAVE TUNES
// ROYALTY MANAGEMENT
//
// COMPLETE REBUILD
//
// Uses:
// GET  /api/royalties/management/own
// GET  /api/royalties/management/featured
//
// Settlement:
// POST /api/royalty-settlements/songs/:songId/settle
// GET  /api/royalty-settlements/songs/:songId/unsettled
// GET  /api/royalty-settlements/songs/:songId
//
// IMPORTANT:
// - Royalty accounting currency is USD.
// - Split percentages come from the backend.
// - Settlement periods are never mixed.
// - No frontend royalty percentages are hard-coded.
// ============================================================

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    AlertCircle,
    BadgeDollarSign,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Download,
    Loader2,
    Music2,
    Play,
    RefreshCw,
    TrendingUp,
    Users,
    Wallet,
    LockKeyhole,
    CircleDollarSign
} from "lucide-react";

import "../styles/RoyaltyManagement.css";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:5000"
            : `http://${window.location.hostname}:5000`
    );

const OWN_ENDPOINT =
    "/api/royalties/management/own";

const FEATURED_ENDPOINT =
    "/api/royalties/management/featured";

const SETTLEMENT_BASE =
    "/api/royalty-settlements";

const DEFAULT_CURRENCY =
    "USD";


// ============================================================
// AUTH
// ============================================================

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken") ||
        ""
    );
}


function getAuthHeaders() {
    const token =
        getToken();

    return {
        Accept:
            "application/json",

        ...(token
            ? {
                Authorization:
                    `Bearer ${token}`
            }
            : {})
    };
}


// ============================================================
// GENERAL HELPERS
// ============================================================

function firstDefined(...values) {
    return values.find(
        value =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}


function numberValue(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


function formatNumber(value) {
    return new Intl.NumberFormat(
        "en-US"
    ).format(
        numberValue(value)
    );
}


function formatCurrency(
    value,
    currency = DEFAULT_CURRENCY
) {
    const safeCurrency =
        typeof currency === "string" &&
        currency.length === 3
            ? currency.toUpperCase()
            : DEFAULT_CURRENCY;

    try {
        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: safeCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            }
        ).format(
            numberValue(value)
        );
    } catch {
        return `${safeCurrency} ${numberValue(value).toFixed(6)}`;
    }
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function normalizeUrl(url) {
    if (
        !url ||
        typeof url !== "string"
    ) {
        return "";
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:")
    ) {
        return url;
    }

    if (url.startsWith("/")) {
        return `${API_BASE_URL}${url}`;
    }

    return `${API_BASE_URL}/${url}`;
}


// ============================================================
// SONG HELPERS
// ============================================================

function getSongId(song) {
    return firstDefined(
        song?.id,
        song?.songId,
        song?.song_id
    );
}


function getSongTitle(song) {
    return firstDefined(
        song?.title,
        song?.songTitle,
        song?.song_title,
        "Untitled"
    );
}


function getArtistName(song) {
    return firstDefined(
        song?.artistName,
        song?.artist_name,
        song?.artist,
        "Unknown Artist"
    );
}


function getCover(song) {
    return firstDefined(
        song?.coverUrl,
        song?.cover_url,
        song?.cover,
        song?.artworkUrl,
        song?.artwork_url,
        ""
    );
}


function getPlays(song) {
    return numberValue(
        firstDefined(
            song?.plays,
            song?.streams,
            0
        )
    );
}


function getDownloads(song) {
    return numberValue(
        firstDefined(
            song?.downloads,
            song?.downloadCount,
            0
        )
    );
}


function getGeneration(song) {
    return (
        song?.generation &&
        typeof song.generation === "object"
            ? song.generation
            : {}
    );
}


function getSplits(song) {
    if (
        Array.isArray(
            song?.royalty?.splits
        )
    ) {
        return song.royalty.splits;
    }

    if (
        Array.isArray(
            song?.splits
        )
    ) {
        return song.splits;
    }

    return [];
}


function getRoyaltyVersion(song) {
    return firstDefined(
        song?.royalty?.version,
        song?.royalty?.royaltyVersion,
        song?.royaltyVersion,
        song?.splitVersion
    );
}


function getRoyaltyLocked(song) {
    return Boolean(
        firstDefined(
            song?.royalty?.locked,
            song?.royaltyLocked,
            false
        )
    );
}


function getRevenue(song) {
    if (
        song?.revenue &&
        typeof song.revenue === "object"
    ) {
        return numberValue(
            firstDefined(
                song.revenue.total,
                song.revenue.totalRevenue,
                song.revenue.grossRevenue,
                0
            )
        );
    }

    return numberValue(
        song?.revenue
    );
}


function getStreamingRevenue(song) {
    return numberValue(
        firstDefined(
            song?.revenue?.streaming,
            song?.revenue?.streamingRevenue,
            0
        )
    );
}


function getDownloadRevenue(song) {
    return numberValue(
        firstDefined(
            song?.revenue?.downloads,
            song?.revenue?.downloadRevenue,
            0
        )
    );
}


function isMonetized(song) {
    const generation =
        getGeneration(song);

    if (
        generation.monetized !==
        undefined
    ) {
        return Boolean(
            generation.monetized
        );
    }

    return Boolean(
        firstDefined(
            song?.monetization_enabled,
            song?.monetizationEnabled,
            true
        )
    );
}


function isStreamingEnabled(song) {
    const generation =
        getGeneration(song);

    return Boolean(
        firstDefined(
            generation.streamingEnabled,
            song?.streaming_royalties,
            song?.streamingRoyalties,
            false
        )
    );
}


function isDownloadsEnabled(song) {
    const generation =
        getGeneration(song);

    return Boolean(
        firstDefined(
            generation.downloadsEnabled,
            song?.download_sales,
            song?.downloadSales,
            false
        )
    );
}


function getParticipantName(split) {
    return firstDefined(
        split?.participantName,
        split?.participant_name,
        split?.name,
        "Unknown"
    );
}


function getParticipantRole(split) {
    return firstDefined(
        split?.role,
        "Contributor"
    );
}


function getUserIdFromSplit(split) {
    return firstDefined(
        split?.userId,
        split?.user_id
    );
}


function getOwnerId(song) {
    return firstDefined(
        song?.ownerId,
        song?.owner_id,
        song?.userId,
        song?.user_id
    );
}


function getOwnEarnings(song) {
    const splits =
        getSplits(song);

    const ownerId =
        getOwnerId(song);

    const direct =
        firstDefined(
            song?.estimatedEarnings,
            song?.earnings,
            song?.yourEarnings,
            song?.royalty?.estimatedEarnings
        );

    if (
        direct !== undefined &&
        direct !== null &&
        direct !== ""
    ) {
        return numberValue(
            direct
        );
    }

    if (
        ownerId === undefined ||
        ownerId === null
    ) {
        return 0;
    }

    const ownerSplit =
        splits.find(
            split =>
                numberValue(
                    getUserIdFromSplit(split)
                ) ===
                numberValue(ownerId)
        );

    return numberValue(
        firstDefined(
            ownerSplit?.estimatedEarnings,
            ownerSplit?.earnings,
            0
        )
    );
}


function getFeaturedData(song) {
    return (
        song?.featured &&
        typeof song.featured === "object"
            ? song.featured
            : {}
    );
}


function getFeaturedPercentage(song) {
    return numberValue(
        firstDefined(
            getFeaturedData(song)
                ?.percentage,
            0
        )
    );
}


function getFeaturedEarnings(song) {
    return numberValue(
        firstDefined(
            getFeaturedData(song)
                ?.estimatedEarnings,
            getFeaturedData(song)
                ?.earnings,
            0
        )
    );
}


// ============================================================
// API REQUEST
// ============================================================

async function request(
    endpoint,
    options = {}
) {
    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method:
                    options.method || "GET",

                headers: {
                    ...getAuthHeaders(),

                    ...(options.body
                        ? {
                            "Content-Type":
                                "application/json"
                        }
                        : {})
                },

                body:
                    options.body
                        ? JSON.stringify(
                            options.body
                        )
                        : undefined,

                signal:
                    options.signal
            }
        );

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    let data = null;

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        try {
            data =
                await response.json();
        } catch {
            data = null;
        }
    } else {
        const text =
            await response.text();

        if (text) {
            try {
                data =
                    JSON.parse(text);
            } catch {
                data = {
                    message:
                        text
                };
            }
        }
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            (
                response.status === 401
                    ? "Your session has expired. Please log in again."
                    : response.status === 403
                        ? "You do not have permission to manage royalties."
                        : `Royalty request failed (${response.status}).`
            )
        );
    }

    return data;
}


// ============================================================
// NORMALIZE MANAGEMENT RESPONSE
// ============================================================

function normalizeManagementResponse(
    response
) {
    if (Array.isArray(response)) {
        return {
            songs:
                response,

            summary:
                null,

            estimateRates:
                null,

            currency:
                DEFAULT_CURRENCY
        };
    }

    if (
        !response ||
        typeof response !== "object"
    ) {
        return {
            songs: [],
            summary: null,
            estimateRates: null,
            currency: DEFAULT_CURRENCY
        };
    }

    return {
        songs:
            Array.isArray(
                response.songs
            )
                ? response.songs
                : Array.isArray(
                    response.data?.songs
                )
                    ? response.data.songs
                    : [],

        summary:
            response.summary ||
            response.data?.summary ||
            null,

        estimateRates:
            response.estimateRates ||
            response.data?.estimateRates ||
            null,

        currency:
            response.currency ||
            response.data?.currency ||
            DEFAULT_CURRENCY
    };
}


// ============================================================
// NORMALIZE UNSETTLED DATA
// ============================================================

function normalizeUnsettled(
    response
) {
    const data =
        response?.data ||
        response;

    if (
        !data ||
        typeof data !== "object"
    ) {
        return {
            currentPlays: 0,
            currentDownloads: 0,
            settledPlays: 0,
            settledDownloads: 0,
            newPlays: 0,
            newDownloads: 0,
            estimatedNewRevenue: 0
        };
    }

    return {
        currentPlays:
            numberValue(
                firstDefined(
                    data.currentPlays,
                    data.current_plays,
                    0
                )
            ),

        currentDownloads:
            numberValue(
                firstDefined(
                    data.currentDownloads,
                    data.current_downloads,
                    0
                )
            ),

        settledPlays:
            numberValue(
                firstDefined(
                    data.settledPlays,
                    data.settled_plays,
                    0
                )
            ),

        settledDownloads:
            numberValue(
                firstDefined(
                    data.settledDownloads,
                    data.settled_downloads,
                    0
                )
            ),

        newPlays:
            numberValue(
                firstDefined(
                    data.newPlays,
                    data.new_plays,
                    0
                )
            ),

        newDownloads:
            numberValue(
                firstDefined(
                    data.newDownloads,
                    data.new_downloads,
                    0
                )
            ),

        estimatedNewRevenue:
            numberValue(
                firstDefined(
                    data.estimatedNewRevenue,
                    data.estimated_new_revenue,
                    data.estimatedRevenue,
                    0
                )
            )
    };
}


// ============================================================
// SUMMARY HELPERS
// ============================================================

function buildSummary(
    songs,
    backendSummary,
    activeTab
) {
    if (backendSummary) {
        return {
            totalSongs:
                numberValue(
                    firstDefined(
                        backendSummary.songs,
                        backendSummary.totalSongs,
                        songs.length
                    )
                ),

            streams:
                numberValue(
                    firstDefined(
                        backendSummary.streams,
                        backendSummary.plays,
                        backendSummary.totalStreams,
                        0
                    )
                ),

            downloads:
                numberValue(
                    firstDefined(
                        backendSummary.downloads,
                        backendSummary.totalDownloads,
                        0
                    )
                ),

            revenue:
                numberValue(
                    firstDefined(
                        backendSummary.revenue,
                        backendSummary.totalRevenue,
                        0
                    )
                ),

            estimatedEarnings:
                numberValue(
                    firstDefined(
                        backendSummary.estimatedEarnings,
                        backendSummary.earnings,
                        backendSummary.totalEarnings,
                        0
                    )
                )
        };
    }

    return songs.reduce(
        (
            result,
            song
        ) => {
            result.totalSongs += 1;

            result.streams +=
                getPlays(song);

            result.downloads +=
                getDownloads(song);

            result.revenue +=
                getRevenue(song);

            result.estimatedEarnings +=
                activeTab === "featured"
                    ? getFeaturedEarnings(song)
                    : getOwnEarnings(song);

            return result;
        },
        {
            totalSongs: 0,
            streams: 0,
            downloads: 0,
            revenue: 0,
            estimatedEarnings: 0
        }
    );
}


// ============================================================
// COMPONENT
// ============================================================

function RoyaltyManagement() {

    const [
        activeTab,
        setActiveTab
    ] = useState("own");

    const [
        ownSongs,
        setOwnSongs
    ] = useState([]);

    const [
        featuredSongs,
        setFeaturedSongs
    ] = useState([]);

    const [
        ownSummary,
        setOwnSummary
    ] = useState(null);

    const [
        featuredSummary,
        setFeaturedSummary
    ] = useState(null);

    const [
        estimateRates,
        setEstimateRates
    ] = useState(null);

    const [
        currency,
        setCurrency
    ] = useState(DEFAULT_CURRENCY);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        refreshing,
        setRefreshing
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        expandedSongs,
        setExpandedSongs
    ] = useState({});

    const [
        unsettledBySong,
        setUnsettledBySong
    ] = useState({});

    const [
        settlementHistory,
        setSettlementHistory
    ] = useState({});

    const [
        settlingSongs,
        setSettlingSongs
    ] = useState({});

    const [
        settlementMessages,
        setSettlementMessages
    ] = useState({});


    // ========================================================
    // LOAD MANAGEMENT DATA
    //
    // IMPORTANT:
    // We intentionally perform the async requests directly
    // inside the effect.
    //
    // This avoids the react-hooks/set-state-in-effect warning
    // caused by calling a state-updating helper synchronously
    // from the effect body.
    // ========================================================

    useEffect(() => {

        const controller =
            new AbortController();

        let active = true;

        Promise.allSettled([
            request(
                OWN_ENDPOINT,
                {
                    signal:
                        controller.signal
                }
            ).then(
                normalizeManagementResponse
            ),

            request(
                FEATURED_ENDPOINT,
                {
                    signal:
                        controller.signal
                }
            ).then(
                normalizeManagementResponse
            )
        ]).then(results => {

            if (
                !active ||
                controller.signal.aborted
            ) {
                return;
            }

            const ownResult =
                results[0];

            const featuredResult =
                results[1];

            let successful =
                false;

            let firstError =
                "";

            if (
                ownResult.status ===
                "fulfilled"
            ) {
                successful = true;

                setOwnSongs(
                    ownResult.value.songs
                );

                setOwnSummary(
                    ownResult.value.summary
                );

                if (
                    ownResult.value
                        .estimateRates
                ) {
                    setEstimateRates(
                        ownResult.value
                            .estimateRates
                    );
                }

                if (
                    ownResult.value.currency
                ) {
                    setCurrency(
                        ownResult.value.currency
                    );
                }
            } else if (
                ownResult.reason?.name !==
                "AbortError"
            ) {
                firstError =
                    ownResult.reason?.message ||
                    "Unable to load your royalty songs.";
            }

            if (
                featuredResult.status ===
                "fulfilled"
            ) {
                successful = true;

                setFeaturedSongs(
                    featuredResult.value.songs
                );

                setFeaturedSummary(
                    featuredResult.value.summary
                );

                if (
                    featuredResult.value
                        .estimateRates
                ) {
                    setEstimateRates(
                        featuredResult.value
                            .estimateRates
                    );
                }

                if (
                    featuredResult.value.currency
                ) {
                    setCurrency(
                        featuredResult.value.currency
                    );
                }
            } else if (
                !firstError &&
                featuredResult.reason?.name !==
                "AbortError"
            ) {
                firstError =
                    featuredResult.reason?.message ||
                    "Unable to load featured royalties.";
            }

            if (!successful) {
                setError(
                    firstError ||
                    "Unable to load royalty management."
                );
            } else {
                setError("");
            }

            setLoading(false);
        });

        return () => {
            active = false;
            controller.abort();
        };

    }, []);


    // ========================================================
    // REFRESH MANAGEMENT ONLY
    //
    // Declared before settlement functions so no callback
    // accesses a variable before declaration.
    // ========================================================

    const refreshManagementOnly =
        useCallback(
            async () => {

                const results =
                    await Promise.allSettled([
                        request(
                            OWN_ENDPOINT
                        ).then(
                            normalizeManagementResponse
                        ),

                        request(
                            FEATURED_ENDPOINT
                        ).then(
                            normalizeManagementResponse
                        )
                    ]);

                const ownResult =
                    results[0];

                const featuredResult =
                    results[1];

                let successful =
                    false;

                let firstError =
                    "";

                if (
                    ownResult.status ===
                    "fulfilled"
                ) {
                    successful = true;

                    setOwnSongs(
                        ownResult.value.songs
                    );

                    setOwnSummary(
                        ownResult.value.summary
                    );

                    if (
                        ownResult.value
                            .estimateRates
                    ) {
                        setEstimateRates(
                            ownResult.value
                                .estimateRates
                        );
                    }

                    if (
                        ownResult.value.currency
                    ) {
                        setCurrency(
                            ownResult.value.currency
                        );
                    }
                } else {
                    firstError =
                        ownResult.reason?.message ||
                        "Unable to refresh your royalties.";
                }

                if (
                    featuredResult.status ===
                    "fulfilled"
                ) {
                    successful = true;

                    setFeaturedSongs(
                        featuredResult.value.songs
                    );

                    setFeaturedSummary(
                        featuredResult.value.summary
                    );

                    if (
                        featuredResult.value
                            .estimateRates
                    ) {
                        setEstimateRates(
                            featuredResult.value
                                .estimateRates
                        );
                    }

                    if (
                        featuredResult.value.currency
                    ) {
                        setCurrency(
                            featuredResult.value.currency
                        );
                    }
                } else if (!firstError) {
                    firstError =
                        featuredResult.reason?.message ||
                        "Unable to refresh featured royalties.";
                }

                if (!successful) {
                    throw new Error(
                        firstError ||
                        "Unable to refresh royalty management."
                    );
                }

            },
            []
        );


    // ========================================================
    // REFRESH BUTTON
    // ========================================================

    const refreshRoyalties =
        useCallback(
            async () => {

                if (refreshing) {
                    return;
                }

                setRefreshing(true);
                setError("");

                try {

                    await refreshManagementOnly();

                } catch (refreshError) {

                    if (
                        refreshError?.name !==
                        "AbortError"
                    ) {
                        setError(
                            refreshError?.message ||
                            "Unable to refresh royalty management."
                        );
                    }

                } finally {

                    setRefreshing(false);
                }

            },
            [
                refreshing,
                refreshManagementOnly
            ]
        );


    // ========================================================
    // LOAD UNSETTLED ACTIVITY
    // ========================================================

    const loadUnsettled =
        useCallback(
            async songId => {

                if (
                    songId === undefined ||
                    songId === null
                ) {
                    return null;
                }

                try {

                    const response =
                        await request(
                            `${SETTLEMENT_BASE}/songs/${songId}/unsettled`
                        );

                    const data =
                        normalizeUnsettled(
                            response
                        );

                    setUnsettledBySong(
                        previous => ({
                            ...previous,
                            [songId]:
                                data
                        })
                    );

                    return data;

                } catch {
                    return null;
                }

            },
            []
        );


    // ========================================================
    // LOAD SETTLEMENT HISTORY
    // ========================================================

    const loadSettlementHistory =
        useCallback(
            async songId => {

                if (
                    songId === undefined ||
                    songId === null
                ) {
                    return [];
                }

                try {

                    const response =
                        await request(
                            `${SETTLEMENT_BASE}/songs/${songId}`
                        );

                    const rows =
                        Array.isArray(response)
                            ? response
                            : Array.isArray(
                                response?.data
                            )
                                ? response.data
                                : Array.isArray(
                                    response?.settlements
                                )
                                    ? response.settlements
                                    : [];

                    setSettlementHistory(
                        previous => ({
                            ...previous,
                            [songId]:
                                rows
                        })
                    );

                    return rows;

                } catch {
                    return [];
                }

            },
            []
        );


    // ========================================================
    // SETTLE SONG
    // ========================================================

    const settleSong =
        useCallback(
            async songId => {

                if (
                    songId === undefined ||
                    songId === null
                ) {
                    return;
                }

                if (
                    settlingSongs[songId]
                ) {
                    return;
                }

                setSettlingSongs(
                    previous => ({
                        ...previous,
                        [songId]:
                            true
                    })
                );

                setSettlementMessages(
                    previous => ({
                        ...previous,
                        [songId]:
                            ""
                    })
                );

                try {

                    const response =
                        await request(
                            `${SETTLEMENT_BASE}/songs/${songId}/settle`,
                            {
                                method:
                                    "POST"
                            }
                        );

                    const settled =
                        response?.settled ??
                        response?.data?.settled;

                    if (settled === false) {

                        setSettlementMessages(
                            previous => ({
                                ...previous,
                                [songId]:
                                    response?.reason ||
                                    response?.message ||
                                    "There is no new royalty activity to settle."
                            })
                        );

                    } else {

                        const period =
                            response?.periodNumber ??
                            response?.data?.periodNumber;

                        setSettlementMessages(
                            previous => ({
                                ...previous,
                                [songId]:
                                    period
                                        ? `Settlement Period ${period} completed successfully.`
                                        : "Royalty settlement completed successfully."
                            })
                        );

                    }

                    // ----------------------------------------
                    // Refresh both the settlement information
                    // and management figures.
                    // ----------------------------------------

                    await Promise.all([
                        loadUnsettled(
                            songId
                        ),

                        loadSettlementHistory(
                            songId
                        ),

                        refreshManagementOnly()
                    ]);

                } catch (settlementError) {

                    setSettlementMessages(
                        previous => ({
                            ...previous,
                            [songId]:
                                settlementError?.message ||
                                "Unable to settle this song."
                        })
                    );

                } finally {

                    setSettlingSongs(
                        previous => ({
                            ...previous,
                            [songId]:
                                false
                        })
                    );

                }

            },
            [
                settlingSongs,
                loadUnsettled,
                loadSettlementHistory,
                refreshManagementOnly
            ]
        );


    // ========================================================
    // CURRENT DATA
    // ========================================================

    const songs =
        activeTab === "own"
            ? ownSongs
            : featuredSongs;

    const backendSummary =
        activeTab === "own"
            ? ownSummary
            : featuredSummary;


    // ========================================================
    // SUMMARY
    // ========================================================

    const summary =
        useMemo(
            () =>
                buildSummary(
                    songs,
                    backendSummary,
                    activeTab
                ),
            [
                songs,
                backendSummary,
                activeTab
            ]
        );


    // ========================================================
    // SETTLEMENT TOTALS
    //
    // These are derived from actual settlement records where
    // possible.
    // ========================================================

    const settlementTotals =
        useMemo(
            () => {

                let settled =
                    0;

                let unsettled =
                    0;

                songs.forEach(
                    song => {

                        const songId =
                            getSongId(song);

                        const history =
                            settlementHistory[
                                songId
                            ] || [];

                        history.forEach(
                            row => {

                                const status =
                                    String(
                                        row?.status ||
                                        ""
                                    ).toLowerCase();

                                if (
                                    status ===
                                    "credited"
                                ) {
                                    settled +=
                                        numberValue(
                                            row?.earned_amount
                                        );
                                }
                            }
                        );

                        const pending =
                            unsettledBySong[
                                songId
                            ];

                        if (pending) {
                            unsettled +=
                                numberValue(
                                    pending.estimatedNewRevenue
                                );
                        }

                    }
                );

                return {
                    settled,
                    unsettled
                };

            },
            [
                songs,
                settlementHistory,
                unsettledBySong
            ]
        );


    // ========================================================
    // TOGGLE SONG
    // ========================================================

    const toggleSong =
        useCallback(
            songId => {

                setExpandedSongs(
                    previous => ({
                        ...previous,
                        [songId]:
                            !previous[songId]
                    })
                );

                if (
                    !unsettledBySong[songId]
                ) {
                    void loadUnsettled(
                        songId
                    );
                }

                if (
                    !settlementHistory[songId]
                ) {
                    void loadSettlementHistory(
                        songId
                    );
                }

            },
            [
                unsettledBySong,
                settlementHistory,
                loadUnsettled,
                loadSettlementHistory
            ]
        );


    // ========================================================
    // INITIAL LOADING
    // ========================================================

    if (loading) {
        return (
            <div className="royalty-management">

                <div className="royalty-loading">

                    <Loader2
                        size={36}
                        className="royalty-spinner"
                    />

                    <h2>
                        Loading royalties...
                    </h2>

                    <p>
                        Preparing your royalty dashboard.
                    </p>

                </div>

            </div>
        );
    }


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="royalty-management">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="royalty-header">

                <div>

                    <div className="royalty-title-row">

                        <BadgeDollarSign
                            size={36}
                        />

                        <h1>
                            Royalty Management
                        </h1>

                    </div>

                    <p>
                        Track your music earnings,
                        settlement periods and royalty splits.
                    </p>

                </div>

                <button
                    type="button"
                    className="royalty-refresh"
                    onClick={
                        refreshRoyalties
                    }
                    disabled={
                        refreshing
                    }
                >

                    <RefreshCw
                        size={18}
                        className={
                            refreshing
                                ? "royalty-spinner"
                                : ""
                        }
                    />

                    {refreshing
                        ? "Refreshing..."
                        : "Refresh"}

                </button>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="royalty-error">

                    <AlertCircle
                        size={20}
                    />

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={
                            refreshRoyalties
                        }
                        disabled={
                            refreshing
                        }
                    >
                        Try Again
                    </button>

                </div>
            )}


            {/* ==================================================
                TABS
            ================================================== */}

            <div className="royalty-tabs">

                <button
                    type="button"
                    className={
                        activeTab === "own"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "own"
                        )
                    }
                >

                    <Music2
                        size={18}
                    />

                    <span>
                        Own
                    </span>

                    <span>
                        {ownSongs.length}
                    </span>

                </button>


                <button
                    type="button"
                    className={
                        activeTab === "featured"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "featured"
                        )
                    }
                >

                    <Users
                        size={18}
                    />

                    <span>
                        Featured
                    </span>

                    <span>
                        {featuredSongs.length}
                    </span>

                </button>

            </div>


            {/* ==================================================
                TOP SUMMARY
            ================================================== */}

            <div className="royalty-summary">

                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <Music2
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Monetized Songs
                        </span>

                        <strong>
                            {formatNumber(
                                summary.totalSongs
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <Play
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Streams
                        </span>

                        <strong>
                            {formatNumber(
                                summary.streams
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <Download
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Downloads
                        </span>

                        <strong>
                            {formatNumber(
                                summary.downloads
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card earnings">

                    <div className="royalty-summary-icon">
                        <TrendingUp
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Estimated Revenue
                        </span>

                        <strong>
                            {formatCurrency(
                                summary.revenue,
                                currency
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card lifetime">

                    <div className="royalty-summary-icon">
                        <Wallet
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Your Estimated Earnings
                        </span>

                        <strong>
                            {formatCurrency(
                                summary.estimatedEarnings,
                                currency
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ==================================================
                SETTLEMENT SUMMARY
            ================================================== */}

            <div className="royalty-summary">

                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <CircleDollarSign
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Estimated Total
                        </span>

                        <strong>
                            {formatCurrency(
                                summary.estimatedEarnings,
                                DEFAULT_CURRENCY
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <CheckCircle2
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Already Settled
                        </span>

                        <strong>
                            {formatCurrency(
                                settlementTotals.settled,
                                DEFAULT_CURRENCY
                            )}
                        </strong>

                    </div>

                </div>


                <div className="royalty-summary-card">

                    <div className="royalty-summary-icon">
                        <Clock3
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Unsettled Earnings
                        </span>

                        <strong>
                            {formatCurrency(
                                settlementTotals.unsettled,
                                DEFAULT_CURRENCY
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ==================================================
                RATE INFORMATION
            ================================================== */}

            {estimateRates && (
                <div className="royalty-rate-info">

                    <span>
                        Estimate rates:
                    </span>

                    {estimateRates.streamingPerPlay !==
                        undefined && (
                        <span>
                            Streaming{" "}
                            {formatCurrency(
                                estimateRates.streamingPerPlay,
                                currency
                            )}{" "}
                            / play
                        </span>
                    )}

                    {estimateRates.downloadPerSale !==
                        undefined && (
                        <span>
                            Downloads{" "}
                            {formatCurrency(
                                estimateRates.downloadPerSale,
                                currency
                            )}{" "}
                            / sale
                        </span>
                    )}

                </div>
            )}


            {/* ==================================================
                EMPTY
            ================================================== */}

            {songs.length === 0 ? (

                <div className="royalty-empty">

                    <div className="royalty-empty-icon">
                        <BadgeDollarSign
                            size={38}
                        />
                    </div>

                    <h2>
                        {activeTab === "own"
                            ? "No monetized songs yet"
                            : "No featured royalties yet"}
                    </h2>

                    <p>
                        {activeTab === "own"
                            ? "Songs you own will appear here once monetization is enabled."
                            : "Songs where you participate in a royalty split will appear here."}
                    </p>

                </div>

            ) : (

                <div className="royalty-song-list">

                    {songs.map(
                        (
                            song,
                            index
                        ) => {

                            const songId =
                                getSongId(song) ??
                                `royalty-song-${index}`;

                            const expanded =
                                Boolean(
                                    expandedSongs[
                                        songId
                                    ]
                                );

                            const title =
                                getSongTitle(
                                    song
                                );

                            const artist =
                                getArtistName(
                                    song
                                );

                            const cover =
                                getCover(
                                    song
                                );

                            const plays =
                                getPlays(
                                    song
                                );

                            const downloads =
                                getDownloads(
                                    song
                                );

                            const revenue =
                                getRevenue(
                                    song
                                );

                            const streamingRevenue =
                                getStreamingRevenue(
                                    song
                                );

                            const downloadRevenue =
                                getDownloadRevenue(
                                    song
                                );

                            const monetized =
                                isMonetized(
                                    song
                                );

                            const streamingEnabled =
                                isStreamingEnabled(
                                    song
                                );

                            const downloadsEnabled =
                                isDownloadsEnabled(
                                    song
                                );

                            const splits =
                                getSplits(
                                    song
                                );

                            const royaltyVersion =
                                getRoyaltyVersion(
                                    song
                                );

                            const royaltyLocked =
                                getRoyaltyLocked(
                                    song
                                );

                            const featured =
                                getFeaturedData(
                                    song
                                );

                            const featuredPercentage =
                                getFeaturedPercentage(
                                    song
                                );

                            const featuredEarnings =
                                getFeaturedEarnings(
                                    song
                                );

                            const ownEarnings =
                                getOwnEarnings(
                                    song
                                );

                            const userEarnings =
                                activeTab === "featured"
                                    ? featuredEarnings
                                    : ownEarnings;

                            const generation =
                                getGeneration(
                                    song
                                );

                            const monetizationDate =
                                firstDefined(
                                    generation.monetizationEnabledAt,
                                    song?.monetizationEnabledAt,
                                    song?.monetization_enabled_at,
                                    song?.createdAt,
                                    song?.created_at
                                );

                            const albumName =
                                firstDefined(
                                    song?.albumName,
                                    song?.album_name,
                                    song?.album?.name,
                                    ""
                                );

                            const unsettled =
                                unsettledBySong[
                                    songId
                                ];

                            const history =
                                settlementHistory[
                                    songId
                                ] || [];

                            const isSettling =
                                Boolean(
                                    settlingSongs[
                                        songId
                                    ]
                                );

                            const settlementMessage =
                                settlementMessages[
                                    songId
                                ] || "";

                            return (
                                <div
                                    className="royalty-song-card"
                                    key={
                                        songId
                                    }
                                >

                                    {/* ==========================================
                                        SONG HEADER
                                    ========================================== */}

                                    <div className="royalty-song-main">

                                        <div className="royalty-cover">

                                            {cover ? (

                                                <img
                                                    src={normalizeUrl(
                                                        cover
                                                    )}
                                                    alt={
                                                        title
                                                    }
                                                    loading="lazy"
                                                    onError={
                                                        event => {
                                                            event.currentTarget.style.display =
                                                                "none";
                                                        }
                                                    }
                                                />

                                            ) : (

                                                <Music2
                                                    size={30}
                                                />

                                            )}

                                        </div>


                                        <div className="royalty-song-info">

                                            <div className="royalty-song-title-row">

                                                <h2>
                                                    {title}
                                                </h2>

                                                {monetized && (
                                                    <span className="monetized-badge">

                                                        <BadgeDollarSign
                                                            size={14}
                                                        />

                                                        Monetized

                                                    </span>
                                                )}

                                            </div>


                                            <p className="royalty-artist">
                                                {artist}
                                            </p>


                                            {albumName && (
                                                <span className="royalty-album">
                                                    {albumName}
                                                </span>
                                            )}


                                            <div className="royalty-song-meta">

                                                <span>
                                                    Since{" "}
                                                    {formatDate(
                                                        monetizationDate
                                                    )}
                                                </span>

                                                {streamingEnabled && (
                                                    <span className="royalty-feature">
                                                        Streaming
                                                    </span>
                                                )}

                                                {downloadsEnabled && (
                                                    <span className="royalty-feature">
                                                        Downloads
                                                    </span>
                                                )}

                                                {royaltyLocked && (
                                                    <span className="royalty-feature">
                                                        <LockKeyhole
                                                            size={13}
                                                        />
                                                        Split Locked
                                                    </span>
                                                )}

                                            </div>

                                        </div>


                                        <button
                                            type="button"
                                            className="royalty-expand"
                                            onClick={() =>
                                                toggleSong(
                                                    songId
                                                )
                                            }
                                            aria-expanded={
                                                expanded
                                            }
                                            aria-label={
                                                expanded
                                                    ? "Collapse song"
                                                    : "Expand song"
                                            }
                                        >

                                            {expanded ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )}

                                        </button>

                                    </div>


                                    {/* ==========================================
                                        PERFORMANCE
                                    ========================================== */}

                                    <div className="royalty-performance">

                                        <div>

                                            <span>
                                                <Play
                                                    size={15}
                                                />
                                                Streaming
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    plays
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                <Download
                                                    size={15}
                                                />
                                                Downloads
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    downloads
                                                )}
                                            </strong>

                                        </div>


                                        {activeTab ===
                                            "featured" && (
                                            <div className="your-share">

                                                <span>
                                                    Your Share
                                                </span>

                                                <strong>
                                                    {featuredPercentage}%
                                                </strong>

                                            </div>
                                        )}


                                        <div className="estimated">

                                            <span>
                                                Estimated Revenue
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    revenue,
                                                    currency
                                                )}
                                            </strong>

                                        </div>


                                        <div className="lifetime">

                                            <span>
                                                Your Estimated Earnings
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    userEarnings,
                                                    currency
                                                )}
                                            </strong>

                                        </div>

                                    </div>


                                    {/* ==========================================
                                        EXPANDED CONTENT
                                    ========================================== */}

                                    {expanded && (

                                        <div className="royalty-song-details">

                                            {/* ==================================
                                                SETTLEMENT
                                            ================================== */}

                                            <div className="royalty-settlement-panel">

                                                <div className="royalty-split-heading">

                                                    <div>

                                                        <h3>
                                                            Royalty Settlement
                                                        </h3>

                                                        <p>
                                                            Settlement periods keep
                                                            previously credited
                                                            earnings permanently
                                                            separated from new activity.
                                                        </p>

                                                    </div>

                                                    {royaltyVersion && (
                                                        <span>
                                                            Version{" "}
                                                            {
                                                                royaltyVersion
                                                            }
                                                        </span>
                                                    )}

                                                </div>


                                                <div className="royalty-settlement-grid">

                                                    <div>

                                                        <span>
                                                            Total Estimated
                                                        </span>

                                                        <strong>
                                                            {formatCurrency(
                                                                userEarnings,
                                                                DEFAULT_CURRENCY
                                                            )}
                                                        </strong>

                                                    </div>


                                                    <div>

                                                        <span>
                                                            Already Settled
                                                        </span>

                                                        <strong>
                                                            {formatCurrency(
                                                                history
                                                                    .filter(
                                                                        row =>
                                                                            String(
                                                                                row?.status ||
                                                                                ""
                                                                            ).toLowerCase() ===
                                                                            "credited"
                                                                    )
                                                                    .reduce(
                                                                        (
                                                                            total,
                                                                            row
                                                                        ) =>
                                                                            total +
                                                                            numberValue(
                                                                                row?.earned_amount
                                                                            ),
                                                                        0
                                                                    ),
                                                                DEFAULT_CURRENCY
                                                            )}
                                                        </strong>

                                                    </div>


                                                    <div>

                                                        <span>
                                                            Unsettled
                                                        </span>

                                                        <strong>
                                                            {formatCurrency(
                                                                unsettled?.estimatedNewRevenue ||
                                                                0,
                                                                DEFAULT_CURRENCY
                                                            )}
                                                        </strong>

                                                    </div>


                                                    <div>

                                                        <span>
                                                            New Plays
                                                        </span>

                                                        <strong>
                                                            {formatNumber(
                                                                unsettled?.newPlays ||
                                                                0
                                                            )}
                                                        </strong>

                                                    </div>


                                                    <div>

                                                        <span>
                                                            New Downloads
                                                        </span>

                                                        <strong>
                                                            {formatNumber(
                                                                unsettled?.newDownloads ||
                                                                0
                                                            )}
                                                        </strong>

                                                    </div>

                                                </div>


                                                <div className="royalty-settlement-action">

                                                    <button
                                                        type="button"
                                                        className="royalty-settle-button"
                                                        onClick={() =>
                                                            settleSong(
                                                                songId
                                                            )
                                                        }
                                                        disabled={
                                                            isSettling ||
                                                            (
                                                                unsettled &&
                                                                unsettled.newPlays === 0 &&
                                                                unsettled.newDownloads === 0
                                                            )
                                                        }
                                                    >

                                                        {isSettling ? (
                                                            <>
                                                                <Loader2
                                                                    size={17}
                                                                    className="royalty-spinner"
                                                                />

                                                                Settling...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Wallet
                                                                    size={17}
                                                                />

                                                                Settle New Earnings
                                                            </>
                                                        )}

                                                    </button>


                                                    {settlementMessage && (
                                                        <div className="royalty-settlement-message">

                                                            <CheckCircle2
                                                                size={16}
                                                            />

                                                            <span>
                                                                {
                                                                    settlementMessage
                                                                }
                                                            </span>

                                                        </div>
                                                    )}

                                                </div>

                                            </div>


                                            {/* ==================================
                                                SPLITS
                                            ================================== */}

                                            <div className="royalty-split-section">

                                                <div className="royalty-split-heading">

                                                    <div>

                                                        <h3>
                                                            Royalty Split
                                                        </h3>

                                                        <p>
                                                            Current distribution
                                                            of royalty income.
                                                        </p>

                                                    </div>

                                                    {royaltyVersion && (
                                                        <span>
                                                            Version{" "}
                                                            {
                                                                royaltyVersion
                                                            }
                                                        </span>
                                                    )}

                                                </div>


                                                {royaltyLocked && (
                                                    <div className="royalty-locked">

                                                        <LockKeyhole
                                                            size={16}
                                                        />

                                                        Royalty split locked

                                                    </div>
                                                )}


                                                {splits.length === 0 ? (

                                                    <div className="no-split">

                                                        No royalty split
                                                        information available.

                                                    </div>

                                                ) : (

                                                    <div className="royalty-split-list">

                                                        {splits.map(
                                                            (
                                                                split,
                                                                splitIndex
                                                            ) => {

                                                                const percentage =
                                                                    numberValue(
                                                                        split?.percentage
                                                                    );

                                                                const participantName =
                                                                    getParticipantName(
                                                                        split
                                                                    );

                                                                const splitUserId =
                                                                    getUserIdFromSplit(
                                                                        split
                                                                    );

                                                                const featuredUserId =
                                                                    firstDefined(
                                                                        featured?.userId,
                                                                        featured?.user_id
                                                                    );

                                                                const isCurrentUser =
                                                                    activeTab ===
                                                                        "featured" &&
                                                                    featuredUserId !==
                                                                        undefined &&
                                                                    numberValue(
                                                                        splitUserId
                                                                    ) ===
                                                                        numberValue(
                                                                            featuredUserId
                                                                        );

                                                                return (
                                                                    <div
                                                                        className={
                                                                            "royalty-split-row" +
                                                                            (
                                                                                isCurrentUser
                                                                                    ? " current-user"
                                                                                    : ""
                                                                            )
                                                                        }
                                                                        key={
                                                                            split?.id ??
                                                                            `${songId}-split-${splitIndex}`
                                                                        }
                                                                    >

                                                                        <div className="split-person">

                                                                            <div className="split-avatar">

                                                                                {participantName
                                                                                    .charAt(
                                                                                        0
                                                                                    )
                                                                                    .toUpperCase()}

                                                                            </div>

                                                                            <div>

                                                                                <strong>
                                                                                    {
                                                                                        participantName
                                                                                    }
                                                                                </strong>

                                                                                <span>
                                                                                    {
                                                                                        getParticipantRole(
                                                                                            split
                                                                                        )
                                                                                    }
                                                                                </span>

                                                                            </div>

                                                                        </div>


                                                                        <div className="split-bar">

                                                                            <div
                                                                                style={{
                                                                                    width:
                                                                                        `${Math.min(
                                                                                            Math.max(
                                                                                                percentage,
                                                                                                0
                                                                                            ),
                                                                                            100
                                                                                        )}%`
                                                                                }}
                                                                            />

                                                                        </div>


                                                                        <strong className="split-percentage">

                                                                            {
                                                                                percentage
                                                                            }%

                                                                        </strong>

                                                                    </div>
                                                                );
                                                            }
                                                        )}

                                                    </div>
                                                )}

                                            </div>


                                            {/* ==================================
                                                REVENUE SOURCES
                                            ================================== */}

                                            <div className="royalty-sources">

                                                <h3>
                                                    Revenue Sources
                                                </h3>

                                                <div className="source-grid">

                                                    <div
                                                        className={
                                                            streamingEnabled
                                                                ? "source active"
                                                                : "source"
                                                        }
                                                    >

                                                        <Play
                                                            size={18}
                                                        />

                                                        <div>

                                                            <strong>
                                                                Streaming Royalties
                                                            </strong>

                                                            <span>
                                                                {streamingEnabled
                                                                    ? "Enabled"
                                                                    : "Disabled"}
                                                            </span>

                                                        </div>

                                                    </div>


                                                    <div
                                                        className={
                                                            downloadsEnabled
                                                                ? "source active"
                                                                : "source"
                                                        }
                                                    >

                                                        <Download
                                                            size={18}
                                                        />

                                                        <div>

                                                            <strong>
                                                                Download Sales
                                                            </strong>

                                                            <span>
                                                                {downloadsEnabled
                                                                    ? "Enabled"
                                                                    : "Disabled"}
                                                            </span>

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>


                                            {/* ==================================
                                                REVENUE
                                            ================================== */}

                                            <div className="royalty-estimate">

                                                <div>

                                                    <span>
                                                        Streaming Revenue
                                                    </span>

                                                    <strong>
                                                        {formatCurrency(
                                                            streamingRevenue,
                                                            currency
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Download Revenue
                                                    </span>

                                                    <strong>
                                                        {formatCurrency(
                                                            downloadRevenue,
                                                            currency
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Total Revenue
                                                    </span>

                                                    <strong>
                                                        {formatCurrency(
                                                            revenue,
                                                            currency
                                                        )}
                                                    </strong>

                                                </div>


                                                <div>

                                                    <span>
                                                        Your Earnings
                                                    </span>

                                                    <strong>
                                                        {formatCurrency(
                                                            userEarnings,
                                                            currency
                                                        )}
                                                    </strong>

                                                </div>

                                            </div>


                                            {/* ==================================
                                                SETTLEMENT HISTORY
                                            ================================== */}

                                            <div className="royalty-split-section">

                                                <div className="royalty-split-heading">

                                                    <div>

                                                        <h3>
                                                            Settlement History
                                                        </h3>

                                                        <p>
                                                            Every settlement period
                                                            remains permanently separated.
                                                        </p>

                                                    </div>

                                                    <span>
                                                        {
                                                            history.length
                                                        }{" "}
                                                        periods
                                                    </span>

                                                </div>


                                                {history.length === 0 ? (

                                                    <div className="no-split">

                                                        No settlement periods yet.

                                                    </div>

                                                ) : (

                                                    <div className="royalty-settlement-history">

                                                        {history.map(
                                                            (
                                                                row,
                                                                historyIndex
                                                            ) => {

                                                                const status =
                                                                    String(
                                                                        row?.status ||
                                                                        "calculated"
                                                                    ).toLowerCase();

                                                                return (
                                                                    <div
                                                                        className="royalty-settlement-row"
                                                                        key={
                                                                            row?.id ??
                                                                            `${songId}-history-${historyIndex}`
                                                                        }
                                                                    >

                                                                        <div>

                                                                            <span>
                                                                                Period
                                                                            </span>

                                                                            <strong>
                                                                                {row?.period_number ??
                                                                                    "—"}
                                                                            </strong>

                                                                        </div>


                                                                        <div>

                                                                            <span>
                                                                                Plays
                                                                            </span>

                                                                            <strong>
                                                                                {formatNumber(
                                                                                    row?.royalty_plays
                                                                                )}
                                                                            </strong>

                                                                        </div>


                                                                        <div>

                                                                            <span>
                                                                                Downloads
                                                                            </span>

                                                                            <strong>
                                                                                {formatNumber(
                                                                                    row?.royalty_downloads
                                                                                )}
                                                                            </strong>

                                                                        </div>


                                                                        <div>

                                                                            <span>
                                                                                Your Earnings
                                                                            </span>

                                                                            <strong>
                                                                                {formatCurrency(
                                                                                    row?.earned_amount,
                                                                                    DEFAULT_CURRENCY
                                                                                )}
                                                                            </strong>

                                                                        </div>


                                                                        <div>

                                                                            <span>
                                                                                Status
                                                                            </span>

                                                                            <strong
                                                                                className={
                                                                                    `settlement-status ${status}`
                                                                                }
                                                                            >
                                                                                {status}
                                                                            </strong>

                                                                        </div>


                                                                        <div>

                                                                            <span>
                                                                                Date
                                                                            </span>

                                                                            <strong>
                                                                                {formatDate(
                                                                                    row?.created_at
                                                                                )}
                                                                            </strong>

                                                                        </div>

                                                                    </div>
                                                                );
                                                            }
                                                        )}

                                                    </div>

                                                )}

                                            </div>

                                        </div>
                                    )}

                                </div>
                            );
                        }
                    )}

                </div>
            )}

        </div>
    );
}


export default RoyaltyManagement;