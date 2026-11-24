import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  ListPlus,
  UserRound,
  Plus,

  RefreshCw,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "./FullPlayer.css";

import { usePlayer } from "../context/usePlayer";
import { useAuth } from "../context/AuthContext";

// ======================================================
// API CONFIGURATION
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;

// ======================================================
// FORMAT TIME
// ======================================================

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}


function parseLyrics(lyrics) {
  if (!lyrics || typeof lyrics !== "string") {
    return {
      synced: false,
      lines: [],
    };
  }

  const rawLines = lyrics
    .replace(/\r/g, "")
    .split("\n");

  const timestampRegex =
     /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  const syncedLines = [];

  rawLines.forEach((line) => {
    const matches = [...line.matchAll(timestampRegex)];

    if (!matches.length) return;

    const text = line.replace(timestampRegex, "").trim();

    matches.forEach((match) => {
      const hours = Number(match[1] || 0);
      const minutes = Number(match[2] || 0);
      const seconds = Number(match[3] || 0);
      const fraction = match[4] || "0";

      const milliseconds = Number(
        fraction.padEnd(3, "0").slice(0, 3)
      );

      syncedLines.push({
        time:
          hours * 3600 +
          minutes * 60 +
          seconds +
          milliseconds / 1000,
        text,
      });
    });
  });

  if (syncedLines.length) {
    syncedLines.sort((a, b) => a.time - b.time);

    return {
      synced: true,
      lines: syncedLines,
    };
  }

  return {
    synced: false,
    lines: rawLines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text })),
  };
}


function getSongCover(song) {
  const cover =
    song?.cover ||
    song?.cover_url ||
    song?.cover_image ||
    song?.cover_image_url ||
    song?.artwork ||
    song?.image_url ||
    "";

  if (!cover) return "";

  // Keep full image URLs unchanged.
  if (/^https?:\/\//i.test(cover)) {
    return cover;
  }

  // Handle relative upload paths.
  return `${API_BASE_URL}${
    cover.startsWith("/") ? "" : "/"
  }${cover}`;
}

// ======================================================
// NORMALIZE FEATURED ARTISTS
// ======================================================

function normalizeFeaturedArtists(value) {
  if (!value) return [];

  let artists = value;

  // Support JSON strings containing arrays.
  if (typeof artists === "string") {
    const trimmed = artists.trim();

    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        artists = JSON.parse(trimmed);
      } catch {
        artists = trimmed;
      }
    }
  }

  // Support arrays of strings or artist objects.
  if (Array.isArray(artists)) {
    return artists
      .map((artist) => {
        if (typeof artist === "string") {
          return artist.trim();
        }

        if (artist && typeof artist === "object") {
          return (
            artist.artist_name ||
            artist.name ||
            artist.username ||
            ""
          ).trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  // Support comma-separated artist names.
  if (typeof artists === "string") {
    return artists
      .split(",")
      .map((artist) => artist.trim())
      .filter(Boolean);
  }

  return [];
}

// ======================================================
// FULL PLAYER
// ======================================================

function FullPlayer() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    currentSong,
    queue,
        isAdPlaying,
    currentAd,
    adLoading,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,

    togglePlay,
    playSong,
    nextSong,
    previousSong,

    seek,
    changeVolume,

    toggleShuffle,
    toggleRepeat,

    fullPlayerOpen,
    setFullPlayerOpen,

    likeMap,
    toggleSongLike,
  } = usePlayer();


// ====================================================
// 3D CAROUSEL DRAG STATE
// ====================================================


const [isDragging, setIsDragging] = useState(false);


const dragRef = useRef({
  pointerId: null,
  startX: 0,
  currentX: 0,
  moved: false,
});

const songChangeLocked = useRef(false);
const suppressCarouselClick = useRef(false);
const songChangeTimer = useRef(null);


  // ====================================================
  // PLAYLIST STATE
  // ====================================================

  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] =
    useState(false);

  const [playlistName, setPlaylistName] = useState("");
  const [playlists, setPlaylists] = useState([]);

  const [loadingPlaylists, setLoadingPlaylists] =
    useState(false);

  const [creatingPlaylist, setCreatingPlaylist] =
    useState(false);

  const [addingPlaylistId, setAddingPlaylistId] =
    useState(null);

  const [playlistError, setPlaylistError] = useState("");
  const [playlistMessage, setPlaylistMessage] =
    useState("");

    const [carouselDirection, setCarouselDirection] = useState("");

// ====================================================
// LYRICS AND RECOMMENDATIONS
// ====================================================

const [lyricsData, setLyricsData] = useState(null);

const [recommendationsData, setRecommendationsData] =
  useState(null);

const lyricsContainerRef = useRef(null);
const activeLyricRef = useRef(null);

  // ====================================================
  // AUTHENTICATION HEADERS
  // ====================================================

  const getAuthHeaders = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    return {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    };
  }, []);

  // ====================================================
  // API REQUEST HELPER
  // ====================================================

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const response = await fetch(
        `${API_BASE_URL}/api/library${path}`,
        {
          ...options,
          headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
          },
          credentials: "include",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "The request could not be completed."
        );
      }

      return data;
    },
    [getAuthHeaders]
  );



