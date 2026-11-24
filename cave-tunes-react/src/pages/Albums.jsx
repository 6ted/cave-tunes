import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";

import {
  Disc3,
  Download,
  Music2,
  Play,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import "./Albums.css";


// ======================================================
// API CONFIGURATION
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;


// ======================================================
// MEDIA URL HELPER
// ======================================================

function getMediaUrl(value) {
  if (!value) {
    return "";
  }

  const url = String(value).trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${API_BASE_URL}${
    url.startsWith("/") ? "" : "/"
  }${url}`;
}


// ======================================================
// NORMALIZE ALBUM
// ======================================================

function normalizeAlbum(album) {
  if (!album) {
    return null;
  }

  return {
    ...album,

    id:
      album.id ||
      album.album_id ||
      album.upc ||
      album.key,

    title:
      album.title ||
      album.album_title ||
      album.album_name ||
      "Untitled Album",

    artist:
      album.artist ||
      album.artist_name ||
      "Unknown Artist",

    cover: getMediaUrl(
      album.cover ||
      album.cover_url ||
      album.cover_file_url
    ),

    track_count:
      Number(
        album.track_count ||
        album.songs ||
        0
      ),

    total_plays:
      Number(
        album.total_plays ||
        album.plays ||
        0
      ),

    total_downloads:
      Number(
        album.total_downloads ||
        album.downloads ||
        0
      ),

    created_at:
      album.created_at ||
      null,

    latest_track_date:
      album.latest_track_date ||
      album.created_at ||
      null,
  };
}


// ======================================================
// FETCH MUSIC
// ======================================================

async function fetchAlbums() {
  const response = await fetch(
    `${API_BASE_URL}/api/music`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load albums. Server returned ${response.status}.`
    );
  }

  const data = await response.json();

  if (data?.success === false) {
    throw new Error(
      data.message ||
      "Unable to load Cave Tunes albums."
    );
  }

  const songs = Array.isArray(data?.songs)
    ? data.songs
    : [];

  return songs;
}


// ======================================================
// BUILD ALBUMS
// ======================================================

function buildAlbums(songs) {
  const albumMap = new Map();

  songs.forEach((song) => {

    // ==================================================
    // ALBUMS ONLY
    // ==================================================

    const releaseType = String(
      song.release_type || ""
    )
      .toLowerCase()
      .trim();

    // IMPORTANT:
    // EPs and Singles are completely ignored.

    if (releaseType !== "album") {
      return;
    }


    // ==================================================
    // ALBUM NAME
    // ==================================================

    const albumName =
      song.album_name ||
      song.album_title ||
      song.release_name ||
      "Untitled Album";


    // ==================================================
    // ARTIST
    // ==================================================

    const artistName =
      song.artist_name ||
      song.artist ||
      "Unknown Artist";


    // ==================================================
    // UNIQUE ALBUM KEY
    //
    // Artist is included so:
    //
    // Artist A - "Love"
    // Artist B - "Love"
    //
    // remain separate albums.
    // ==================================================

    const key =
      `album-${artistName}-${albumName}`
        .toLowerCase()
        .trim();


    // ==================================================
    // CREATE ALBUM
    // ==================================================

    if (!albumMap.has(key)) {

      albumMap.set(key, {

        id:
          song.album_id ||
          song.upc ||
          key,

        key,

        title: albumName,

        artist: artistName,

        cover:
          song.cover_url ||
          song.cover_file_url ||
          song.cover ||
          "",

        songs: 0,

        plays: 0,

        downloads: 0,

        likes: 0,

        created_at:
          song.created_at ||
          null,

        latest_track_date:
          song.created_at ||
          null,

      });

    }


    // ==================================================
    // GET ALBUM
    // ==================================================

    const album =
      albumMap.get(key);


    // ==================================================
    // TRACK COUNT
    // ==================================================

    album.songs += 1;


    // ==================================================
    // PLAYS
    // ==================================================

    album.plays +=
      Number(song.plays || 0);


    // ==================================================
    // DOWNLOADS
    // ==================================================

    album.downloads +=
      Number(song.downloads || 0);


    // ==================================================
    // LIKES
    // ==================================================

    album.likes +=
      Number(song.likes || 0);


    // ==================================================
    // NEWEST TRACK DATE
    //
    // The album's "newness" is based on the newest
    // track belonging to the album.
    // ==================================================

    if (song.created_at) {

      const currentDate =
        new Date(song.created_at);

      const latestDate =
        album.latest_track_date
          ? new Date(album.latest_track_date)
          : null;

      if (
        !latestDate ||
        currentDate > latestDate
      ) {
        album.latest_track_date =
          song.created_at;
      }

    }


    // ==================================================
    // FALLBACK COVER
    //
    // If the first track has no artwork but another
    // track does, use that artwork.
    // ==================================================

    if (
      !album.cover &&
      (
        song.cover_url ||
        song.cover_file_url ||
        song.cover
      )
    ) {

      album.cover =
        song.cover_url ||
        song.cover_file_url ||
        song.cover;

    }

  });


  // ====================================================
  // CONVERT MAP TO ARRAY
  // ====================================================

  const albums =
    Array.from(
      albumMap.values()
    )
      .map((album) => {

        const normalized =
          normalizeAlbum(album);

        return {
          ...normalized,

          // --------------------------------------------
          // TOP ALBUM SCORE
          //
          // Plays + Downloads
          //
          // This means albums that are being listened to
          // and downloaded more will rank higher.
          // --------------------------------------------

          popularity_score:
            normalized.total_plays +
            normalized.total_downloads,

        };

      });


  return albums;
}


