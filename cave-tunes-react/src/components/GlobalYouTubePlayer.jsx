// ======================================================
// CAVE TUNES
// GLOBAL YOUTUBE PLAYER
//
// Features:
// - Persistent YouTube playback
// - Floating player
// - Minimize and restore
// - Drag player
// - Open original source
// - Open global Scizzor widget
// ======================================================

import {
    ExternalLink,
    X,
    Scissors,
    Minimize2,
    Maximize2,
    Grip,
} from "lucide-react";

import {
    useYouTubePlayer,
} from "../context/YouTubePlayerContext";

import useScizzor from "../context/useScizzor";

import "./GlobalYouTubePlayer.css";

// ======================================================
// CLEAN YOUTUBE TEXT
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
// COMPONENT
// ======================================================

function GlobalYouTubePlayer() {

    // ==================================================
    // YOUTUBE PLAYER
    // ==================================================

    const {
        selectedVideo,
        playerMinimized,
        playerPosition,

        closeYouTubePlayer,
        minimizeYouTubePlayer,
        restoreYouTubePlayer,
        startPlayerDrag,

    } = useYouTubePlayer();


    // ==================================================
    // GLOBAL SCIZZOR
    // ==================================================

    const {
        openWidget,
    } = useScizzor();


    // ==================================================
    // OPEN SCIZZOR
    // ==================================================

    function handleOpenScizzor() {

        openWidget();

    }


    // ==================================================
    // NO SELECTED VIDEO
    // ==================================================

    if (!selectedVideo) {
        return null;
    }


    // ==================================================
    // SOURCE URL
    // ==================================================

    const sourceUrl =
        selectedVideo.youtubeUrl ||
        `https://www.youtube.com/watch?v=${selectedVideo.videoId}`;


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="youtube-floating-layer">

            <div
                className={`youtube-player-container ${
                    playerMinimized
                        ? "is-minimized"
                        : "is-expanded"
                }`}

                style={{
                    left: `${playerPosition.x}px`,
                    top: `${playerPosition.y}px`,
                }}
            >

                {/* ======================================
                    PLAYER TOOLBAR
                ====================================== */}

                <div className="youtube-player-toolbar">

                    <div
                        className="youtube-player-drag-handle"

                        onPointerDown={startPlayerDrag}

                        title="Drag player"
                    >

                        <Grip size={17} />

                        <span>
                            SMART TV
                        </span>

                        <small>
                            Sponsored by YouTube
                        </small>

                    </div>


                    <div className="youtube-player-toolbar-actions">

                        {!playerMinimized ? (

                            <button
                                type="button"
                                onClick={minimizeYouTubePlayer}
                                title="Minimize player"
                                aria-label="Minimize player"
                            >

                                <Minimize2 size={17} />

                            </button>

                        ) : (

                            <button
                                type="button"
                                onClick={restoreYouTubePlayer}
                                title="Restore player"
                                aria-label="Restore player"
                            >

                                <Maximize2 size={17} />

                            </button>

                        )}


                        <button
                            type="button"
                            onClick={closeYouTubePlayer}
                            title="Close player"
                            aria-label="Close player"
                        >

                            <X size={19} />

                        </button>

                    </div>

                </div>


                {/* ======================================
                    YOUTUBE IFRAME
                ====================================== */}

                <div className="youtube-player">

                    <iframe
                        key={selectedVideo.videoId}

                        src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}

                        title={`Cave Tunes Video Player - ${cleanTitle(selectedVideo.title)}`}

                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"

                        referrerPolicy="strict-origin-when-cross-origin"

                        allowFullScreen
                    />

                </div>


                {/* ======================================
                    VIDEO INFORMATION
                ====================================== */}

                <div className="youtube-player-info">

                    <h2>
                        {cleanTitle(selectedVideo.title)}
                    </h2>

                    <p>
                        {cleanTitle(selectedVideo.channelTitle)}
                    </p>


                    {/* ==================================
                        PLAYER ACTIONS
                    ================================== */}

                    <div className="youtube-player-actions">


                        {/* OPEN ORIGINAL SOURCE */}

                        <a
                            href={sourceUrl}

                            target="_blank"

                            rel="noopener noreferrer"

                        >

                            Open Source

                            <ExternalLink size={16} />

                        </a>


                        {/* OPEN GLOBAL SCIZZOR */}

                   <button
    type="button"
    className="youtube-scizzor-button"
    onClick={handleOpenScizzor}
    title="Open Scizzor"
>
    <Scissors size={17} />

    <span>Scizzor</span>
</button>


                    </div>

                </div>

            </div>

        </div>

    );

}


export default GlobalYouTubePlayer;