// ====================================================
// LOAD SONG LYRICS
// ====================================================

useEffect(() => {
  if (!currentSong?.id) return;

  const controller = new AbortController();
  const songId = currentSong.id;

  async function loadLyrics() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/music/${songId}`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load song details.");
      }

      const data = await response.json();
      const song = data.song || {};

      let lyrics =
        currentSong.lyrics ||
        song.lyrics ||
        "";

      // If no lyrics text is stored directly,
      // try retrieving the uploaded lyrics file.
      const lyricsFile =
        song.lyrics_file_url ||
        currentSong.lyrics_file_url;

      if (!String(lyrics).trim() && lyricsFile) {
        const lyricsUrl = /^https?:\/\//i.test(lyricsFile)
          ? lyricsFile
          : `${API_BASE_URL}${
              String(lyricsFile).startsWith("/")
                ? ""
                : "/"
            }${lyricsFile}`;

        const lyricsResponse = await fetch(lyricsUrl, {
          credentials: "include",
          signal: controller.signal,
        });

        if (lyricsResponse.ok) {
          lyrics = await lyricsResponse.text();
        }
      }

      if (!controller.signal.aborted) {
        setLyricsData({
          songId,
          lyrics: String(lyrics || "").trim(),
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("LYRICS LOAD ERROR:", error);

        setLyricsData({
          songId,
          lyrics: "",
        });
      }
    }
  }

  loadLyrics();

  return () => controller.abort();
}, [
  currentSong?.id,
  currentSong?.lyrics,
  currentSong?.lyrics_file_url,
  getAuthHeaders,
]);

// ====================================================
// LOAD RECOMMENDED SONGS
// ====================================================

useEffect(() => {
  if (!currentSong?.id) return;

  const controller = new AbortController();
  const songId = currentSong.id;

  async function loadRecommendations() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/music/${songId}/recommendations?limit=12`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load recommendations."
        );
      }

      if (!controller.signal.aborted) {
        setRecommendationsData({
          songId,
          songs: data.songs || [],
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(
          "RECOMMENDATIONS LOAD ERROR:",
          error
        );

        setRecommendationsData({
          songId,
          songs: [],
        });
      }
    }
  }

  loadRecommendations();

  return () => controller.abort();
}, [currentSong?.id]);

// ====================================================
// PREPARE LYRICS AND RECOMMENDATIONS
// ====================================================

const lyricsForCurrentSong =
  currentSong && lyricsData?.songId === currentSong.id
    ? lyricsData.lyrics
    : "";

const parsedLyrics = parseLyrics(lyricsForCurrentSong);

const recommendations =
  currentSong &&
  recommendationsData?.songId === currentSong.id
    ? recommendationsData.songs
    : [];

