// ======================================================
// CAVE TUNES
// MANAGE CATALOGUE
// src/pages/ManageCatalogue.jsx
// ======================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Check,
  Download,
  Edit3,
  Loader2,
  Music2,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

import {
  usePlayer,
} from "../context/usePlayer";

import "./ManageCatalogue.css";


// ======================================================
// API
// ======================================================

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;


// ======================================================
// TOKEN
// ======================================================

function getToken() {
  return localStorage.getItem("token");
}


// ======================================================
// MEDIA URL
// ======================================================

function getMediaUrl(url) {
  if (!url) {
    return "";
  }

  const value = String(url).trim();

  if (
    value.startsWith("http") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}


// ======================================================
// JSON READER
// ======================================================

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid server response.");
  }
}


// ======================================================
// NORMALIZE SONG
// ======================================================

function normalizeSong(song) {
  if (!song) {
    return null;
  }

  return {
    ...song,

    id: song.id,

    title:
      song.title ||
      song.song_title ||
      "Untitled",

    artist:
      song.artist_name ||
      "Unknown Artist",

    album_name:
      song.album_name ||
      "",

    cover: getMediaUrl(
      song.cover_url ||
      song.cover_image_url ||
      ""
    ),

    audioUrl: getMediaUrl(
      song.audio_url ||
      ""
    ),

    plays: Number(
      song.plays || 0
    ),

    downloads: Number(
      song.downloads || 0
    ),
  };
}


// ======================================================
// PAGE
// ======================================================

