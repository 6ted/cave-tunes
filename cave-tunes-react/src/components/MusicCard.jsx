import {
  Play,
  Pause,
  MoreHorizontal,
  ListPlus,
  UserRound,
  Heart,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import "../styles/MusicCard.css";

import { usePlayer } from "../context/usePlayer";
import { useAuth } from "../context/AuthContext";

function MusicCard({
  song,
  songs = [],
}) {
  const {
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
setFullPlayerOpen,

    likeMap,
    syncSongLikeStatus,
    toggleSongLike,

    openPlaylistModal,
  } = usePlayer();

  const { user } = useAuth();
  const navigate = useNavigate();

  const menuRef = useRef(null);
  const menuPanelRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // ==========================================
  // CURRENT SONG
  // ==========================================

  const isCurrentSong =
    currentSong?.id === song.id;

  // ==========================================
  // PLAY SONG
  // ==========================================

// ==========================================
// PLAY SONG AND OPEN FULL PLAYER
// ==========================================

const handlePlay = async () => {
  if (isCurrentSong && isPlaying) {
    pauseSong();
    return;
  }

  try {
    const result = playSong(song, songs);

    setFullPlayerOpen(true);

    await result;
  } catch (error) {
    console.error("Unable to play song:", error);
  }
};

  // ==========================================
  // LIKE STATE
  // ==========================================

  const likeState = likeMap?.[song.id];

  const likeCount = Number(
    likeState?.likes ?? song.likes ?? 0
  );

  const isLiked = Boolean(likeState?.liked);

  // ==========================================
  // LOAD LIKE STATUS
  // ==========================================

  useEffect(() => {
    if (!song?.id) return;

    if (!likeMap?.[song.id]) {
      syncSongLikeStatus(song.id);
    }
  }, [
    song?.id,
    likeMap,
    syncSongLikeStatus,
  ]);

  // ==========================================
  // CLOSE MENU ON OUTSIDE CLICK OR ESCAPE
  // ==========================================

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event) => {
      const clickedMenuButton =
        menuRef.current?.contains(event.target);

      const clickedMenuPanel =
        menuPanelRef.current?.contains(event.target);

      if (!clickedMenuButton && !clickedMenuPanel) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [menuOpen]);

  // ==========================================
  // PREVENT BACKGROUND SCROLL WHILE MENU IS OPEN
  // ==========================================

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [menuOpen]);


  // ==========================================
// ADD TO PLAYLIST
// ==========================================

