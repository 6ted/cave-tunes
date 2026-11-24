
import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Heart,
  ListMusic,
  Music2,
  Plus,
  Play,
  Trash2,
  X,
  RefreshCw,
  Search,
} from "lucide-react";

import { usePlayer } from "../context/usePlayer";
import "./Library.css";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://api.cavetunes.site");

// =====================================================
// MEDIA URL HELPER
// =====================================================

function getMediaUrl(value) {
  if (!value) return "";

  const url = String(value).trim();

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// =====================================================
// NORMALIZE SONG DATA
// =====================================================

function normalizeSong(song) {
  if (!song) return null;

  return {
    ...song,
    id: song.id,
    title: song.title || song.song_title || "Untitled Song",
    artist: song.artist || song.artist_name || "Unknown Artist",
    cover: getMediaUrl(
      song.cover ||
        song.cover_url ||
        song.cover_image_url ||
        song.cover_file_url ||
        song.cover_image
    ),
    audioUrl: getMediaUrl(
      song.audioUrl ||
        song.audio_url ||
        song.audio_file_url ||
        song.audioFileUrl ||
        song.audio_file
    ),
  };
}

// =====================================================
// LIBRARY COMPONENT
// =====================================================

function Library() {
  const {
    playSong: playGlobalSong,
    setFullPlayerOpen,
    currentSong,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState("recent");

  const [recentSongs, setRecentSongs] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [allSongs, setAllSongs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [addingSongId, setAddingSongId] = useState(null);

  // ===================================================
  // AUTHENTICATION HEADERS
  // ===================================================

  const getAuthHeaders = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // ===================================================
  // API REQUEST HELPER
  // ===================================================

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
        throw new Error("Please log in to access your Library.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Something went wrong.");
      }

      return data;
    },
    [getAuthHeaders]
  );

  // ===================================================
  // LOAD LIBRARY DATA
  // ===================================================

  const loadLibrary = useCallback(async () => {
    try {
      const [recentResult, likedResult, playlistResult] =
        await Promise.all([
          apiRequest("/recently-played"),
          apiRequest("/liked-songs"),
          apiRequest("/playlists"),
        ]);

      setRecentSongs(
        (recentResult.songs || [])
          .map(normalizeSong)
          .filter(Boolean)
      );

      setLikedSongs(
        (likedResult.songs || [])
          .map(normalizeSong)
          .filter(Boolean)
      );

      setPlaylists(playlistResult.playlists || []);

      setError("");
    } catch (err) {
      console.error("Library loading error:", err);

      setError(err.message || "Unable to load your Library.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // ===================================================
  // INITIAL LOAD
  // Avoid synchronously setting state inside the effect.
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    const fetchLibrary = async () => {
      try {
        const [recentResult, likedResult, playlistResult] =
          await Promise.all([
            apiRequest("/recently-played"),
            apiRequest("/liked-songs"),
            apiRequest("/playlists"),
          ]);

        if (cancelled) return;

        setRecentSongs(
          (recentResult.songs || [])
            .map(normalizeSong)
            .filter(Boolean)
        );

        setLikedSongs(
          (likedResult.songs || [])
            .map(normalizeSong)
            .filter(Boolean)
        );

        setPlaylists(playlistResult.playlists || []);
        setError("");
      } catch (err) {
        if (!cancelled) {
          console.error("Library loading error:", err);
          setError(err.message || "Unable to load your Library.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLibrary();

    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  // ===================================================
  // REFRESH HISTORY WHEN THE CURRENT SONG CHANGES
  // ===================================================

  useEffect(() => {
    if (!currentSong?.id) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;

      try {
        const [recentResult, likedResult, playlistResult] =
          await Promise.all([
            apiRequest("/recently-played"),
            apiRequest("/liked-songs"),
            apiRequest("/playlists"),
          ]);

        if (cancelled) return;

        setRecentSongs(
          (recentResult.songs || [])
            .map(normalizeSong)
            .filter(Boolean)
        );

        setLikedSongs(
          (likedResult.songs || [])
            .map(normalizeSong)
            .filter(Boolean)
        );

        setPlaylists(playlistResult.playlists || []);
      } catch (err) {
        if (!cancelled) {
          console.error("Library refresh error:", err);
        }
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentSong?.id, apiRequest]);

  // ===================================================
  // REFRESH BUTTON
  // ===================================================

  const handleRefresh = async () => {
    setLoading(true);
    await loadLibrary();
  };

  // ===================================================
  // LOAD AVAILABLE SONGS
  // ===================================================

  const loadAllSongs = async () => {
    try {
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/api/music`);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load available songs."
        );
      }

      setAllSongs(
        (data.songs || [])
          .map(normalizeSong)
          .filter(Boolean)
      );
    } catch (err) {
      console.error("Song search error:", err);
      setMessage(err.message || "Unable to load songs.");
    }
  };

  // ===================================================
  // PLAY SONG THROUGH THE GLOBAL PLAYER
  // ===================================================

  const playLibrarySong = async (song, songs = [song]) => {
    if (!song) return;

    try {
      setMessage("");

      const result = playGlobalSong(song, songs);

      setFullPlayerOpen(true);

      await result;
    } catch (err) {
      console.error("Unable to play library song:", err);
      setMessage("Unable to play this song. Please try again.");
    }
  };

  // ===================================================
  // CREATE PLAYLIST
  // ===================================================

  const createPlaylist = async (event) => {
    event.preventDefault();

    const name = playlistName.trim();

    if (!name) {
      setMessage("Please enter a playlist name.");
      return;
    }

    setCreatingPlaylist(true);
    setMessage("");

    try {
      await apiRequest("/playlists", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      setPlaylistName("");
      setShowCreateModal(false);

      await loadLibrary();

      setMessage("Playlist created successfully.");
    } catch (err) {
      setMessage(err.message || "Unable to create playlist.");
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // ===================================================
  // OPEN PLAYLIST
  // ===================================================

  const openPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistSongs([]);
    setLoadingPlaylist(true);
    setMessage("");

    try {
      const data = await apiRequest(
        `/playlists/${playlist.id}/songs`
      );

      setPlaylistSongs(
        (data.songs || [])
          .map(normalizeSong)
          .filter(Boolean)
      );
    } catch (err) {
      setMessage(err.message || "Unable to open playlist.");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // ===================================================
  // DELETE PLAYLIST
  // ===================================================

  const deletePlaylist = async (playlist) => {
    const confirmed = window.confirm(
      `Delete the playlist "${playlist.name}"?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
      await apiRequest(`/playlists/${playlist.id}`, {
        method: "DELETE",
      });

      if (String(selectedPlaylist?.id) === String(playlist.id)) {
        setSelectedPlaylist(null);
        setPlaylistSongs([]);
      }

      await loadLibrary();

      setMessage("Playlist deleted successfully.");
    } catch (err) {
      setMessage(err.message || "Unable to delete playlist.");
    }
  };

  // ===================================================
  // OPEN ADD SONGS MODAL
  // ===================================================

  const openAddSongs = async () => {
    setShowAddSongsModal(true);
    setSongSearch("");
    await loadAllSongs();
  };

  // ===================================================
  // ADD SONG TO PLAYLIST
  // ===================================================

  const addSongToPlaylist = async (song) => {
    if (!selectedPlaylist || !song) return;

    setAddingSongId(song.id);
    setMessage("");

    try {
      await apiRequest(
        `/playlists/${selectedPlaylist.id}/songs`,
        {
          method: "POST",
          body: JSON.stringify({
            songId: song.id,
          }),
        }
      );

      const data = await apiRequest(
        `/playlists/${selectedPlaylist.id}/songs`
      );

      setPlaylistSongs(
        (data.songs || [])
          .map(normalizeSong)
          .filter(Boolean)
      );

      await loadLibrary();

      setMessage("Song added to playlist.");
    } catch (err) {
      setMessage(err.message || "Unable to add song.");
    } finally {
      setAddingSongId(null);
    }
  };

  // ===================================================
  // REMOVE SONG FROM PLAYLIST
  // ===================================================

  const removeSongFromPlaylist = async (song) => {
    if (!selectedPlaylist || !song) return;

    try {
      await apiRequest(
        `/playlists/${selectedPlaylist.id}/songs/${song.id}`,
        {
          method: "DELETE",
        }
      );

      setPlaylistSongs((current) =>
        current.filter(
          (item) => String(item.id) !== String(song.id)
        )
      );

      await loadLibrary();

      setMessage("Song removed from playlist.");
    } catch (err) {
      setMessage(err.message || "Unable to remove song.");
    }
  };

  // ===================================================
  // CURRENT SONG LIST
  // ===================================================

  const currentSongs =
    activeTab === "recent"
      ? recentSongs
      : activeTab === "liked"
        ? likedSongs
        : [];

  const filteredAvailableSongs = allSongs.filter((song) => {
    const query = songSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      String(song.title || "").toLowerCase().includes(query) ||
      String(song.artist || "").toLowerCase().includes(query)
    );
  });

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading) {
    return (
      <main className="library-page">
        <div className="library-loading">
          <RefreshCw className="library-spinner" size={28} />
          <h2>Loading your Library...</h2>
          <p>Getting your music ready.</p>
        </div>
      </main>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main className="library-page">
      <div className="library-container">
        {/* HEADER */}

        <header className="library-header">
          <div>
            <span className="library-eyebrow">CAVE TUNES</span>

            <h1>Your Library</h1>

            <p>
              Your music, playlists and favorites, all in one place.
            </p>
          </div>

          <button
            type="button"
            className="library-refresh-button"
            onClick={handleRefresh}
            title="Refresh Library"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {/* MESSAGES */}

        {error && (
          <div className="library-alert library-alert-error">
            <p>{error}</p>

            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        )}

        {message && (
          <div className="library-alert library-alert-message">
            <span>{message}</span>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <section className="library-summary">
          <button
            type="button"
            className={`library-summary-card ${
              activeTab === "recent" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("recent");
              setSelectedPlaylist(null);
            }}
          >
            <span className="library-summary-icon">
              <Clock3 size={22} />
            </span>

            <span className="library-summary-text">
              <strong>Recently Played</strong>
              <small>{recentSongs.length} songs</small>
            </span>
          </button>

          <button
            type="button"
            className={`library-summary-card ${
              activeTab === "liked" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("liked");
              setSelectedPlaylist(null);
            }}
          >
            <span className="library-summary-icon">
              <Heart size={22} />
            </span>

            <span className="library-summary-text">
              <strong>Liked Songs</strong>
              <small>{likedSongs.length} songs</small>
            </span>
          </button>

          <button
            type="button"
            className={`library-summary-card ${
              activeTab === "playlists" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("playlists");
              setSelectedPlaylist(null);
            }}
          >
            <span className="library-summary-icon">
              <ListMusic size={22} />
            </span>

            <span className="library-summary-text">
              <strong>My Playlists</strong>
              <small>{playlists.length} playlists</small>
            </span>
          </button>
        </section>

        {/* PLAYLIST DETAIL */}

        {selectedPlaylist ? (
          <section className="library-section">
            <div className="library-section-header">
              <div>
                <button
                  type="button"
                  className="library-back-button"
                  onClick={() => setSelectedPlaylist(null)}
                >
                  ← All playlists
                </button>

                <h2>{selectedPlaylist.name}</h2>

                <p>
                  {playlistSongs.length} songs in this playlist
                </p>
              </div>

              <button
                type="button"
                className="library-primary-button"
                onClick={openAddSongs}
              >
                <Plus size={18} />
                Add Songs
              </button>
            </div>

            {loadingPlaylist ? (
              <div className="library-empty">
                Loading playlist...
              </div>
            ) : playlistSongs.length === 0 ? (
              <div className="library-empty">
                <Music2 size={38} />

                <h3>This playlist is empty</h3>

                <p>Add songs to start building your playlist.</p>

                <button
                  type="button"
                  className="library-primary-button"
                  onClick={openAddSongs}
                >
                  <Plus size={18} />
                  Add Songs
                </button>
              </div>
            ) : (
              <div className="library-song-list">
                {playlistSongs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    onPlay={() =>
                      playLibrarySong(song, playlistSongs)
                    }
                    action={
                      <button
                        type="button"
                        className="library-icon-button danger"
                        title="Remove from playlist"
                        onClick={() => removeSongFromPlaylist(song)}
                      >
                        <Trash2 size={17} />
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ) : activeTab === "playlists" ? (
          /* PLAYLISTS */

          <section className="library-section">
            <div className="library-section-header">
              <div>
                <h2>My Playlists</h2>
                <p>Collections you've created.</p>
              </div>

              <button
                type="button"
                className="library-primary-button"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} />
                Create Playlist
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="library-empty">
                <ListMusic size={42} />

                <h3>Your playlists start here</h3>

                <p>
                  Create a playlist for your favorite songs, moods or
                  moments.
                </p>

                <button
                  type="button"
                  className="library-primary-button"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={18} />
                  Create Your First Playlist
                </button>
              </div>
            ) : (
              <div className="library-playlist-grid">
                {playlists.map((playlist) => (
                  <article
                    className="library-playlist-card"
                    key={playlist.id}
                  >
                    <button
                      type="button"
                      className="library-playlist-open"
                      onClick={() => openPlaylist(playlist)}
                    >
                      <div className="library-playlist-art">
                        <ListMusic size={40} />
                      </div>

                      <h3>{playlist.name}</h3>

                      <p>
                        {Number(playlist.song_count || 0)} songs
                      </p>
                    </button>

                    <button
                      type="button"
                      className="library-icon-button danger"
                      title="Delete playlist"
                      onClick={() => deletePlaylist(playlist)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* RECENTLY PLAYED AND LIKED SONGS */

          <section className="library-section">
            <div className="library-section-header">
              <div>
                <h2>
                  {activeTab === "recent"
                    ? "Recently Played"
                    : "Liked Songs"}
                </h2>

                <p>
                  {activeTab === "recent"
                    ? "Pick up where you left off."
                    : "The songs you've added to your favorites."}
                </p>
              </div>
            </div>

            {currentSongs.length === 0 ? (
              <div className="library-empty">
                {activeTab === "recent" ? (
                  <Clock3 size={42} />
                ) : (
                  <Heart size={42} />
                )}

                <h3>
                  {activeTab === "recent"
                    ? "Nothing here yet"
                    : "No liked songs yet"}
                </h3>

                <p>
                  {activeTab === "recent"
                    ? "Songs you listen to while logged in will appear here."
                    : "Like songs while exploring Cave Tunes and they'll appear here."}
                </p>
              </div>
            ) : (
              <div className="library-song-list">
                {currentSongs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    onPlay={() =>
                      playLibrarySong(song, currentSongs)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* CREATE PLAYLIST MODAL */}

        {showCreateModal && (
          <div
            className="library-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowCreateModal(false);
              }
            }}
          >
            <section
              className="library-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-playlist-title"
            >
              <div className="library-modal-header">
                <div>
                  <span className="library-eyebrow">
                    YOUR COLLECTION
                  </span>

                  <h2 id="create-playlist-title">
                    Create Playlist
                  </h2>
                </div>

                <button
                  type="button"
                  className="library-icon-button"
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={createPlaylist}>
                <label htmlFor="library-playlist-name">
                  Playlist name
                </label>

                <input
                  id="library-playlist-name"
                  type="text"
                  maxLength={150}
                  placeholder="e.g. My Favourite Malawi Music"
                  value={playlistName}
                  onChange={(event) =>
                    setPlaylistName(event.target.value)
                  }
                  autoFocus
                />

                <div className="library-modal-actions">
                  <button
                    type="button"
                    className="library-secondary-button"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="library-primary-button"
                    disabled={creatingPlaylist}
                  >
                    {creatingPlaylist
                      ? "Creating..."
                      : "Create Playlist"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ADD SONGS MODAL */}

        {showAddSongsModal && (
          <div
            className="library-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowAddSongsModal(false);
              }
            }}
          >
            <section
              className="library-modal library-add-songs-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-songs-title"
            >
              <div className="library-modal-header">
                <div>
                  <span className="library-eyebrow">
                    {selectedPlaylist?.name}
                  </span>

                  <h2 id="add-songs-title">Add Songs</h2>
                </div>

                <button
                  type="button"
                  className="library-icon-button"
                  onClick={() => setShowAddSongsModal(false)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="library-search">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search songs or artists..."
                  value={songSearch}
                  onChange={(event) =>
                    setSongSearch(event.target.value)
                  }
                />
              </div>

              <div className="library-available-songs">
                {filteredAvailableSongs.length === 0 ? (
                  <p className="library-modal-empty">
                    No songs found.
                  </p>
                ) : (
                  filteredAvailableSongs.map((song) => {
                    const alreadyAdded = playlistSongs.some(
                      (item) =>
                        String(item.id) === String(song.id)
                    );

                    return (
                      <SongRow
                        key={song.id}
                        song={song}
                        onPlay={() =>
                          playLibrarySong(song, [song])
                        }
                        action={
                          <button
                            type="button"
                            className="library-add-song-button"
                            disabled={
                              alreadyAdded ||
                              addingSongId === song.id
                            }
                            onClick={() => addSongToPlaylist(song)}
                          >
                            {alreadyAdded
                              ? "Added"
                              : addingSongId === song.id
                                ? "Adding..."
                                : "Add"}
                          </button>
                        }
                      />
                    );
                  })
                )}
              </div>

              <div className="library-modal-actions">
                <button
                  type="button"
                  className="library-primary-button"
                  onClick={() => setShowAddSongsModal(false)}
                >
                  Done
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

// =====================================================
// SONG ROW
// =====================================================

function SongRow({ song, index, onPlay, action }) {
  return (
    <article className="library-song-row">
      <span className="library-song-number">
        {typeof index === "number" ? index + 1 : ""}
      </span>

      <button
        type="button"
        className="library-song-cover"
        onClick={onPlay}
        aria-label={`Play ${song.title}`}
      >
        {song.cover ? (
          <img src={song.cover} alt="" loading="lazy" />
        ) : (
          <Music2 size={22} />
        )}

        <span className="library-song-cover-play">
          <Play size={15} fill="currentColor" />
        </span>
      </button>

      <button
        type="button"
        className="library-song-details"
        onClick={onPlay}
      >
        <strong>{song.title}</strong>
        <span>{song.artist}</span>
      </button>

      <div className="library-song-row-action">
        {action}
      </div>
    </article>
  );
}

export default Library;

