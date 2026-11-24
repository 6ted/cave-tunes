import { useState, useEffect, useRef } from "react";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
} from "lucide-react";

import { usePlayer } from "../context/usePlayer";
import "./PlayerBar.css";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isAdPlaying,
  currentAd,
  adLoading,
    volume,
    isShuffle,
    repeatMode,
    togglePlay,
    nextSong,
    previousSong,
    seek,
    changeVolume,
    toggleShuffle,
    toggleRepeat,
    setFullPlayerOpen,
  } = usePlayer();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const inactivityTimer = useRef(null);

  // Default placeholder image path
  const DEFAULT_COVER = "/Cave-Tunes-logo.png";

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Reset the 2-second timer to collapse back to circle mode
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 2000);
  };

  // Keep player expanded while user is actively touching or moving mouse over it
  const handleUserActivity = () => {
    if (!isCollapsed) {
      resetInactivityTimer();
    }
  };

  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // Handle clicking the bar container
  const handleBarClick = (event) => {
    // Ignore clicks on control buttons/inputs to prevent unwanted toggles
    if (event.target.closest("button, input")) {
      return;
    }

    if (isCollapsed) {
      // 1. Expand from mini circle to normal bar on mobile
      setIsCollapsed(false);
      resetInactivityTimer();
    } else {
      // 2. Open Full Screen Overlay Player when expanded bar is tapped
      setFullPlayerOpen(true);
    }
  };

  // SVG Circular progress math
  const radius = 27;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <footer
      className={`player-bar ${isCollapsed ? "collapsed-mobile" : "expanded-mobile"}`}
      onClick={handleBarClick}
      onTouchStart={handleUserActivity}
      onMouseMove={handleUserActivity}
    >
      {/* 🟢 MINI CIRCULAR PLAYER (Visible on mobile when collapsed) */}
      <div className="mini-circle-player">
        <div className="mini-cover-wrapper">
          <img
            src={currentSong?.cover || DEFAULT_COVER}
            alt={currentSong?.title || "No song playing"}
            className="mini-cover"
          />
        </div>

        <svg height={radius * 2} width={radius * 2} className="circular-progress">
          {/* Background track */}
          <circle
            stroke="rgba(255, 255, 255, 0.15)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Animated progress ring */}
          <circle
            stroke="#ebb113"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
      </div>

      {/* 🟡 STANDARD PLAYER BAR CONTENT */}
      <div className="player-bar-full-content">
       {/* ==================================================
    SONG / ADVERTISEMENT INFORMATION
================================================== */}

<div className="player-song">

  <div className="player-cover">
    <img
      src={currentSong?.cover || DEFAULT_COVER}
      alt={
        isAdPlaying
          ? "Advertisement"
          : currentSong?.title || "No song playing"
      }
    />
  </div>

  <div className="player-song-info">

    {isAdPlaying || adLoading ? (

      <div className="player-ad-info">

        <span className="player-ad-badge">
          ADVERTISEMENT
        </span>

        <strong>
          {adLoading
            ? "Loading advertisement..."
            : currentAd?.title || "Cave Tunes Advertisement"}
        </strong>

        <span>
          {currentAd?.description || "Sponsored audio"}
        </span>

      </div>

    ) : (

      <>
        <strong>
          {currentSong
            ? currentSong.title
            : "No song playing"}
        </strong>

        <span>
          {currentSong
            ? currentSong.artist
            : "Cave Tunes"}
        </span>
      </>

    )}

  </div>

</div>

        {/* CONTROLS */}
        <div className="player-controls">
          <div className="control-buttons">
            <button
              className={isShuffle ? "active-control" : ""}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <Shuffle size={17} />
            </button>

            <button
              onClick={previousSong}
              disabled={!currentSong}
              aria-label="Previous"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              className="main-play-button"
              onClick={togglePlay}
              disabled={!currentSong}
            >
            {isPlaying || isAdPlaying ? (
  <Pause size={21} fill="currentColor" />
) : (
  <Play size={21} fill="currentColor" />
)}
            </button>

            <button
              onClick={nextSong}
              disabled={!currentSong}
              aria-label="Next"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button
              className={`control-button repeat-button ${
                repeatMode !== "off" ? "active-control" : ""
              }`}
              onClick={toggleRepeat}
              aria-label={`Repeat mode: ${repeatMode}`}
              title={`Repeat mode: ${repeatMode}`}
            >
              <Repeat size={17} />
              
              {/* Badge for Repeat One */}
              {repeatMode === "one" && (
                <span className="repeat-badge repeat-badge-one">1</span>
              )}

              {/* Subtle indicator dot for Repeat All */}
              {repeatMode === "all" && (
                <span className="repeat-badge repeat-badge-all" />
              )}
            </button>
          </div>

         {/* PROGRESS / ADVERTISEMENT STATUS */}

{isAdPlaying || adLoading ? (

  <div className="player-ad-progress">

    <span className="player-ad-equalizer">
      <i></i>
      <i></i>
      <i></i>
    </span>

    <span>
      {adLoading
        ? "Preparing advertisement..."
        : "Advertisement playing"}
    </span>

  </div>

) : (

  <div className="progress-container">

    <span>{formatTime(currentTime)}</span>

    <input
      className="progress-range"
      type="range"
      min="0"
      max={duration || 0}
      step="0.1"
      value={currentTime}
      onChange={(event) =>
        seek(Number(event.target.value))
      }
      style={{
        "--progress": `${progress}%`,
      }}
      disabled={!currentSong}
    />

    <span>{formatTime(duration)}</span>

  </div>

)}
        </div>

        {/* VOLUME */}
        <div className="player-volume">
          <Volume2 size={19} />

          <input
            className="volume-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            style={{
              "--volume": `${volume * 100}%`,
            }}
          />
        </div>
      </div>
    </footer>
  );
}

export default PlayerBar;