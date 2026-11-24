import {
    Search,
    Play,
    ExternalLink,
    X,
    Loader2,
    Music2,
    ChevronRight,
    Flame,
    Globe2,
    Mic2,
    Radio,
    Sparkles,
    RefreshCw,
    Music,
} from "lucide-react";

import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import { PlayerContext } from "../context/PlayerContext";

import {
    useYouTubePlayer,
} from "../context/YouTubePlayerContext";

import "./YouTube.css";


// ======================================================
// CAVE TUNES YOUTUBE / DISCOVER
// ======================================================
//
// FEATURES:
//
// 1. YouTube discovery
// 2. YouTube search
// 3. Live search suggestions
// 4. Search caching
// 5. Discovery caching
// 6. GLOBAL YOUTUBE PLAYER INTEGRATION
// 7. Cave Tunes global music player integration
//
// IMPORTANT:
//
// The floating YouTube player is no longer managed here.
//
// GlobalYouTubePlayer handles:
// - Floating player
// - Dragging
// - Minimizing
// - Restoring
// - Closing
// - Sizaro
//
// ======================================================


// ======================================================
// API BASE URL
// ======================================================

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:5000"
            : "https://cave-tunes-api.onrender.com"
    );


// ======================================================
// CACHE
// ======================================================

const DISCOVERY_CACHE_KEY =
    "caveTunes.youtube.discovery.v3";

const SEARCH_CACHE_PREFIX =
    "caveTunes.youtube.search.v3:";

const DISCOVERY_CACHE_DURATION =
    12 * 60 * 60 * 1000;

const SEARCH_CACHE_DURATION =
    30 * 60 * 1000;


// ======================================================
// SEARCH SETTINGS
// ======================================================

const LIVE_SEARCH_DELAY = 700;

const MIN_SEARCH_LENGTH = 3;

const LIVE_SEARCH_COOLDOWN = 2500;

const MAX_RESULTS = 12;

const SUGGESTION_RESULTS = 6;

const DISCOVERY_RESULTS = 8;


// ======================================================
// DISCOVERY CATEGORIES
// ======================================================

const DISCOVERY_CATEGORIES = [
    {
        id: "african",
        title: "African Music",
        subtitle: "Fresh sounds from across Africa",
        icon: Globe2,
        query: "African music 2026",
    },

    {
        id: "malawi",
        title: "Malawi Music",
        subtitle: "Discover music from Malawi",
        icon: Music2,
        query: "Malawi music 2026",
    },

    {
        id: "afrobeats",
        title: "Afrobeats",
        subtitle: "The sounds moving Africa",
        icon: Flame,
        query: "Afrobeats 2026",
    },

    {
        id: "amapiano",
        title: "Amapiano",
        subtitle: "South Africa's signature sound",
        icon: Radio,
        query: "Amapiano 2026",
    },

    {
        id: "rnb",
        title: "African R&B",
        subtitle: "Smooth sounds and soulful music",
        icon: Mic2,
        query: "African R&B music 2026",
    },

    {
        id: "gospel",
        title: "Gospel",
        subtitle: "Music of faith and inspiration",
        icon: Music2,
        query: "African gospel music 2026",
    },
];


// ======================================================
// QUICK SEARCHES
// ======================================================

const QUICK_SEARCHES = [
    "Afrobeats",
    "Amapiano",
    "Malawi Music",
    "Hip Hop",
    "R&B",
    "Gospel",
];


// ======================================================
// CACHE HELPERS
// ======================================================

function isFresh(timestamp, duration) {
    if (!timestamp) {
        return false;
    }

    return Date.now() - timestamp < duration;
}


// ======================================================
// DISCOVERY CACHE
// ======================================================

function getDiscoveryCache() {
    try {
        const raw = localStorage.getItem(
            DISCOVERY_CACHE_KEY
        );

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed.timestamp !== "number" ||
            !parsed.results ||
            typeof parsed.results !== "object"
        ) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}


function saveDiscoveryCache(results) {
    try {
        localStorage.setItem(
            DISCOVERY_CACHE_KEY,
            JSON.stringify({
                timestamp: Date.now(),
                results,
            })
        );
    } catch {
        // Ignore localStorage errors.
    }
}


// ======================================================
// SEARCH CACHE
// ======================================================

function getSearchCacheKey(query) {
    return (
        SEARCH_CACHE_PREFIX +
        query.trim().toLowerCase()
    );
}


function getSearchCache(query) {
    try {
        const raw = localStorage.getItem(
            getSearchCacheKey(query)
        );

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed.timestamp !== "number" ||
            !Array.isArray(parsed.results)
        ) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}