let activeLyricIndex = -1;

if (parsedLyrics.synced) {
  for (let i = 0; i < parsedLyrics.lines.length; i++) {
    if (parsedLyrics.lines[i].time <= currentTime) {
      activeLyricIndex = i;
    } else {
      break;
    }
  }
}
// ====================================================
// AUTO-SCROLL ACTIVE LYRIC
// ====================================================

useEffect(() => {
  if (
    !currentSong ||
    !parsedLyrics.synced ||
    activeLyricIndex < 0
  ) {
    return;
  }

  activeLyricRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, [
  currentSong,
  parsedLyrics.synced,
  activeLyricIndex,
]);


  // ====================================================
  // LOGIN REDIRECT
  // ====================================================

  function redirectToLogin() {
    setFullPlayerOpen(false);

    window.setTimeout(() => {
      navigate("/login");
    }, 250);
  }

  // ====================================================
  // LOAD THE LOGGED-IN USER'S PLAYLISTS
  // ====================================================

  const loadPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      setPlaylistError("");
      return;
    }

    setLoadingPlaylists(true);
    setPlaylistError("");

    try {
      const data = await apiRequest("/playlists");

      setPlaylists(
        (data.playlists || []).map((playlist) => ({
          ...playlist,
          id: playlist.id,
          name: playlist.name || "Untitled Playlist",
          song_count: Number(playlist.song_count || 0),
        }))
      );
    } catch (error) {
      console.error(
        "Cave Tunes: Unable to load playlists:",
        error
      );

      setPlaylistError(
        error.message || "Unable to load your playlists."
      );
    } finally {
      setLoadingPlaylists(false);
    }
  }, [user, apiRequest]);

  // ====================================================
// LOAD PLAYLISTS WHEN THE MODAL OPENS
// ====================================================

useEffect(() => {
  if (!playlistOpen || !user) return;

  let cancelled = false;

  const fetchPlaylists = async () => {
    try {
      await loadPlaylists();

      if (cancelled) return;
    } catch (error) {
      if (!cancelled) {
        console.error("Failed to load playlists:", error);
      }
    }
  };

  fetchPlaylists();

  return () => {
    cancelled = true;
  };
}, [playlistOpen, user, loadPlaylists]);
  // ====================================================
  // OPEN PLAYLIST MODAL
  // ====================================================

  function openPlaylistModal() {
    setPlaylistMessage("");
    setPlaylistError("");
    setCreatePlaylistOpen(false);
    setPlaylistName("");

    if (!user) {
      redirectToLogin();
      return;
    }

    setPlaylistOpen(true);
  }

  // ====================================================
  // LIKE / UNLIKE
  // ====================================================

  async function handleLike() {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (!currentSong?.id) {
      return;
    }

    const currentLike = likeMap[currentSong.id];

    if (currentLike?.loading) {
      return;
    }

    try {
      await toggleSongLike(currentSong.id);
    } catch (error) {
      console.error(
        "Cave Tunes: Full Player Like Error:",
        error
      );
    }
  }

  // ====================================================
  // CURRENT SONG LIKE STATE
  // ====================================================

  const currentLike = currentSong?.id
    ? likeMap[currentSong.id]
    : null;

  const liked = Boolean(currentLike?.liked);
  const likeCount = Number(currentLike?.likes || 0);
  const likeLoading = Boolean(currentLike?.loading);

  // ====================================================
// CURRENT SONG FEATURED ARTISTS
// ====================================================

const featuredArtists = normalizeFeaturedArtists(
  currentSong?.featured_artists ??
  currentSong?.featuredArtists
);

  // ====================================================
  // PREVIOUS AND NEXT SONGS
  // ====================================================

  const previousSongData =
    currentIndex > 0
      ? queue[currentIndex - 1]
      : null;

  const nextSongData =
    currentIndex >= 0 && currentIndex < queue.length - 1
      ? queue[currentIndex + 1]
      : null;

 
  
