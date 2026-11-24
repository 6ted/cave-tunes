import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
Play,
Pause,
Shuffle,
Music2,
Headphones,
Download,
Loader2,
} from "lucide-react";

import {
getSongs,
getMediaUrl,
downloadSongFile,
} from "../services/api";

import { usePlayer } from "../context/usePlayer";

import "./Album.css";

// ======================================================
// NORMALIZE SONG
// ======================================================
function normalizeSong(song) {

  return {

    ...song,

    id: song.id,

    title:
      song.title ||
      "Untitled Song",

    artist:
      song.artist_name ||
      song.artist ||
      "Unknown Artist",

    featuredArtists:
      Array.isArray(song.featured_artists)
        ? song.featured_artists
        : typeof song.featured_artists === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(song.featured_artists);

                return Array.isArray(parsed)
                  ? parsed
                  : [];
              } catch {
                return [];
              }
            })()
          : [],

    album:
      song.album_name ||
      "Single",

    cover:
      getMediaUrl(
        song.cover_url ||
        song.cover_file_url ||
        ""
      ),

    audioUrl:
      getMediaUrl(
        song.audio_url ||
        song.audio_file_url ||
        ""
      ),

    plays:
      Number(song.plays ?? 0),

    downloads:
      Number(song.downloads ?? 0),

  };

}
// ======================================================
// ALBUM
// ======================================================

function Album() {

const { albumName, artistName } = useParams();

const navigate = useNavigate();

const {
  playSong,
  currentSong,
  isPlaying,
  setFullPlayerOpen,
} = usePlayer();

// ==================================================
// STATE
// ==================================================

const [songs, setSongs] = useState([]);

const [loading, setLoading] = useState(true);

const [downloadingId, setDownloadingId] = useState(null);

const [showCoverPreview, setShowCoverPreview] = useState(false);
// ==================================================
// FETCH ALBUM
// ==================================================

useEffect(() => {

let cancelled = false;

async function fetchAlbum() {

  try {

    setLoading(true);

    const response = await getSongs();

    const list = Array.isArray(response)
      ? response
      : response?.songs || [];

    const album = decodeURIComponent(
      albumName || ""
    ).trim().toLowerCase();

    const artist = decodeURIComponent(
      artistName || ""
    ).trim().toLowerCase();

    const result = list

      .filter((song) => {

        const songAlbum = String(
          song.album_name || ""
        ).trim().toLowerCase();

        const songArtist = String(
          song.artist_name ||
          song.artist ||
          ""
        ).trim().toLowerCase();

        return (
          songAlbum === album &&
          songArtist === artist
        );

      })

      .map(normalizeSong);


    if (!cancelled) {

      setSongs(result);

    }

  } catch (error) {

    console.error(
      "Album error:",
      error
    );

  } finally {

    if (!cancelled) {

      setLoading(false);

    }

  }

}

fetchAlbum();

return () => {

  cancelled = true;

};

}, [albumName, artistName]);


// ==================================================
// OPEN FULL PLAYER AND PLAY SELECTED SONG
// ==================================================

function handleSongClick(song) {

  playSong(song, songs);

  setFullPlayerOpen(true);

}

// ==================================================
// CONTROLS
// ==================================================

function playAlbum() {

if (songs.length) {

  playSong(
    songs[0],
    songs
  );

}

}

function shuffleAlbum() {

if (!songs.length) return;

const random = [...songs].sort(
  () => Math.random() - 0.5
);

playSong(
  random[0],
  random
);

}

// ==================================================
// DOWNLOAD SONG
// ACTIVE SUBSCRIPTION REQUIRED
// ==================================================

async function handleDownload(song) {

if (!song?.id || downloadingId !== null) {
  return;
}


// Check authentication.

const token =
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");


if (!token) {

  navigate(
    `/login?redirect=${encodeURIComponent(
      window.location.pathname
    )}`
  );

  return;

}


try {

  setDownloadingId(song.id);


  // Request protected MP3 download.
  // Backend verifies the subscription.

  const result =
    await downloadSongFile(song.id);


  if (
    !result?.blob ||
    result.blob.size === 0
  ) {

    throw new Error(
      "The downloaded audio file is empty."
    );

  }


  // Update download count.

  setSongs(previousSongs =>

    previousSongs.map(item => {

      if (
        String(item.id) !==
        String(song.id)
      ) {

        return item;

      }

      let newDownloadCount =
        Number(item.downloads) || 0;


      if (
        result.downloadsCount !== null &&
        result.downloadsCount !== undefined
      ) {

        newDownloadCount =
          Number(result.downloadsCount);

      } else if (
        result.downloadCounted
      ) {

        newDownloadCount += 1;

      }


      return {

        ...item,

        downloads: newDownloadCount,

      };

    })

  );


  // Create temporary download URL.

  const blobUrl =
    window.URL.createObjectURL(
      result.blob
    );


  // Create download link.

  const link =
    document.createElement("a");

  link.href =
    blobUrl;

  link.download =
    result.filename ||
    `${song.title || "song"}.mp3`;

  link.style.display =
    "none";

  document.body.appendChild(link);


  // Start download.

  link.click();


  // Clean up.

  document.body.removeChild(link);

  setTimeout(() => {

    window.URL.revokeObjectURL(
      blobUrl
    );

  }, 1000);


} catch (error) {

  console.error(
    "Download error:",
    error
  );

  alert(
    error.message ||
    "Unable to download song. An active Cave Tunes subscription may be required."
  );

} finally {

  setDownloadingId(null);

}

}

// ==================================================
// RENDER STATES
// ==================================================

if (loading) {

return (

  <div className="album-page-loading">

    <Loader2
      size={30}
      className="album-loading-spinner"
    />

    <p>
      Loading album...
    </p>

  </div>

);

}

if (!songs.length) {

return (

  <div className="album-page-empty">

    <Music2 size={45} />

    <h2>
      Album not found
    </h2>

    <p>
      No songs were found for this release.
    </p>

  </div>

);

}

// ==================================================
// ALBUM DATA
// ==================================================

const album = songs[0];

const totalPlays = songs.reduce(
(total, song) =>
total + Number(song.plays || 0),
0
);

const totalDownloads = songs.reduce(
(total, song) =>
total + Number(song.downloads || 0),
0
);

// ==================================================
// PAGE
// ==================================================

return (

<div
  className="album-page"
  style={{
    "--album-background": `url(${album.cover})`
  }}
>

  {/* ALBUM HEADER */}

  <div className="album-header">

    <div
  className="album-cover"
  onClick={() => {
    if (album.cover) {
      setShowCoverPreview(true);
    }
  }}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      album.cover
    ) {
      e.preventDefault();
      setShowCoverPreview(true);
    }
  }}
  title="Preview album artwork"