function saveSearchCache(
    query,
    results,
    nextPageToken
) {
    try {
        localStorage.setItem(
            getSearchCacheKey(query),
            JSON.stringify({
                timestamp: Date.now(),
                results,
                nextPageToken:
                    nextPageToken || null,
            })
        );
    } catch {
        // Ignore localStorage errors.
    }
}


// ======================================================
// TEXT HELPERS
// ======================================================

function cleanTitle(title) {
    if (!title) {
        return "";
    }

    return String(title)
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}


// ======================================================
// THUMBNAIL
// ======================================================

function getThumbnail(video) {
    return (
        video?.thumbnail ||
        video?.thumbnail_url ||
        video?.thumbnails?.high ||
        video?.thumbnails?.medium ||
        video?.thumbnails?.default ||
        ""
    );
}


// ======================================================
// NORMALIZE YOUTUBE VIDEO
// ======================================================

function normalizeNavbarVideo(video, videoId) {
    if (!videoId && !video?.videoId) {
        return null;
    }

    const id =
        video?.videoId ||
        videoId;

    if (!id) {
        return null;
    }

    const thumbnail = getThumbnail(video);

    return {
        ...(video || {}),

        videoId: id,

        title:
            video?.title ||
            "YouTube Video",

        channelTitle:
            video?.channelTitle ||
            video?.channel ||
            "YouTube",

        thumbnail,

        youtubeUrl:
            video?.youtubeUrl ||
            video?.url ||
            `https://www.youtube.com/watch?v=${id}`,

        embedUrl:
            video?.embedUrl ||
            `https://www.youtube.com/embed/${id}`,
    };
}


// ======================================================
// NORMALIZE CAVE TUNES SONG
// ======================================================

function normalizeCaveTunesSong(song) {
    if (!song) {
        return null;
    }

    const id =
        song.id ??
        song.song_id ??
        song.songId;

    if (id == null) {
        return null;
    }

    return {
        ...song,

        id,

        title:
            song.title ||
            song.song_title ||
            "Untitled Song",

        artist:
            song.artist ||
            song.artist_name ||
            song.artistName ||
            "Unknown Artist",

        album:
            song.album ||
            song.album_name ||
            song.albumName ||
            "",

        cover:
            song.cover ||
            song.cover_url ||
            song.cover_image_url ||
            song.cover_file_url ||
            song.coverImage ||
            "",

        audioUrl:
            song.audioUrl ||
            song.audio_url ||
            song.audio_file_url ||
            song.audioFileUrl ||
            "",
    };
}


// ======================================================
// MAIN COMPONENT
// ======================================================