// ======================================================
// ALBUM CARD
// ======================================================

function AlbumCard({
  album,
  onOpen,
  rank,
  showRank = false,
}) {

  const title =
    album.title ||
    "Untitled Album";


  const artist =
    album.artist ||
    "Unknown Artist";


  const cover =
    album.cover;


  const trackCount =
    Number(
      album.track_count || 0
    );


  const plays =
    Number(
      album.total_plays || 0
    );


  const downloads =
    Number(
      album.total_downloads || 0
    );


  return (
    <article
      className="albums-card"
      onClick={onOpen}
    >

      {/* ================================================
          COVER
      ================================================= */}

      <div className="albums-card-cover">

        {cover ? (

          <img
            src={cover}
            alt={title}
            loading="lazy"
          />

        ) : (

          <div className="albums-card-placeholder">

            <Disc3
              size={44}
            />

          </div>

        )}


        {/* ==============================================
            RANK
        =============================================== */}

        {showRank && (

          <div className="albums-rank">

            #{rank}

          </div>

        )}


        {/* ==============================================
            OPEN BUTTON
        =============================================== */}

        <button
          type="button"
          className="albums-play-button"
          aria-label={`Open ${title}`}
          onClick={(event) => {

            event.stopPropagation();

            onOpen();

          }}
        >

          <Play
            size={20}
            fill="currentColor"
          />

        </button>

      </div>


      {/* ================================================
          INFO
      ================================================= */}

      <div className="albums-card-info">

        <h3>
          {title}
        </h3>

        <p>
          {artist}
        </p>

        <div className="albums-card-meta">

          <span>
            {trackCount}
            {" "}
            {trackCount === 1
              ? "song"
              : "songs"}
          </span>

        </div>


        {/* ==============================================
            STATS
        =============================================== */}

        <div className="albums-card-stats">

          <span>

            <Play
              size={13}
              fill="currentColor"
            />

            {plays.toLocaleString()}

          </span>


          <span>

            <Download
              size={13}
            />

            {downloads.toLocaleString()}

          </span>

        </div>

      </div>

    </article>
  );
}


// ======================================================
// SECTION HEADER
// ======================================================

function SectionHeader({
  icon,
  label,
  title,
}) {

  return (

    <div className="albums-section-header">

      <div className="albums-section-heading">

        <div className="albums-section-label">

          {icon}

          <span>
            {label}
          </span>

        </div>

        <h2>
          {title}
        </h2>

      </div>

    </div>

  );
}


// ======================================================
// EMPTY STATE
// ======================================================

function EmptyAlbums({
  message,
}) {

  return (

    <div className="albums-empty">

      <Disc3
        size={42}
      />

      <h3>
        No albums yet
      </h3>

      <p>
        {message}
      </p>

    </div>

  );
}


// ======================================================
// ALBUMS PAGE
// ======================================================