>
  {album.cover ? (
    <img
      src={album.cover}
      alt={album.album}
    />
  ) : (
    <Music2 size={80} />
  )}
</div>


    <div className="album-info">

      <p className="album-type">

        {album.release_type || "Album"}

      </p>


      <h1>
        {album.album || album.title}
      </h1>


    <p className="album-artist">

  {album.artist}

  {album.featuredArtists?.length > 0 && (
    <span className="album-featured-artists">
      {" "}feat. {album.featuredArtists.join(", ")}
    </span>
  )}

</p>


      {/* ALBUM STATS */}

      <div className="album-stats">

        <span>

          <Headphones size={16} />

          {totalPlays.toLocaleString()} Plays

        </span>


        <span>

          <Download size={16} />

          {totalDownloads.toLocaleString()} Downloads

        </span>

      </div>


      {/* CONTROLS */}

      <div className="album-controls">

        <button
          onClick={playAlbum}
          className="album-play-button"
        >

          <Play
            size={18}
            fill="currentColor"
          />

          Play

        </button>


        <button
          onClick={shuffleAlbum}
          className="album-shuffle-button"
        >

          <Shuffle size={18} />

          Shuffle

        </button>

      </div>

    </div>

  </div>


  {/* TRACK LIST */}

  <div className="album-track-list">

    {songs.map((song, index) => {

      const active =
        String(currentSong?.id) ===
        String(song.id);

      const downloading =
        String(downloadingId) ===
        String(song.id);


      return (

   <div
  key={song.id}
  className={
    active
      ? "album-song active"
      : "album-song"
  }
  onClick={() => handleSongClick(song)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSongClick(song);
    }
  }}
>

          {/* TRACK NUMBER */}

          <div className="album-track-number">

            {index + 1}

          </div>


          {/* COVER */}

          <img
            src={song.cover}
            alt={song.title}
            className="album-song-cover"
          />


          {/* SONG INFO & STATS */}

          <div className="album-song-info">

            <div className="album-song-title">

              {song.title}

            </div>


      <div className="album-song-artist">

  {song.artist}

  {song.featuredArtists?.length > 0 && (
    <span className="album-track-featured-artists">
      {" "}feat. {song.featuredArtists.join(", ")}
    </span>
  )}

</div>


            <div className="album-song-stats">

              <span>

                <Headphones size={13} />

                {Number(
                  song.plays ?? 0
                ).toLocaleString()}

              </span>


              <span>

                <Download size={13} />

                {Number(
                  song.downloads ?? 0
                ).toLocaleString()}

              </span>

            </div>

          </div>


          {/* PLAY BUTTON */}

          <button
            type="button"
            className="album-song-play"

          onClick={(e) => {
  e.stopPropagation();

  if (active && isPlaying) {
    // Keep your existing player pause behaviour here
    playSong(song, songs);
  } else {
    handleSongClick(song);
  }
}}

            aria-label={
              active && isPlaying
                ? "Pause song"
                : "Play song"
            }
          >

            {active && isPlaying ? (

              <Pause
                size={18}
                fill="currentColor"
              />

            ) : (

              <Play
                size={18}
                fill="currentColor"
              />

            )}

          </button>


          {/* PROTECTED DOWNLOAD BUTTON */}

          <button
            type="button"

            className="album-song-download"

            onClick={(e) => {

              e.stopPropagation();

              handleDownload(song);

            }}

            disabled={
              downloadingId !== null
            }

            aria-label={
              downloading
                ? "Downloading"
                : "Download song"
            }

            title="Download requires an active Cave Tunes subscription"
          >

            {downloading ? (

              <Loader2
                size={18}
                className="album-loading-spinner"
              />

            ) : (

              <Download size={18} />

            )}

          </button>

        </div>

      );

    })}

  </div>

  {/* ALBUM COVER PREVIEW */}

{showCoverPreview && album.cover && (
  <div
    className="album-cover-preview"
    onClick={() => setShowCoverPreview(false)}
    role="button"
    tabIndex={0}
    aria-label="Close album artwork preview"
    onKeyDown={(e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        setShowCoverPreview(false);
      }
    }}
  >
    <button
      type="button"
      className="album-preview-close"
      onClick={() => setShowCoverPreview(false)}
      aria-label="Close preview"
    >
      ×
    </button>

    <img
      src={album.cover}
      alt={`${album.album} album artwork`}
      className="album-preview-image"
      onClick={(e) => e.stopPropagation()}
    />

    <p>{album.album}</p>
  </div>
)}

</div>

);

}

export default Album;