function YouTube() {
    const location = useLocation();

    const navigate = useNavigate();


    // ==================================================
    // GLOBAL YOUTUBE PLAYER
    // ==================================================

    const {
        openYouTubeVideo,
        selectedVideo,
        closeYouTubePlayer,
    } = useYouTubePlayer();


    // ==================================================
    // GLOBAL CAVE TUNES MUSIC PLAYER
    // ==================================================

    const player = useContext(PlayerContext);

    const playSong =
        player?.playSong;

    const currentSong =
        player?.currentSong;

    const isPlaying =
        player?.isPlaying;


    // ==================================================
    // NAVIGATION STATE
    // ==================================================

    const navigationState =
        location.state || null;


    // ==================================================
    // CAVE TUNES SONG HANDOFF
    // ==================================================

    const navigationSong =
        navigationState?.song ||
        navigationState?.currentSong ||
        navigationState?.playSong ||
        null;

    const incomingSong =
        normalizeCaveTunesSong(
            navigationSong
        );

    const isSongNavigation =
        navigationState?.source === "song" ||
        navigationState?.source === "cave-tunes-song" ||
        navigationState?.source === "player" ||
        Boolean(incomingSong);

    const consumedSongNavigationRef =
        useRef(null);


    // ==================================================
    // NAVBAR YOUTUBE HANDOFF
    // ==================================================

    const isNavbarYouTubeNavigation =
        navigationState?.source === "youtube";

    const navbarSearch =
        isNavbarYouTubeNavigation
            ? String(
                navigationState?.search ||
                navigationState?.query ||
                ""
            ).trim()
            : "";

    const navbarVideoId =
        isNavbarYouTubeNavigation
            ? navigationState?.videoId ||
              navigationState?.video?.videoId ||
              null
            : null;

    const navbarVideo =
        isNavbarYouTubeNavigation
            ? normalizeNavbarVideo(
                navigationState?.video,
                navbarVideoId
            )
            : null;

    const consumedNavigationRef =
        useRef(null);


    // ==================================================
    // SEARCH STATE
    // ==================================================

    const [query, setQuery] =
        useState("");

    const [results, setResults] =
        useState([]);

    const [suggestions, setSuggestions] =
        useState([]);

    const [searched, setSearched] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [suggestionLoading, setSuggestionLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [showSuggestions, setShowSuggestions] =
        useState(false);

    const [nextPageToken, setNextPageToken] =
        useState(null);


    // ==================================================
    // DISCOVERY
    // ==================================================

    const initialDiscovery = useMemo(
        () => getDiscoveryCache(),
        []
    );

    const [discoveryVideos, setDiscoveryVideos] =
        useState(
            initialDiscovery?.results || {}
        );

    const [discoveryLoading, setDiscoveryLoading] =
        useState(
            !(
                initialDiscovery &&
                isFresh(
                    initialDiscovery.timestamp,
                    DISCOVERY_CACHE_DURATION
                )
            )
        );

    const [discoveryRefreshing, setDiscoveryRefreshing] =
        useState(false);

    const [discoveryError, setDiscoveryError] =
        useState("");


    // ==================================================
    // REFS
    // ==================================================

    const searchInputRef = useRef(null);

    const searchWrapperRef = useRef(null);

    const liveSearchTimer = useRef(null);

    const searchController = useRef(null);

    const discoveryController = useRef(null);

    const lastLiveSearch = useRef(0);

    const discoveryLoadingRef = useRef(false);


    // ==================================================
    // OPEN VIDEO USING GLOBAL PLAYER
    // ==================================================

const openPlayer = useCallback((video) => {
    if (!video?.videoId) {
        return;
    }

    const normalizedVideo =
        normalizeNavbarVideo(
            video,
            video.videoId
        );

    if (!normalizedVideo) {
        return;
    }

    openYouTubeVideo(normalizedVideo);

    setShowSuggestions(false);

}, [
    openYouTubeVideo,
]);


    // ==================================================
    // PLAY INCOMING CAVE TUNES SONG
    // ==================================================

    useEffect(() => {
        if (!isSongNavigation) {
            return undefined;
        }

        if (!incomingSong) {
            return undefined;
        }

        if (typeof playSong !== "function") {
            console.error(
                "Cave Tunes: PlayerContext.playSong is unavailable."
            );

            return undefined;
        }

        const navigationId =
            navigationState?.navigationId ||
            navigationState?.timestamp ||
            `${incomingSong.id}-${incomingSong.title}`;

        if (
            consumedSongNavigationRef.current ===
            navigationId
        ) {
            return undefined;
        }

        consumedSongNavigationRef.current =
            navigationId;

        let cancelled = false;

        const timer = setTimeout(async () => {
            if (cancelled) {
                return;
            }

            try {
                await playSong(incomingSong);

                console.log(
                    "Cave Tunes: Automatically playing navigated song:",
                    incomingSong
                );
            } catch (error) {
                console.error(
                    "Cave Tunes: Unable to automatically play song:",
                    error
                );
            }

            if (!cancelled) {
                navigate(
                    location.pathname,
                    {
                        replace: true,
                        state: {},
                    }
                );
            }
        }, 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        isSongNavigation,
        incomingSong,
        playSong,
        navigationState,
        navigate,
        location.pathname,
    ]);


    // ==================================================
    // BACKUP:
    // IF THE SONG WAS ALREADY PLAYING BEFORE NAVIGATION
    // ==================================================

    useEffect(() => {
        if (!incomingSong) {
            return;
        }

        if (!currentSong?.id) {
            return;
        }

        if (
            Number(currentSong.id) !==
            Number(incomingSong.id)
        ) {
            return;
        }

        console.log(
            "Cave Tunes: Requested song is already active.",
            {
                songId: currentSong.id,
                isPlaying,
            }
        );
    }, [
        incomingSong,
        currentSong,
        isPlaying,
    ]);


    // ==================================================
    // BACKEND YOUTUBE REQUEST
    // ==================================================

    const requestYouTube = useCallback(
        async (
            searchQuery,
            {
                maxResults = MAX_RESULTS,
                pageToken = null,
                signal,
            } = {}
        ) => {
            const value =
                String(searchQuery || "").trim();

            if (!value) {
                return null;
            }

            const params =
                new URLSearchParams();

            params.set("q", value);

            params.set(
                "maxResults",
                String(maxResults)
            );

            params.set("regionCode", "MW");

            params.set("type", "video");

            if (pageToken) {
                params.set(
                    "pageToken",
                    pageToken
                );
            }

            const url =
                `${API_BASE_URL}/api/youtube/search?${params.toString()}`;

            const response = await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        Accept: "application/json",
                    },

                    signal,
                }
            );

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "Cave Tunes returned an invalid server response."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    `YouTube request failed (${response.status}).`
                );
            }

            if (!data?.success) {
                throw new Error(
                    data?.message ||
                    "Unable to search YouTube."
                );
            }

            return data;
        },
        []
    );


    // ==================================================
    // FULL SEARCH
    // ==================================================

    const performSearch = useCallback(
        async (
            searchQuery,
            pageToken = null,
            append = false
        ) => {
            const value =
                String(searchQuery || "").trim();

            if (!value) {
                return;
            }

            if (searchController.current) {
                searchController.current.abort();
            }

            const controller =
                new AbortController();

            searchController.current = controller;

            if (!append && !pageToken) {
                const cached = getSearchCache(value);

                if (
                    cached &&
                    isFresh(
                        cached.timestamp,
                        SEARCH_CACHE_DURATION
                    )
                ) {
                    setResults(cached.results);

                    setNextPageToken(
                        cached.nextPageToken
                    );

                    setSearched(true);

                    setLoading(false);

                    return;
                }
            }

            try {
                setLoading(true);

                setError("");

                const data = await requestYouTube(
                    value,
                    {
                        maxResults: MAX_RESULTS,
                        pageToken,
                        signal: controller.signal,
                    }
                );

                const newResults =
                    Array.isArray(data?.results)
                        ? data.results
                        : [];

                if (append) {
                    setResults(previous => {
                        const existingIds = new Set(
                            previous
                                .map(item => item?.videoId)
                                .filter(Boolean)
                        );

                        const unique = newResults.filter(
                            item =>
                                item?.videoId &&
                                !existingIds.has(item.videoId)
                        );

                        return [
                            ...previous,
                            ...unique,
                        ];
                    });
                } else {
                    setResults(newResults);
                }

                const token =
                    data?.nextPageToken || null;

                setNextPageToken(token);

                setSearched(true);

                if (!append && !pageToken) {
                    saveSearchCache(
                        value,
                        newResults,
                        token
                    );
                }
            } catch (err) {
                if (err?.name === "AbortError") {
                    return;
                }

                console.error(
                    "Cave Tunes YouTube search:",
                    err
                );

                setError(
                    err?.message ||
                    "Unable to search YouTube."
                );

                if (!append) {
                    setResults([]);
                }
            } finally {
                if (
                    searchController.current ===
                    controller
                ) {
                    searchController.current = null;

                    setLoading(false);
                }
            }
        },
        [requestYouTube]
    );


    // ==================================================
    // NAVBAR YOUTUBE SEARCH HANDOFF
    // ==================================================

   // ======================================================