function Albums() {

  const navigate =
    useNavigate();


  // ====================================================
  // STATE
  // ====================================================

  const [
    topAlbums,
    setTopAlbums,
  ] = useState([]);


  const [
    newAlbums,
    setNewAlbums,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ====================================================
  // LOAD ALBUMS
  // ====================================================

  const loadAlbums =
    useCallback(async () => {

      try {

        setLoading(true);

        setError("");


        // ----------------------------------------------
        // GET ALL SONGS
        // ----------------------------------------------

        const songs =
          await fetchAlbums();


        // ----------------------------------------------
        // BUILD ALBUMS
        // ----------------------------------------------

        const albums =
          buildAlbums(songs);


        // =================================================
        // TOP ALBUMS
        //
        // Highest:
        //
        // plays + downloads
        // =================================================

        const sortedTopAlbums =
          [...albums]
            .sort((a, b) => {

              if (
                b.popularity_score !==
                a.popularity_score
              ) {

                return (
                  b.popularity_score -
                  a.popularity_score
                );

              }


              // Secondary sorting:
              // more plays wins

              if (
                b.total_plays !==
                a.total_plays
              ) {

                return (
                  b.total_plays -
                  a.total_plays
                );

              }


              // Final sorting:
              // more downloads wins

              return (
                b.total_downloads -
                a.total_downloads
              );

            });


        // =================================================
        // NEW ALBUMS
        //
        // Newest album activity first.
        // =================================================

        const sortedNewAlbums =
          [...albums]
            .sort((a, b) => {

              const dateA =
                a.latest_track_date
                  ? new Date(
                      a.latest_track_date
                    ).getTime()
                  : 0;

              const dateB =
                b.latest_track_date
                  ? new Date(
                      b.latest_track_date
                    ).getTime()
                  : 0;

              return dateB - dateA;

            });


        setTopAlbums(
          sortedTopAlbums
        );


        setNewAlbums(
          sortedNewAlbums
        );

      }

      catch (err) {

        console.error(
          "ALBUMS PAGE ERROR:",
          err
        );

        setError(
          err.message ||
          "Unable to load albums."
        );

        setTopAlbums([]);

        setNewAlbums([]);

      }

      finally {

        setLoading(false);

      }

    }, []);


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    async function loadInitialAlbums() {
      await loadAlbums();
    }

    loadInitialAlbums();

  }, [loadAlbums]);


// ======================================================
// OPEN ALBUM
// ======================================================

const openAlbum = (album) => {
  const token = localStorage.getItem("token");

  const albumUrl =
    `/album/${encodeURIComponent(
      album.title
    )}/${encodeURIComponent(
      album.artist
    )}`;

  // Not signed in
  if (!token) {
    navigate("/login", {
      state: {
        from: albumUrl,
      },
    });

    return;
  }

  // Signed in
  navigate(albumUrl);
};

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {

    return (

      <main className="albums-page">

        <section className="albums-loading">

          <div className="albums-loading-logo">

            <img
              src="/Cave-Tunes-logo.png"
              alt="Cave Tunes"
            />

          </div>

          <h2>
            Loading Albums...
          </h2>

          <p>
            Discovering albums on Cave Tunes.
          </p>

        </section>

      </main>

    );

  }


  // ====================================================
  // PAGE
  // ====================================================

  return (

    <main className="albums-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="albums-page-header">

        <div>

          <div className="albums-page-label">

            <Music2
              size={17}
            />

            <span>
              CAVE TUNES COLLECTION
            </span>

          </div>

          <h1>
            Albums
          </h1>

          <p>
            Explore full albums from artists
            across Cave Tunes.
          </p>

        </div>

        <button
          type="button"
          className="albums-refresh-button"
          onClick={loadAlbums}
        >

          <RefreshCw
            size={17}
          />

          Refresh

        </button>

      </header>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="albums-error">

          <Music2
            size={20}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={loadAlbums}
          >

            <RefreshCw
              size={15}
            />

            Retry

          </button>

        </div>

      )}


      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="albums-content">


        {/* =================================================
            TOP ALBUMS
        ================================================= */}

        <section className="albums-section">

          <SectionHeader
            icon={
              <TrendingUp
                size={17}
              />
            }
            label="MOST PLAYED & DOWNLOADED"
            title="Top Albums"
          />


          {topAlbums.length > 0 ? (

            <div className="albums-grid">

              {topAlbums.map(
                (album, index) => (

                  <AlbumCard
                    key={album.key}
                    album={album}
                    rank={index + 1}
                    showRank
                    onOpen={() =>
                      openAlbum(album)
                    }
                  />

                )
              )}

            </div>

          ) : (

            <EmptyAlbums
              message="Top albums will appear here as listeners play and download music."
            />

          )}

        </section>


        {/* =================================================
            NEW ALBUMS
        ================================================= */}

        <section className="albums-section">

          <SectionHeader
            icon={
              <Music2
                size={17}
              />
            }
            label="JUST RELEASED"
            title="New Albums"
          />


          {newAlbums.length > 0 ? (

            <div className="albums-grid">

              {newAlbums.map(
                (album) => (

                  <AlbumCard
                    key={`new-${album.key}`}
                    album={album}
                    onOpen={() =>
                      openAlbum(album)
                    }
                  />

                )
              )}

            </div>

          ) : (

            <EmptyAlbums
              message="New albums will appear here when artists release albums."
            />

          )}

        </section>


      </div>

    </main>

  );

}


export default Albums;