export default function ManageCatalogue() {

  const navigate = useNavigate();

  const {
    type,
    albumName,
    artistName,
  } = useParams();


  // ====================================================
  // PLAYER
  // ====================================================

  const {
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
  } = usePlayer();


  // ====================================================
  // STATE
  // ====================================================

  const [songs, setSongs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [deletingSongId, setDeletingSongId] =
    useState(null);


  // ====================================================
  // DECODE PARAMS
  // ====================================================

  const decodedAlbumName =
    useMemo(() => {
      return decodeURIComponent(
        albumName || ""
      );
    }, [albumName]);


  const decodedArtistName =
    useMemo(() => {
      return decodeURIComponent(
        artistName || ""
      );
    }, [artistName]);


  // ====================================================
  // LOAD SONGS
  // ====================================================

  const loadCatalogue =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError("");

          const token =
            getToken();

          if (!token) {
            throw new Error(
              "You must be logged in."
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/music/my-songs`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await readJson(response);

          if (!response.ok) {
            throw new Error(
              data.message ||
              "Unable to load catalogue."
            );
          }

          const list =
            data.songs ||
            data.data ||
            [];

          const normalized =
            list
              .map(normalizeSong)
              .filter(Boolean);

          const catalogue =
            normalized.filter(
              (song) => {

                const sameRelease =
                  String(
                    song.release_type || ""
                  ).toLowerCase() ===
                  String(type || "")
                    .toLowerCase();

                const sameAlbum =
                  String(
                    song.album_name || ""
                  ) ===
                  decodedAlbumName;

                const sameArtist =
                  String(
                    song.artist || ""
                  ) ===
                  decodedArtistName;

                return (
                  sameRelease &&
                  sameAlbum &&
                  sameArtist
                );
              }
            );

          setSongs(catalogue);

        } catch (err) {

          setError(
            err.message ||
            "Unable to load catalogue."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        type,
        decodedAlbumName,
        decodedArtistName,
      ]
    );


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    let cancelled = false;

    async function initialize() {

      try {

        await loadCatalogue();

      } catch (err) {

        if (!cancelled) {
          setError(
            err.message ||
            "Unable to load catalogue."
          );
        }

      }

    }

    initialize();

    return () => {
      cancelled = true;
    };

  }, [loadCatalogue]);


  // ====================================================
  // DELETE SONG
  // ====================================================

  async function handleDeleteSong(song) {

    const confirmed =
      window.confirm(
        `Delete "${song.title}" from this catalogue?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setDeletingSongId(song.id);
      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          `${API_BASE_URL}/api/music/${song.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${getToken()}`,
            },
          }
        );

      const data =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Unable to delete song."
        );
      }

      setSongs(
        (previousSongs) =>
          previousSongs.filter(
            (item) =>
              item.id !== song.id
          )
      );

      setSuccessMessage(
        "Track removed successfully."
      );

    } catch (err) {

      setError(
        err.message ||
        "Unable to delete track."
      );

    } finally {

      setDeletingSongId(null);

    }

  }


  // ====================================================
  // TOTALS
  // ====================================================

  const totalPlays =
    songs.reduce(
      (total, song) =>
        total + song.plays,
      0
    );


  const totalDownloads =
    songs.reduce(
      (total, song) =>
        total + song.downloads,
      0
    );


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {

    return (
      <main className="page manage-catalogue-page">

        <div className="manage-catalogue-loading">

          <Loader2
            size={30}
            className="loading-spinner"
          />

          <span>
            Loading catalogue...
          </span>

        </div>

      </main>
    );

  }


  // ====================================================
  // PAGE
  // ====================================================

  return (

    <main className="page manage-catalogue-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="manage-catalogue-header">

        <button
          type="button"
          className="manage-catalogue-back"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft size={18} />

          Back to Profile
        </button>


        <div className="manage-catalogue-heading">

          <div className="manage-catalogue-cover">

            {songs[0]?.cover ? (

              <img
                src={songs[0].cover}
                alt={decodedAlbumName}
              />

            ) : (

              <Music2 size={42} />

            )}

          </div>


          <div>

            <div className="manage-catalogue-type">

              {type === "ep"
                ? "EP"
                : "ALBUM"}

            </div>

            <h1>
              {decodedAlbumName}
            </h1>

            <p>
              {decodedArtistName}
            </p>

          </div>

        </div>

      </header>


      {/* ==================================================
          MESSAGES
      ================================================== */}

      {successMessage && (

        <div className="catalogue-success">

          <Check size={17} />

          {successMessage}

        </div>

      )}


      {error && (

        <div className="error-message">

          {error}

        </div>

      )}


      {/* ==================================================
          STATS
      ================================================== */}

      <section className="catalogue-stats">

        <div className="catalogue-stat">

          <Music2 size={20} />

          <strong>
            {songs.length}
          </strong>

          <span>
            Tracks
          </span>

        </div>


        <div className="catalogue-stat">

          <Play size={20} />

          <strong>
            {totalPlays}
          </strong>

          <span>
            Plays
          </span>

        </div>


        <div className="catalogue-stat">

          <Download size={20} />

          <strong>
            {totalDownloads}
          </strong>

          <span>
            Downloads
          </span>

        </div>

      </section>


      {/* ==================================================
          MANAGEMENT
      ================================================== */}

      <section className="catalogue-management">

        <div className="catalogue-management-header">

          <div>

            <h2>
              Manage Catalogue
            </h2>

            <p>
              Manage the tracks included in this{" "}
              {type === "ep"
                ? "EP"
                : "album"}.
            </p>

          </div>


          <button
            type="button"
            className="edit-catalogue-button"
            onClick={() => {
              // Future metadata editor
            }}
          >

            <Edit3 size={17} />

            Edit Catalogue

          </button>

        </div>


        {/* ==================================================
            TRACKS
        ================================================== */}

        {songs.length === 0 ? (

          <div className="empty-catalogue">

            <Music2 size={38} />

            <h3>
              No tracks found
            </h3>

            <p>
              This catalogue currently has no tracks.
            </p>

          </div>

        ) : (

          <div className="catalogue-track-list">

            {songs.map(
              (song, index) => {

                const active =
                  currentSong?.id ===
                  song.id;

                const playing =
                  active &&
                  isPlaying;

                const deleting =
                  deletingSongId ===
                  song.id;

                return (

                  <article
                    key={song.id}
                    className={
                      active
                        ? "catalogue-track active"
                        : "catalogue-track"
                    }
                  >

                    <div className="catalogue-track-number">

                      {index + 1}

                    </div>


                    <div className="catalogue-track-cover">

                      {song.cover ? (

                        <img
                          src={song.cover}
                          alt={song.title}
                        />

                      ) : (

                        <Music2 size={20} />

                      )}

                    </div>


                    <div className="catalogue-track-info">

                      <strong>
                        {song.title}
                      </strong>

                      <span>
                        {song.artist}
                      </span>

                    </div>


                    <div className="catalogue-track-stats">

                      <span>
                        <Play size={13} />
                        {song.plays}
                      </span>

                      <span>
                        <Download size={13} />
                        {song.downloads}
                      </span>

                    </div>


                    <div className="catalogue-track-actions">

                      <button
                        type="button"
                        onClick={() => {

                          if (playing) {
                            pauseSong();
                          } else {
                            playSong(
                              song,
                              songs
                            );
                          }

                        }}
                        aria-label={
                          playing
                            ? "Pause"
                            : "Play"
                        }
                      >

                        {playing ? (
                          <Pause size={17} />
                        ) : (
                          <Play size={17} />
                        )}

                      </button>


                      <button
                        type="button"
                        aria-label="Edit track"
                        onClick={() => {
                          // Future track editor
                        }}
                      >

                        <Edit3 size={17} />

                      </button>


                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() =>
                          handleDeleteSong(
                            song
                          )
                        }
                        aria-label="Delete track"
                      >

                        {deleting ? (
                          <Loader2
                            size={17}
                            className="loading-spinner"
                          />
                        ) : (
                          <Trash2
                            size={17}
                          />
                        )}

                      </button>

                    </div>

                  </article>

                );

              }
            )}

          </div>

        )}

      </section>

    </main>
  );
}