// NAVBAR YOUTUBE SEARCH HANDOFF
// ======================================================

useEffect(() => {
    if (!isNavbarYouTubeNavigation) {
        return undefined;
    }

    const navigationKey = [
        navbarSearch,
        navbarVideoId,
        navigationState?.timestamp ||
        navigationState?.navigationId ||
        "",
    ].join("|");

    if (
        consumedNavigationRef.current ===
        navigationKey
    ) {
        return undefined;
    }

    consumedNavigationRef.current =
        navigationKey;

    let cancelled = false;

    const handoffTimer = setTimeout(() => {
        if (cancelled) {
            return;
        }

        if (navbarSearch) {
            setQuery(navbarSearch);
        }

        if (navbarVideo) {
            openPlayer(navbarVideo);

            setShowSuggestions(false);
        }

        if (
            navbarSearch &&
            !navbarVideo
        ) {
            setShowSuggestions(false);

            performSearch(navbarSearch);
        }

        navigate(
            location.pathname,
            {
                replace: true,
                state: {},
            }
        );
    }, 0);

    return () => {
        cancelled = true;

        clearTimeout(handoffTimer);
    };

}, [
    isNavbarYouTubeNavigation,
    navbarSearch,
    navbarVideo,
    navbarVideoId,
    navigationState,
    performSearch,
    navigate,
    location.pathname,
    openPlayer,
]);

    // ==================================================
    // CLOSE SEARCH DROPDOWN
    // ==================================================

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                searchWrapperRef.current &&
                !searchWrapperRef.current.contains(
                    event.target
                )
            ) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);


    // ==================================================
    // LIVE SEARCH
    // ==================================================

    const performLiveSearch = useCallback(
        async value => {
            const searchValue = value.trim();

            if (
                searchValue.length <
                MIN_SEARCH_LENGTH
            ) {
                setSuggestions([]);

                setSuggestionLoading(false);

                return;
            }

            const cached =
                getSearchCache(searchValue);

            if (cached) {
                const cachedResults =
                    cached.results.slice(
                        0,
                        SUGGESTION_RESULTS
                    );

                setSuggestions(cachedResults);

                setShowSuggestions(
                    cachedResults.length > 0
                );

                if (
                    isFresh(
                        cached.timestamp,
                        SEARCH_CACHE_DURATION
                    )
                ) {
                    setSuggestionLoading(false);

                    return;
                }
            }

            const now = Date.now();

            if (
                now - lastLiveSearch.current <
                LIVE_SEARCH_COOLDOWN
            ) {
                return;
            }

            lastLiveSearch.current = now;

            if (searchController.current) {
                searchController.current.abort();
            }

            const controller =
                new AbortController();

            searchController.current = controller;

            try {
                setSuggestionLoading(true);

                const data = await requestYouTube(
                    searchValue,
                    {
                        maxResults: SUGGESTION_RESULTS,
                        signal: controller.signal,
                    }
                );

                const liveResults =
                    Array.isArray(data?.results)
                        ? data.results
                        : [];

                setSuggestions(liveResults);

                setShowSuggestions(
                    liveResults.length > 0
                );

                saveSearchCache(
                    searchValue,
                    liveResults,
                    data?.nextPageToken
                );
            } catch (err) {
                if (err?.name !== "AbortError") {
                    console.warn(
                        "Cave Tunes live YouTube search:",
                        err
                    );
                }
            } finally {
                if (
                    searchController.current ===
                    controller
                ) {
                    searchController.current = null;

                    setSuggestionLoading(false);
                }
            }
        },
        [requestYouTube]
    );


    // ==================================================
    // INPUT CHANGE
    // ==================================================

    function handleInputChange(event) {
        const value = event.target.value;

        setQuery(value);

        setError("");

        if (liveSearchTimer.current) {
            clearTimeout(liveSearchTimer.current);
        }

        if (!value.trim()) {
            setSuggestions([]);

            setShowSuggestions(false);

            return;
        }

        const cached = getSearchCache(value);

        if (cached) {
            const cachedResults =
                cached.results.slice(
                    0,
                    SUGGESTION_RESULTS
                );

            setSuggestions(cachedResults);

            setShowSuggestions(
                cachedResults.length > 0
            );
        }

        liveSearchTimer.current = setTimeout(
            () => {
                performLiveSearch(value);
            },
            LIVE_SEARCH_DELAY
        );
    }


    // ==================================================
    // INPUT FOCUS
    // ==================================================

    function handleInputFocus() {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }


    // ==================================================
    // SUBMIT SEARCH
    // ==================================================

    function handleSearch(event) {
        event.preventDefault();

        const value = query.trim();

        if (!value) {
            return;
        }

        setShowSuggestions(false);

        performSearch(value);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }


    // ==================================================
    // QUICK SEARCH
    // ==================================================

    function handleQuickSearch(value) {
        const searchValue =
            String(value || "").trim();

        if (!searchValue) {
            return;
        }

        setQuery(searchValue);

        setShowSuggestions(false);

        performSearch(searchValue);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }


    // ==================================================
    // SUGGESTION CLICK
    // ==================================================

    function handleSuggestionClick(video) {
        if (!video) {
            return;
        }

        setQuery(
            cleanTitle(video.title)
        );

        setShowSuggestions(false);

        openPlayer(video);
    }


    // ==================================================
    // CLEAR SEARCH
    // ==================================================

    function clearSearch() {
        if (liveSearchTimer.current) {
            clearTimeout(liveSearchTimer.current);
        }

        if (searchController.current) {
            searchController.current.abort();
        }

        setQuery("");

        setResults([]);

        setSuggestions([]);

        setSearched(false);

        setError("");

        setNextPageToken(null);

        setShowSuggestions(false);

        searchInputRef.current?.focus();
    }


    // ==================================================
    // BACK TO DISCOVERY
    // ==================================================

    function handleBackToDiscovery() {
        if (searchController.current) {
            searchController.current.abort();
        }

        setQuery("");

        setResults([]);

        setSuggestions([]);

        setSearched(false);

        setError("");

        setNextPageToken(null);

        setShowSuggestions(false);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }


    // ==================================================
    // DISCOVERY REFRESH
    // ==================================================

    const refreshDiscovery = useCallback(
        async ({
            force = false,
        } = {}) => {
            if (discoveryLoadingRef.current) {
                return;
            }

            if (!force) {
                const cached = getDiscoveryCache();

                if (
                    cached &&
                    isFresh(
                        cached.timestamp,
                        DISCOVERY_CACHE_DURATION
                    )
                ) {
                    setDiscoveryVideos(cached.results);

                    setDiscoveryLoading(false);

                    return;
                }
            }

            discoveryLoadingRef.current = true;

            if (discoveryController.current) {
                discoveryController.current.abort();
            }

            const controller =
                new AbortController();

            discoveryController.current = controller;

            setDiscoveryRefreshing(true);

            setDiscoveryError("");

            const freshResults = {
                ...(getDiscoveryCache()?.results || {}),
            };

            let successCount = 0;

            try {
                for (
                    const category of DISCOVERY_CATEGORIES
                ) {
                    if (controller.signal.aborted) {
                        break;
                    }

                    try {
                        const data = await requestYouTube(
                            category.query,
                            {
                                maxResults: DISCOVERY_RESULTS,
                                signal: controller.signal,
                            }
                        );

                        const videos =
                            Array.isArray(data?.results)
                                ? data.results
                                : [];

                        if (videos.length > 0) {
                            freshResults[category.id] =
                                videos;

                            successCount++;

                            setDiscoveryVideos(previous => ({
                                ...previous,
                                [category.id]: videos,
                            }));
                        }
                    } catch (err) {
                        if (err?.name === "AbortError") {
                            break;
                        }

                        console.warn(
                            `Discovery failed: ${category.id}`,
                            err
                        );
                    }
                }

                if (successCount > 0) {
                    saveDiscoveryCache(freshResults);

                    setDiscoveryError("");
                } else {
                    const cached = getDiscoveryCache();

                    if (cached?.results) {
                        setDiscoveryVideos(cached.results);
                    }

                    setDiscoveryError(
                        "YouTube could not refresh right now. Showing cached music."
                    );
                }
            } finally {
                if (
                    discoveryController.current ===
                    controller
                ) {
                    discoveryController.current = null;
                }

                discoveryLoadingRef.current = false;

                setDiscoveryRefreshing(false);

                setDiscoveryLoading(false);
            }
        },
        [requestYouTube]
    );


    // ==================================================
    // INITIAL DISCOVERY
    // ==================================================

    useEffect(() => {
        const cached = getDiscoveryCache();

        if (
            cached &&
            isFresh(
                cached.timestamp,
                DISCOVERY_CACHE_DURATION
            )
        ) {
            return undefined;
        }

        const timer = setTimeout(() => {
            refreshDiscovery();
        }, 0);

        return () => {
            clearTimeout(timer);

            if (liveSearchTimer.current) {
                clearTimeout(liveSearchTimer.current);
            }

            if (searchController.current) {
                searchController.current.abort();
            }

            if (discoveryController.current) {
                discoveryController.current.abort();
            }
        };
    }, [refreshDiscovery]);


    // ==================================================
    // KEYBOARD PLAYER CLOSE
    // ==================================================

    useEffect(() => {
        function handleKeyDown(event) {
            if (
                event.key === "Escape" &&
                selectedVideo
            ) {
                closeYouTubePlayer();
            }
        }

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [
        selectedVideo,
        closeYouTubePlayer,
    ]);


    // ==================================================
    // CARD
    // ==================================================

    function renderCard(video) {
        const title =
            cleanTitle(video?.title);

        const thumbnail =
            getThumbnail(video);

        if (
            !video?.videoId ||
            !thumbnail
        ) {
            return null;
        }

        return (
            <article
                key={video.videoId}
                className="youtube-card"
            >

                <button
                    type="button"
                    className="youtube-thumbnail"
                    onClick={() => openPlayer(video)}
                >

                    <img
                        src={thumbnail}
                        alt={title}
                        loading="lazy"
                    />

                    <span className="youtube-thumbnail-overlay">

                        <span className="youtube-play-button">
                            <Play
                                size={22}
                                fill="currentColor"
                            />
                        </span>

                    </span>

                </button>


                <div className="youtube-card-content">

                    <h3>
                        {title}
                    </h3>

                    <p className="youtube-channel">
                        {cleanTitle(video?.channelTitle)}
                    </p>

                    <div className="youtube-card-actions">

                        <button
                            type="button"
                            className="youtube-play-action"
                            onClick={() => openPlayer(video)}
                        >

                            <Play
                                size={15}
                                fill="currentColor"
                            />

                            Play

                        </button>


                        {video?.youtubeUrl && (
                            <a
                                href={video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="youtube-external-action"
                            >

                                <ExternalLink size={15} />

                               open Source

                            </a>
                        )}

                    </div>

                </div>

            </article>
        );
    }


    // ==================================================
    // AVAILABLE CATEGORIES
    // ==================================================

    const availableCategories = useMemo(
        () =>
            DISCOVERY_CATEGORIES.filter(
                category =>
                    (
                        discoveryVideos[category.id] || []
                    ).length > 0
            ),
        [discoveryVideos]
    );


    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="youtube-page">

            {/* ==================================================
                CAVE TUNES CURRENT SONG INDICATOR
            ================================================== */}

            {currentSong && (
                <div className="youtube-cave-player-indicator">

                    <div className="youtube-cave-player-indicator-icon">
                        <Music size={18} />
                    </div>

                    <div className="youtube-cave-player-indicator-info">

                        <span>
                            {isPlaying
                                ? "NOW PLAYING"
                                : "PAUSED"}
                        </span>

                        <strong>
                            {currentSong.title}
                        </strong>

                        <small>
                            {currentSong.artist}
                        </small>

                    </div>

                </div>
            )}


            {/* ==================================================
                HERO
            ================================================== */}

            <section className="youtube-hero">

                <div className="youtube-hero-glow glow-one" />

                <div className="youtube-hero-glow glow-two" />

                <div className="youtube-hero-content">

                    <div className="youtube-badge">

                        <Sparkles size={15} />

                        CAVE TUNES DISCOVER

                    </div>


                    <h1>
                        Discover music.

                        <br />

                        <span>
                            Discover your world.
                        </span>
                    </h1>


                    <p>
                        Explore real music videos,
                        artists and sounds from
                        other platforms — Smart Tv Sponsored by YouTube.
                    </p>


                    {/* SEARCH */}

                    <div
                        className="youtube-search-wrapper"
                        ref={searchWrapperRef}
                    >

                        <form
                            className="youtube-search"
                            onSubmit={handleSearch}
                        >

                            <Search
                                size={21}
                                className="youtube-search-icon"
                            />


                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={handleInputChange}
                                onFocus={handleInputFocus}
                                type="text"
                                autoComplete="off"
                                placeholder="Search songs, artists, music videos..."
                            />


                            {suggestionLoading && (
                                <Loader2
                                    size={19}
                                    className="youtube-search-loader youtube-spin"
                                />
                            )}


                            {query && (
                                <button
                                    type="button"
                                    className="youtube-clear-search"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                >
                                    <X size={18} />
                                </button>
                            )}


                            <button
                                type="submit"
                                className="youtube-search-button"
                                disabled={!query.trim() || loading}
                            >

                                {loading ? (
                                    <Loader2
                                        size={18}
                                        className="youtube-spin"
                                    />
                                ) : (
                                    <Search size={18} />
                                )}

                                <span>
                                    Search
                                </span>

                            </button>

                        </form>


                        {/* LIVE RESULTS */}

                        {showSuggestions &&
                            suggestions.length > 0 && (
                                <div className="youtube-live-results">

                                    <div className="youtube-live-header">

                                        <span>
                                            Source results
                                        </span>

                                        <span>
                                            Live
                                        </span>

                                    </div>


                                    {suggestions
                                        .slice(0, SUGGESTION_RESULTS)
                                        .map(video => (
                                            <button
                                                type="button"
                                                key={video.videoId}
                                                className="youtube-live-result"
                                                onClick={() =>
                                                    handleSuggestionClick(video)
                                                }
                                            >

                                                <div className="youtube-live-thumb">

                                                    <img
                                                        src={getThumbnail(video)}
                                                        alt=""
                                                        loading="lazy"
                                                    />

                                                    <span>
                                                        <Play
                                                            size={13}
                                                            fill="currentColor"
                                                        />
                                                    </span>

                                                </div>


                                                <div>

                                                    <strong>
                                                        {cleanTitle(video.title)}
                                                    </strong>

                                                    <small>
                                                        {cleanTitle(video.channelTitle)}
                                                    </small>

                                                </div>


                                                <ChevronRight size={18} />

                                            </button>
                                        ))}


                                    <div className="youtube-live-footer">
                                        Press Enter to see all results
                                    </div>

                                </div>
                            )}

                    </div>


                    {/* QUICK SEARCH */}

                    <div className="youtube-quick-search">

                        <span>
                            Explore
                        </span>

                        {QUICK_SEARCHES.map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() =>
                                    handleQuickSearch(item)
                                }
                            >
                                {item}
                            </button>
                        ))}

                    </div>

                </div>

            </section>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="youtube-error">

                    <strong>
                        Search failed
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>
            )}


            {/* ==================================================
                SEARCH RESULTS
            ================================================== */}

            {searched ? (
                <main className="youtube-search-page">

                    <div className="youtube-results-header">

                        <div>

                            <button
                                type="button"
                                className="youtube-back-button"
                                onClick={handleBackToDiscovery}
                            >
                                ← Discover
                            </button>

                            <h2>
                                Search results
                            </h2>

                            <p>
                                Results for{" "}
                                <strong>
                                    "{query}"
                                </strong>
                            </p>

                        </div>


                        {results.length > 0 && (
                            <span className="youtube-result-count">
                                {results.length} videos
                            </span>
                        )}

                    </div>


                    {loading && results.length === 0 && (
                        <div className="youtube-loading">

                            <Loader2
                                size={35}
                                className="youtube-spin"
                            />

                            <p>
                                Searching Source...
                            </p>

                        </div>
                    )}


                    {!loading && results.length > 0 && (
                        <div className="youtube-results-grid">
                            {results.map(renderCard)}
                        </div>
                    )}


                    {nextPageToken && (
                        <div className="youtube-load-more">

                            <button
                                type="button"
                                disabled={loading}
                                onClick={() =>
                                    performSearch(
                                        query,
                                        nextPageToken,
                                        true
                                    )
                                }
                            >

                                {loading ? (
                                    <>
                                        <Loader2
                                            size={17}
                                            className="youtube-spin"
                                        />

                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        Load more

                                        <ChevronRight size={17} />
                                    </>
                                )}

                            </button>

                        </div>
                    )}


                    {!loading &&
                        results.length === 0 &&
                        !error && (
                            <div className="youtube-empty">

                                <Search size={45} />

                                <h2>
                                    No results found
                                </h2>

                                <p>
                                    Try another song,
                                    artist or music video.
                                </p>

                            </div>
                        )}

                </main>
            ) : (

                /* ==================================================
                   DISCOVERY
                ================================================== */

                <main className="youtube-discovery">

                    <section className="youtube-discovery-intro">

                        <div>

                            <span>
                                EXPLORE
                            </span>

                            <h2>
                                Discover something new
                            </h2>

                            <p>
                                Fresh music from Malawi,
                                Africa and around the world.
                            </p>

                        </div>


                        <div className="youtube-discovery-intro-icon">
                            <Music2 size={30} />
                        </div>

                    </section>


                    {/* REFRESH NOTICE */}

                    {discoveryRefreshing &&
                        availableCategories.length > 0 && (
                            <div className="youtube-discovery-notice">

                                <Loader2
                                    size={16}
                                    className="youtube-spin"
                                />

                                Updating discovery...

                            </div>
                        )}


                    {discoveryError && (
                        <div className="youtube-discovery-notice">

                            <span>
                                {discoveryError}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    refreshDiscovery({
                                        force: true,
                                    })
                                }
                            >

                                <RefreshCw size={15} />

                                Retry

                            </button>

                        </div>
                    )}


                    {/* INITIAL LOADING */}

                    {discoveryLoading &&
                        availableCategories.length === 0 ? (
                        <div className="youtube-loading">

                            <Loader2
                                size={35}
                                className="youtube-spin"
                            />

                            <p>
                                Preparing your discovery feed...
                            </p>

                        </div>
                    ) : (
                        availableCategories.map(category => {
                            const videos =
                                discoveryVideos[category.id] || [];

                            const Icon = category.icon;

                            return (
                                <section
                                    key={category.id}
                                    className="youtube-discovery-section"
                                >

                                    <div className="youtube-category-header">

                                        <div className="youtube-category-title">

                                            <div className="youtube-category-icon">
                                                <Icon size={19} />
                                            </div>

                                            <div>

                                                <h2>
                                                    {category.title}
                                                </h2>

                                                <p>
                                                    {category.subtitle}
                                                </p>

                                            </div>

                                        </div>


                                        <button
                                            type="button"
                                            className="youtube-see-more"
                                            onClick={() =>
                                                handleQuickSearch(
                                                    category.query
                                                )
                                            }
                                        >

                                            Explore

                                            <ChevronRight size={17} />

                                        </button>

                                    </div>


                                    <div className="youtube-discovery-row">
                                        {videos.map(renderCard)}
                                    </div>

                                </section>
                            );
                        })
                    )}


                    {/* CTA */}

                    {!discoveryLoading && (
                        <section className="youtube-discovery-cta">

                            <div className="youtube-discovery-cta-icon">
                                <Search size={28} />
                            </div>

                            <div>

                                <h2>
                                    Looking for something specific?
                                </h2>

                                <p>
                                    Search Source for any
                                    song, artist or music video.
                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={() => {
                                    searchInputRef.current?.focus();

                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                            >

                                Search Source

                                <Search size={17} />

                            </button>

                        </section>
                    )}

                </main>
            )}

        </div>
    );
}


export default YouTube;