const handleAddToPlaylist = () => {
  if (!user) {
    setMenuOpen(false);
    navigate("/login");
    return;
  }

  if (typeof openPlaylistModal !== "function") {
    console.error(
      "Playlist modal is not connected to PlayerContext."
    );

    alert(
      "The playlist feature is not available right now. Please try again."
    );

    return;
  }

  try {
    // Open the playlist modal first
    openPlaylistModal(song);

    // Close the full-screen menu
    setMenuOpen(false);
  } catch (error) {
    console.error(
      "Failed to open playlist modal:",
      error
    );

    alert(
      "Could not open your playlists. Please try again."
    );
  }
};

  // ==========================================
  // VIEW CREATOR
  // ==========================================

  const handleViewCreator = () => {
    setMenuOpen(false);

    const creatorId =
      song.user_id ||
      song.creator_id ||
      song.artist_id ||
      song.userId;

    const creatorRole =
      song.role ||
      song.creator_role ||
      song.artist_role ||
      "artist";

    if (!creatorId) {
      console.error(
        "Creator ID was not found for this song:",
        song
      );

      return;
    }

    navigate(
      `/creator/${creatorRole}/${creatorId}`
    );
  };

  // ==========================================
  // LIKE SONG
  // ==========================================

  const handleLikeSong = async () => {
    if (!user) {
      setMenuOpen(false);
      navigate("/login");
      return;
    }

    if (
      typeof toggleSongLike !== "function" ||
      likeLoading
    ) {
      return;
    }

    try {
      setLikeLoading(true);

      await toggleSongLike(song.id);

      setMenuOpen(false);
    } catch (error) {
      console.error(
        "Failed to like song:",
        error
      );
    } finally {
      setLikeLoading(false);
    }
  };

  // ==========================================
  // FULL-SCREEN MENU
  // RENDERED OUTSIDE THE MUSIC CARD
  // ==========================================

  const fullScreenMenu = menuOpen
    ? createPortal(
      <div
  className="music-menu-overlay"
  onClick={(event) => event.stopPropagation()}
  onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMenuOpen(false);
            }
          }}
          role="presentation"
        >
          <div
            ref={menuPanelRef}
            className="music-dropdown-menu"
            role="dialog"
            aria-modal="true"
            aria-label={`${song.title || "Song"} options`}
          >
            {/* MENU HEADER */}

            <div className="music-menu-header">
              <div className="music-menu-song">
                <img
                  src={song.cover}
                  alt={song.title || "Song cover"}
                />

                <div className="music-menu-song-info">
                  <h3>{song.title}</h3>

                  <p>
                    {song.artist || "Unknown Artist"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="music-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                autoFocus
              >
                ×
              </button>
            </div>

            <div className="music-menu-divider" />

            {/* ADD TO PLAYLIST */}

            <button
              type="button"
              className="music-dropdown-item"
              onClick={handleAddToPlaylist}
            >
              <ListPlus size={22} />

              <span>Add to Playlist</span>
            </button>

            {/* VIEW CREATOR */}

            <button
              type="button"
              className="music-dropdown-item"
              onClick={handleViewCreator}
            >
              <UserRound size={22} />

              <span>View Creator</span>
            </button>

            {/* LIKE SONG */}

            <button
              type="button"
              className="music-dropdown-item"
              onClick={handleLikeSong}
              disabled={likeLoading}
            >
              <Heart
                size={22}
                fill={
                  isLiked
                    ? "currentColor"
                    : "none"
                }
              />

              <span>
                {likeLoading
                  ? "Please wait..."
                  : isLiked
                  ? "Unlike Song"
                  : "Like Song"}
              </span>
            </button>

            <div className="music-menu-divider" />

            {/* CANCEL */}

            <button
              type="button"
              className="music-menu-cancel"
              onClick={() => setMenuOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  // ==========================================
  // COMPONENT
  // ==========================================

  return (
    <>
     <div
  className={`music-card ${
    isCurrentSong ? "playing" : ""
  }`}
  onClick={handlePlay}
  role="group"
>
        {/* COVER */}

        <div className="music-cover">
          <img
            src={song.cover}
            alt={song.title || "Song cover"}
          />

         <button
  type="button"
  className="play-button"
  onClick={(event) => {
    event.stopPropagation();
    handlePlay();
  }}
            aria-label={
              isCurrentSong && isPlaying
                ? "Pause song"
                : "Play song"
            }
          >
            {isCurrentSong && isPlaying ? (
              <Pause
                size={20}
                fill="currentColor"
              />
            ) : (
              <Play
                size={20}
                fill="currentColor"
              />
            )}
          </button>
        </div>

        {/* SONG INFORMATION */}

        <div className="music-info">
          <div className="music-title-row">
            <h3 title={song.title}>
              {song.title}
            </h3>

            {/* THREE-DOT BUTTON */}

            <div
              className="music-menu-container"
              ref={menuRef}
            >
              <button
                type="button"
                className="card-icon"
               onClick={(event) => {
  event.stopPropagation();
  setMenuOpen((previous) => !previous);
}}
                aria-label="Song options"
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          <p>
            {song.artist || "Unknown Artist"}
          </p>

          <p className="like-count">
            {likeCount} ♡
          </p>
        </div>
      </div>

      {/* THE FULL-SCREEN MENU IS OUTSIDE THE CARD */}

      {fullScreenMenu}
    </>
  );
}

export default MusicCard;