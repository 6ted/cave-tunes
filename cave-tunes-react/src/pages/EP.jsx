import {
useEffect,
useState,
} from "react";

import {
useParams,
useNavigate,
} from "react-router-dom";

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

import {
usePlayer,
} from "../context/usePlayer";

import "./EP.css";

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

ep:
  song.ep_name ||
  song.album_name ||
  song.album_title ||
  song.release_name ||
  "Untitled EP",

cover:
  getMediaUrl(
    song.cover_url ||
    song.cover_file_url ||
    song.cover ||
    ""
  ),

audioUrl:
  getMediaUrl(
    song.audio_url ||
    song.audio_file_url ||
    ""
  ),

plays:
  Number(song.plays || 0),

downloads:
  Number(song.downloads || 0),

};

}

// ======================================================
// EP
// ======================================================

function EP() {

const {
title,
artist,
} = useParams();

const navigate = useNavigate();

const {
playSong,
currentSong,
isPlaying,
} = usePlayer();

// ==================================================
// STATE
// ==================================================

const [
songs,
setSongs,
] = useState([]);

const [
loading,
setLoading,
] = useState(true);

const [
error,
setError,
] = useState("");

const [
downloadingId,
setDownloadingId,
] = useState(null);

// ==================================================
// LOAD EP
// ==================================================

useEffect(() => {

let cancelled = false;

async function loadEP() {

  try {

    setLoading(true);

    setError("");

    const response =
      await getSongs();

    const list =
      Array.isArray(response)
        ? response
        : response?.songs || [];


    const targetEP =
      decodeURIComponent(title || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");


    const targetArtist =
      decodeURIComponent(artist || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");


    const result = list

      .filter(song => {

        const releaseType =
          String(
            song.release_type || ""
          )
            .trim()
            .toLowerCase();


        const songEP =
          String(
            song.ep_name ||
            song.album_name ||
            song.title ||
            ""
          )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");


        const songArtist =
          String(
            song.artist_name ||
            song.artist ||
            ""
          )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");


        return (
          releaseType === "ep" &&
          songEP === targetEP &&
          songArtist === targetArtist
        );

      })

      .map(normalizeSong);


    if (cancelled) return;


    console.log(
      "FOUND EP SONGS:",
      result
    );


    setSongs(result);


    if (!result.length) {

      setError(
        "No songs found for this EP."
      );

    }

  } catch (err) {

    console.error(
      "EP LOAD ERROR:",
      err
    );

    if (!cancelled) {

      setError(
        "Unable to load EP."
      );

    }

  } finally {

    if (!cancelled) {

      setLoading(false);

    }

  }

}


loadEP();


return () => {

  cancelled = true;

};

}, [
title,
artist,
]);

// ==================================================
// PLAY EP
// ==================================================

function playEP() {

if (!songs.length) return;

playSong(
  songs[0],
  songs
);

}

// ==================================================
// SHUFFLE EP
// ==================================================

function shuffleEP() {

if (!songs.length) return;

const shuffled = [...songs].sort(
  () => Math.random() - 0.5
);

playSong(
  shuffled[0],
  shuffled
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
    "EP DOWNLOAD ERROR:",
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
// LOADING
// ==================================================

if (loading) {

return (

  <div className="ep-page">

    <h2>
      Loading EP...
    </h2>

  </div>

);

}

// ==================================================
// ERROR
// ==================================================

if (error || !songs.length) {

return (

  <div className="ep-page">

    <h2>
      EP not found
    </h2>

    <p>
      {error}
    </p>

  </div>

);

}

// ==================================================
// EP DATA
// ==================================================

const ep = songs[0];

const totalPlays = songs.reduce(
(total, song) =>
total + song.plays,
0
);

const totalDownloads = songs.reduce(
(total, song) =>
total + song.downloads,
0
);

// ==================================================
// PAGE
// ==================================================

return (

<main
  className="ep-page"
  style={{
    "--ep-background": `url(${ep.cover})`
  }}
>

  {/* EP HEADER */}

  <section className="ep-header">

    <div className="ep-cover">

      {ep.cover ? (

        <img
          src={ep.cover}
          alt={ep.ep}
        />

      ) : (

        <Music2 size={80} />

      )}

    </div>


    <div className="ep-info">

      <span className="ep-label">
        EP
      </span>


      <h1>
        {ep.ep}
      </h1>


      <h3>
        {ep.artist}
      </h3>


      {/* EP STATS */}

      <div className="ep-stats">

        <span>

          <Headphones size={16} />

          {totalPlays.toLocaleString()}

          {" "}

          Plays

        </span>


        <span>

          <Download size={16} />

          {totalDownloads.toLocaleString()}

          {" "}

          Downloads

        </span>

      </div>


      {/* EP BUTTONS */}

      <div className="ep-buttons">

        <button
          onClick={playEP}
        >

          <Play size={18} />

          Play

        </button>


        <button
          onClick={shuffleEP}
        >

          <Shuffle size={18} />

          Shuffle

        </button>

      </div>

    </div>

  </section>


  {/* EP TRACK LIST */}

  <section className="ep-list">

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
              ? "ep-song active"
              : "ep-song"
          }
        >

          {/* TRACK NUMBER */}

          <span>
            {index + 1}
          </span>


          {/* COVER */}

          <img
            src={song.cover}
            alt={song.title}
          />


          {/* SONG INFORMATION */}

          <div>

            <strong>
              {song.title}
            </strong>


            <p>
              {song.artist}
            </p>


            <div className="ep-song-stats">

              <span>

                <Headphones size={13} />

                {song.plays.toLocaleString()}

              </span>


              <span>

                <Download size={13} />

                {song.downloads.toLocaleString()}

              </span>

            </div>

          </div>


          {/* PLAY BUTTON */}

          <button
            type="button"

            onClick={() =>
              playSong(song, songs)
            }

            aria-label={
              active && isPlaying
                ? "Pause song"
                : "Play song"
            }
          >

            {active && isPlaying ? (

              <Pause size={18} />

            ) : (

              <Play size={18} />

            )}

          </button>


          {/* PROTECTED DOWNLOAD BUTTON */}

          <button
            type="button"

            onClick={(e) => {

              e.stopPropagation();

              handleDownload(song);

            }}

            disabled={
              downloadingId !== null
            }

            aria-label={
              downloading
                ? "Downloading song"
                : "Download song"
            }

            title="Download requires an active Cave Tunes subscription"
          >

            {downloading ? (

              <Loader2
                size={18}
                className="ep-download-spinner"
              />

            ) : (

              <Download size={18} />

            )}

          </button>

        </div>

      );

    })}

  </section>

</main>

);

}

export default EP;