// ====================================================
// CHANGE SONG WITH A SMOOTH CAROUSEL TRANSITION
// ====================================================
function changeSongWithTransition(direction) {
  if (songChangeLocked.current) return;

  if (direction === "next" && !nextSongData) return;
  if (direction === "previous" && !previousSongData) return;

  songChangeLocked.current = true;

  setIsDragging(false);

  setCarouselDirection(
    direction === "next" ? "slide-next" : "slide-previous"
  );

  songChangeTimer.current = window.setTimeout(() => {
    if (direction === "next") {
      nextSong();
    } else {
      previousSong();
    }

    setCarouselDirection("");
    songChangeLocked.current = false;
  }, 450);
}

// ====================================================
// NEXT AND PREVIOUS BUTTONS
// ====================================================

function handleNext() {
  changeSongWithTransition("next");
}

function handlePrevious() {
  changeSongWithTransition("previous");
}

// ====================================================
// POINTER DOWN - TOUCHSCREEN AND MOUSE
// ====================================================

function handleCarouselPointerDown(event) {
  if (songChangeLocked.current) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  dragRef.current = {
    pointerId: event.pointerId,
    startX: event.clientX,
    currentX: event.clientX,
    moved: false,
  };

  setIsDragging(true);

  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleCarouselPointerMove(event) {
  if (
    dragRef.current.pointerId !== event.pointerId ||
    songChangeLocked.current
  ) {
    return;
  }

  dragRef.current.currentX = event.clientX;

  if (
    Math.abs(event.clientX - dragRef.current.startX) > 5
  ) {
    dragRef.current.moved = true;
  }
}

function handleCarouselPointerUp(event) {
  if (dragRef.current.pointerId !== event.pointerId) return;

  const distance =
    event.clientX - dragRef.current.startX;

  const moved = dragRef.current.moved;

  dragRef.current.pointerId = null;
  setIsDragging(false);

  if (moved) {
    suppressCarouselClick.current = true;
  }

  if (distance < -55 && nextSongData) {
    changeSongWithTransition("next");
    return;
  }

  if (distance > 55 && previousSongData) {
    changeSongWithTransition("previous");
    return;
  }
}

function handleCarouselPointerCancel(event) {
  if (dragRef.current.pointerId !== event.pointerId) return;

  dragRef.current.pointerId = null;
  setIsDragging(false);
}

function handleCarouselClickCapture(event) {
  if (!suppressCarouselClick.current) return;

  event.preventDefault();
  event.stopPropagation();

  suppressCarouselClick.current = false;
}

  // ====================================================
  // CREATE A PLAYLIST ON THE BACKEND
  // ====================================================

  async function createPlaylist() {
    const name = playlistName.trim();

    if (!user) {
      redirectToLogin();
      return;
    }

    if (!name) {
      setPlaylistError("Please enter a playlist name.");
      return;
    }

    if (name.length > 150) {
      setPlaylistError(
        "Playlist names cannot exceed 150 characters."
      );
      return;
    }

    setCreatingPlaylist(true);
    setPlaylistError("");
    setPlaylistMessage("");

    try {
      // Create the playlist in the logged-in user's account.
      const result = await apiRequest("/playlists", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      // Refresh the list from the server.
      await loadPlaylists();

      setPlaylistName("");
      setCreatePlaylistOpen(false);

      // If the backend returns the newly created playlist,
      // add the currently playing song to it.
      const createdPlaylist =
        result.playlist ||
        result.data?.playlist ||
        null;

      if (createdPlaylist?.id && currentSong?.id) {
        await addSongToPlaylist(createdPlaylist.id);
      } else {
        setPlaylistMessage("Playlist created successfully.");
      }
    } catch (error) {
      console.error(
        "Cave Tunes: Playlist creation error:",
        error
      );

      setPlaylistError(
        error.message || "Unable to create playlist."
      );
    } finally {
      setCreatingPlaylist(false);
    }
  }

  // ====================================================
  // ADD CURRENT SONG TO AN EXISTING PLAYLIST
  // ====================================================

  async function addSongToPlaylist(playlistId) {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (!currentSong?.id) {
      setPlaylistError("There is no song currently playing.");
      return;
    }

    if (addingPlaylistId !== null) {
      return;
    }

    setAddingPlaylistId(playlistId);
    setPlaylistError("");
    setPlaylistMessage("");

    try {
      // This is the same endpoint used by Library.jsx.
      await apiRequest(`/playlists/${playlistId}/songs`, {
        method: "POST",
        body: JSON.stringify({
          songId: currentSong.id,
        }),
      });

      // Refresh playlist counts from the backend.
      await loadPlaylists();

      setPlaylistMessage(
        `"${currentSong.title || "Song"}" added to playlist.`
      );
    } catch (error) {
      console.error(
        "Cave Tunes: Add song to playlist error:",
        error
      );

      setPlaylistError(
        error.message || "Unable to add this song to the playlist."
      );
    } finally {
      setAddingPlaylistId(null);
    }
  }

  // ====================================================
  // VIEW CREATOR
  // ====================================================

  function handleViewCreator() {
    if (!currentSong) {
      return;
    }

    const creatorId =
      currentSong.user_id ||
      currentSong.creator_id ||
      currentSong.artist_id ||
      currentSong.userId;

    if (!creatorId) {
      console.warn(
        "Cave Tunes: No creator ID found.",
        currentSong
      );

      return;
    }

    const creatorRole =
      currentSong.role ||
      currentSong.creator_role ||
      currentSong.artist_role ||
      "artist";

    const creatorPath =
      `/creator/${creatorRole}/${creatorId}`;

    setFullPlayerOpen(false);

    window.setTimeout(() => {
      navigate(creatorPath);
    }, 250);
  }

  // ====================================================
  // CLOSE PLAYER WHEN NOT ACTIVE
  // ====================================================

  if (!fullPlayerOpen || !currentSong) {
    return null;
  }

  // ====================================================
  // PROGRESS
  // ====================================================

  const progress =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  // ====================================================
  // PAGE
  // ====================================================

  return (
 <div
  className="full-player"
  style={{
    "--background-image": `url(${currentSong.cover})`,
  }}
>
      {/* BACKGROUND */}

      <div className="full-player-background" />
      <div className="full-player-overlay" />

      {/* CLOSE */}

      <button
        type="button"
        className="close-player"
        onClick={() => setFullPlayerOpen(false)}
        aria-label="Close player"
      >
        <X size={26} />
      </button>

      {/* ==================================================
          3D COVER CAROUSEL
      ================================================== */}

<div
  className={`three-d-carousel ${carouselDirection} ${
    isDragging ? "is-dragging" : ""
  }`}
  onPointerDown={handleCarouselPointerDown}
  onPointerMove={handleCarouselPointerMove}
  onPointerUp={handleCarouselPointerUp}
  onPointerCancel={handleCarouselPointerCancel}
  onClickCapture={handleCarouselClickCapture}
>
        {/* PREVIOUS COVER */}

        <button
          type="button"
          className="three-d-card three-d-previous"
          onClick={handlePrevious}
          disabled={!previousSongData}
          aria-label="Previous song"
        >
          {previousSongData?.cover ? (
            <img
              src={previousSongData.cover}
              alt={previousSongData.title || "Previous song"}
            />
          ) : (
            <div className="empty-cover">
              <SkipBack size={28} />
            </div>
          )}
        </button>

        {/* CURRENT COVER */}

        <div className="three-d-card three-d-current">
          {currentSong.cover ? (
            <img
              src={currentSong.cover}
              alt={currentSong.title || "Current song"}
              className={
                isPlaying
                  ? "current-cover-image playing"
                  : "current-cover-image"
              }
            />
          ) : (
            <div className="empty-cover">
              <Play size={28} />
            </div>
          )}
        </div>

        {/* NEXT COVER */}

        <button
          type="button"
          className="three-d-card three-d-next"
          onClick={handleNext}
          disabled={!nextSongData}
          aria-label="Next song"
        >
          {nextSongData?.cover ? (
            <img
              src={nextSongData.cover}
              alt={nextSongData.title || "Next song"}
            />
          ) : (
            <div className="empty-cover">
              <SkipForward size={28} />
            </div>
          )}
        </button>
      </div>

     {/* ==================================================
    SONG / ADVERTISEMENT INFORMATION
================================================== */}

<div className="full-song-info">

  {isAdPlaying || adLoading ? (
    <div className="full-ad-info">

      <span className="full-ad-badge">
        ADVERTISEMENT
      </span>

      <h1>
        {adLoading
          ? "Loading advertisement..."
          : currentAd?.title || "Cave Tunes Advertisement"}
      </h1>

      <p>
        {currentAd?.description || "Sponsored audio"}
      </p>

    </div>
  ) : (
    <>
      <h1>{currentSong.title || "Untitled Song"}</h1>

     <div className="full-player-artist-line">

  <button
    type="button"
    className="artist-name-button"
    onClick={handleViewCreator}
  >
    <UserRound size={16} />
    {currentSong.artist || "Unknown Artist"}
  </button>

  {featuredArtists.length > 0 && (
    <span className="full-player-featured-artists">
      feat. {featuredArtists.join(", ")}
    </span>
  )}

</div>
    </>
  )}

</div>

      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="full-player-actions">
        <button
          type="button"
          className="player-action"
          onClick={handleViewCreator}
        >
          <UserRound size={19} />
          <span>View Creator</span>
        </button>

        <button
          type="button"
          className="player-action"
          onClick={openPlaylistModal}
        >
          <ListPlus size={19} />
          <span>Add to Playlist</span>
        </button>

        <button
          type="button"
          className={liked ? "player-action liked" : "player-action"}
          onClick={handleLike}
          disabled={likeLoading}
        >
          <Heart
            size={19}
            fill={liked ? "currentColor" : "none"}
          />

          <span>{liked ? "Liked" : "Like"}</span>

          <strong>{likeCount}</strong>
        </button>
      </div>

   {/* ==================================================
    MUSIC PROGRESS / ADVERTISEMENT STATUS
================================================== */}

{isAdPlaying || adLoading ? (

  <div className="full-ad-playing-status">

    <span className="full-ad-equalizer">
      <i></i>
      <i></i>
      <i></i>
      <i></i>
    </span>

    <span>
      {adLoading
        ? "Preparing advertisement..."
        : "Advertisement is playing"}
    </span>

  </div>

) : (

  <div className="full-progress-container">

    <div className="full-time-row">
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>

    <input
      className="full-progress-range"
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
    />

  </div>

)}

      {/* ==================================================
          CONTROLS
      ================================================== */}

      <div className="full-main-controls">
        <button
          type="button"
          className={isShuffle ? "active-control" : ""}
          onClick={toggleShuffle}
          aria-label="Toggle shuffle"
        >
          <Shuffle size={22} />
        </button>

        <button
          type="button"
          onClick={handlePrevious}
          aria-label="Previous song"
        >
          <SkipBack size={28} />
        </button>

        <button
          type="button"
          className="full-play"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
         {isPlaying || isAdPlaying ? (
  <Pause size={30} fill="currentColor" />
) : (
  <Play size={30} fill="currentColor" />
)}
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next song"
        >
          <SkipForward size={28} />
        </button>

        <button
          type="button"
          className={
            repeatMode !== "off"
              ? "active-control repeat-button"
              : "repeat-button"
          }
          onClick={toggleRepeat}
          aria-label="Toggle repeat"
        >
          <Repeat size={22} />

          {repeatMode === "one" && (
            <span className="repeat-number">1</span>
          )}

          {repeatMode === "all" && (
            <span className="repeat-infinity">∞</span>
          )}
        </button>
      </div>

      {/* ==================================================
          VOLUME
      ================================================== */}

      <div className="full-volume">
        <Volume2 size={20} />

        <input
          className="volume-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          style={{
            "--volume": `${volume * 100}%`,
          }}
          onChange={(event) =>
            changeVolume(Number(event.target.value))
          }
        />
      </div>

      {/* ==================================================
          DETAILS
      ================================================== */}

      <div className="full-player-details">
        <span>{currentSong.album || "Single"}</span>
        <span>{currentSong.genre || "Music"}</span>
        <span>{currentSong.country || "Cave Tunes"}</span>
      </div>


{/* ==================================================
    LYRICS
================================================== */}

{!isAdPlaying && !adLoading && (
  <section className="fp-lyrics-section">
    <div className="fp-section-heading">
      <h2>Lyrics</h2>
      <span>Sing along</span>
    </div>

    {lyricsData?.songId !== currentSong.id ? (
      <div className="fp-lyrics-empty">
        Loading lyrics...
      </div>
    ) : parsedLyrics.lines.length > 0 ? (
      <div
        className="fp-lyrics-container"
        ref={lyricsContainerRef}
      >
        {parsedLyrics.lines.map((line, index) => {
          const isActive =
            parsedLyrics.synced &&
            index === activeLyricIndex;

          return (
            <p
              key={`${line.time ?? "plain"}-${index}`}
              ref={isActive ? activeLyricRef : null}
              className={
                isActive
                  ? "fp-lyrics-line active"
                  : "fp-lyrics-line"
              }
            >
              {line.text}
            </p>
          );
        })}
      </div>
    ) : (
      <div className="fp-lyrics-empty">
        <p>Lyrics are not available for this song yet.</p>
      </div>
    )}
  </section>
)}

{/* ==================================================
    YOU MAY ALSO LIKE
================================================== */}

{!isAdPlaying && !adLoading && (
  <section className="fp-recommendations-section">
    <div className="fp-section-heading">
      <h2>You May Also Like</h2>
      <span>Discover more music</span>
    </div>

    {recommendationsData?.songId !== currentSong.id ? (
      <div className="fp-recommendations-empty">
        Finding music for you...
      </div>
    ) : recommendations.length > 0 ? (
      <div className="fp-recommendations-grid">
        {recommendations
          .filter(
            (song, index, songs) =>
              String(song.id) !== String(currentSong.id) &&
              songs.findIndex(
                (item) => String(item.id) === String(song.id)
              ) === index
          )
          .map((song) => {
            const recommendationQueue = [
              currentSong,
              ...recommendations.filter(
                (item, index, songs) =>
                  String(item.id) !== String(currentSong.id) &&
                  songs.findIndex(
                    (entry) =>
                      String(entry.id) === String(item.id)
                  ) === index
              ),
            ];

            return (
              <button
                type="button"
                key={song.id}
                className="fp-recommendation-card"
                onClick={() =>
                  playSong(song, recommendationQueue)
                }
              >
                <div className="fp-recommendation-cover">
  {getSongCover(song) ? (
    <img
      src={getSongCover(song)}
      alt={song.title || "Recommended song"}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <div className="fp-recommendation-no-cover">
      <Play size={24} />
    </div>
  )}

  <span className="fp-recommendation-play">
    <Play size={19} fill="currentColor" />
  </span>
</div>

                <div className="fp-recommendation-info">
                  <strong>
                    {song.title || "Untitled Song"}
                  </strong>

                  <span>
                    {song.artist_name ||
                      song.artist ||
                      "Unknown Artist"}
                  </span>

                  <small>
                    {song.genre || "Music"}
                    {song.owner_country
                      ? ` • ${song.owner_country}`
                      : ""}
                  </small>
                </div>
              </button>
            );
          })}
      </div>
    ) : (
      <div className="fp-recommendations-empty">
        No recommendations available right now.
      </div>
    )}
  </section>
)}


      {/* ==================================================
          PLAYLIST MODAL
      ================================================== */}

      {playlistOpen && (
        <div
          className="playlist-modal"
          onClick={() => setPlaylistOpen(false)}
        >
          <div
            className="playlist-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="playlist-modal-header">
              <div>
                <h2>Add to Playlist</h2>
                <p>
                  Save this song to one of your playlists.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPlaylistOpen(false)}
                aria-label="Close playlist modal"
              >
                <X size={22} />
              </button>
            </div>

            {/* CURRENT SONG */}

            <div className="playlist-current-song">
              <strong>
                {currentSong.title || "Untitled Song"}
              </strong>

              <span>
                {currentSong.artist || "Unknown Artist"}
              </span>
            </div>

            {/* CREATE PLAYLIST */}

            {!createPlaylistOpen && (
              <button
                type="button"
                className="create-playlist-button"
                onClick={() => {
                  setPlaylistError("");
                  setPlaylistMessage("");
                  setCreatePlaylistOpen(true);
                }}
              >
                <Plus size={20} />
                Create New Playlist
              </button>
            )}

            {createPlaylistOpen && (
              <form
                className="create-playlist-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  createPlaylist();
                }}
              >
                <input
                  type="text"
                  placeholder="Playlist name"
                  value={playlistName}
                  maxLength={150}
                  autoFocus
                  onChange={(event) =>
                    setPlaylistName(event.target.value)
                  }
                />

                <button
                  type="submit"
                  disabled={creatingPlaylist}
                >
                  {creatingPlaylist ? "Creating..." : "Create"}
                </button>

                <button
                  type="button"
                  className="cancel-playlist"
                  onClick={() => {
                    setCreatePlaylistOpen(false);
                    setPlaylistName("");
                    setPlaylistError("");
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* FEEDBACK */}

            {playlistError && (
              <div className="playlist-feedback playlist-feedback-error">
                <p>{playlistError}</p>

                {playlistError.toLowerCase().includes("session") && (
                  <button
                    type="button"
                    onClick={redirectToLogin}
                  >
                    Log in again
                  </button>
                )}
              </div>
            )}

            {playlistMessage && (
              <div className="playlist-feedback playlist-feedback-success">
                <p>{playlistMessage}</p>
              </div>
            )}

            {/* BACKEND PLAYLISTS */}

            <div className="playlist-list">
              {loadingPlaylists ? (
                <div className="empty-playlists">
                  <RefreshCw size={25} className="playlist-spinner" />
                  <p>Loading your playlists...</p>
                </div>
              ) : playlists.length > 0 ? (
                playlists.map((playlist) => {
                  const isAdding =
                    String(addingPlaylistId) ===
                    String(playlist.id);

                  return (
                    <button
                      type="button"
                      key={playlist.id}
                      className="playlist-item"
                      disabled={isAdding || addingPlaylistId !== null}
                      onClick={() =>
                        addSongToPlaylist(playlist.id)
                      }
                    >
                      <ListPlus size={20} />

                      <div>
                        <strong>{playlist.name}</strong>

                        <span>
                          {playlist.song_count || 0} songs
                        </span>
                      </div>

                      {isAdding ? (
                        <RefreshCw
                          size={19}
                          className="playlist-spinner"
                        />
                      ) : (
                        <Plus size={19} />
                      )}
                    </button>
                  );
                })
              ) : (
                !playlistError && (
                  <div className="empty-playlists">
                    <ListPlus size={28} />

                    <p>
                      You haven't created any playlists yet.
                    </p>

                    <span>
                      Create one above to save this song.
                    </span>
                  </div>
                )
              )}
            </div>

            {/* REFRESH AND DONE */}

            <div className="playlist-modal-footer">
              <button
                type="button"
                onClick={loadPlaylists}
                disabled={loadingPlaylists}
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setPlaylistOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FullPlayer;