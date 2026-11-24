import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

const YouTubePlayerContext = createContext(null);

function normalizeVideo(video) {
    if (!video) {
        return null;
    }

    const videoId =
        video.videoId ||
        video.video_id ||
        video.id;

    if (!videoId) {
        return null;
    }

    return {
        ...video,

        videoId,

        title:
            video.title ||
            "YouTube Video",

        channelTitle:
            video.channelTitle ||
            video.channel ||
            "YouTube",

        thumbnail:
            video.thumbnail ||
            video.thumbnail_url ||
            video.thumbnails?.high ||
            video.thumbnails?.medium ||
            video.thumbnails?.default ||
            "",

        youtubeUrl:
            video.youtubeUrl ||
            video.url ||
            `https://www.youtube.com/watch?v=${videoId}`,

        embedUrl:
            video.embedUrl ||
            `https://www.youtube.com/embed/${videoId}`,
    };
}

export function YouTubePlayerProvider({ children }) {
    const [selectedVideo, setSelectedVideo] =
        useState(null);

    const [playerMinimized, setPlayerMinimized] =
        useState(false);

    const [playerPosition, setPlayerPosition] =
        useState({
            x: Math.max(8, window.innerWidth - 540),
            y: Math.max(8, window.innerHeight - 450),
        });

    const [sizaroMessage, setSizaroMessage] =
        useState("");

    const playerDragRef = useRef({
        dragging: false,
        offsetX: 0,
        offsetY: 0,
    });

    const getPlayerDimensions = useCallback(() => {
        const width = playerMinimized
            ? Math.min(340, window.innerWidth - 16)
            : Math.min(520, window.innerWidth - 16);

        const height = playerMinimized
            ? width * 9 / 16 + 43
            : width * 9 / 16 + 180;

        return {
            width,
            height,
        };
    }, [playerMinimized]);

    const openYouTubeVideo = useCallback((video) => {
        const normalizedVideo = normalizeVideo(video);

        if (!normalizedVideo) {
            return;
        }

        const width = Math.min(
            520,
            window.innerWidth - 16
        );

        const height =
            width * 9 / 16 + 180;

        setPlayerMinimized(false);

        setPlayerPosition({
            x: Math.max(
                8,
                window.innerWidth - width - 20
            ),

            y: Math.max(
                8,
                window.innerHeight - height - 20
            ),
        });

        setSelectedVideo(normalizedVideo);

        setSizaroMessage("");
    }, []);

    const closeYouTubePlayer = useCallback(() => {
        setSelectedVideo(null);
        setPlayerMinimized(false);
        setSizaroMessage("");
    }, []);

    const minimizeYouTubePlayer = useCallback(() => {
        setPlayerMinimized(true);
    }, []);

    const restoreYouTubePlayer = useCallback(() => {
        setPlayerMinimized(false);
    }, []);

    const startPlayerDrag = useCallback((event) => {
        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return;
        }

        const container =
            event.currentTarget.closest(
                ".youtube-player-container"
            );

        if (!container) {
            return;
        }

        event.preventDefault();

        const rect =
            container.getBoundingClientRect();

        playerDragRef.current = {
            dragging: true,

            offsetX:
                event.clientX - rect.left,

            offsetY:
                event.clientY - rect.top,
        };
    }, []);

    useEffect(() => {
        function handleDragMove(event) {
            if (!playerDragRef.current.dragging) {
                return;
            }

            const {
                width,
                height,
            } = getPlayerDimensions();

            const x = Math.max(
                8,
                Math.min(
                    window.innerWidth - width - 8,
                    event.clientX -
                        playerDragRef.current.offsetX
                )
            );

            const y = Math.max(
                8,
                Math.min(
                    window.innerHeight - height - 8,
                    event.clientY -
                        playerDragRef.current.offsetY
                )
            );

            setPlayerPosition({
                x,
                y,
            });
        }

        function handleDragEnd() {
            playerDragRef.current.dragging = false;
        }

        function handleResize() {
            const {
                width,
                height,
            } = getPlayerDimensions();

            setPlayerPosition(previous => ({
                x: Math.max(
                    8,
                    Math.min(
                        previous.x,
                        window.innerWidth - width - 8
                    )
                ),

                y: Math.max(
                    8,
                    Math.min(
                        previous.y,
                        window.innerHeight - height - 8
                    )
                ),
            }));
        }

        window.addEventListener(
            "pointermove",
            handleDragMove
        );

        window.addEventListener(
            "pointerup",
            handleDragEnd
        );

        window.addEventListener(
            "pointercancel",
            handleDragEnd
        );

        window.addEventListener(
            "resize",
            handleResize
        );

        return () => {
            window.removeEventListener(
                "pointermove",
                handleDragMove
            );

            window.removeEventListener(
                "pointerup",
                handleDragEnd
            );

            window.removeEventListener(
                "pointercancel",
                handleDragEnd
            );

            window.removeEventListener(
                "resize",
                handleResize
            );
        };
    }, [getPlayerDimensions]);

    const value = {
        selectedVideo,
        playerMinimized,
        playerPosition,
        sizaroMessage,
        setSizaroMessage,
        openYouTubeVideo,
        closeYouTubePlayer,
        minimizeYouTubePlayer,
        restoreYouTubePlayer,
        startPlayerDrag,
    };

    return (
        <YouTubePlayerContext.Provider value={value}>
            {children}
        </YouTubePlayerContext.Provider>
    );
}

// This hook is intentionally exported alongside its provider for context consumers.
// eslint-disable-next-line react-refresh/only-export-components
export function useYouTubePlayer() {
    const context = useContext(YouTubePlayerContext);

    if (!context) {
        throw new Error(
            "useYouTubePlayer must be used inside YouTubePlayerProvider."
        );
    }

    return context;
}