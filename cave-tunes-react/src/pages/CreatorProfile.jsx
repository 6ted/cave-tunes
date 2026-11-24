import {
  ArrowLeft,
  MapPin,
  Users,
  UserPlus,
  UserCheck,
  Music2,
  Loader2,
  Play,
  Pause,
  Download,
  LockKeyhole,
   Globe,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { usePlayer } from "../context/usePlayer";
import { useAuth } from "../context/useAuth";

import {
  getCreator,
  followCreator,
  getMediaUrl,
  downloadSongFile,
} from "../services/api";

import "./CreatorProfile.css";

/* =====================================================
   NORMALIZE FEATURED ARTISTS
===================================================== */
function normalizeFeaturedArtists(value) {
  if (!value) return [];

  let artists = value;

  if (typeof artists === "string") {
    try {
      artists = JSON.parse(artists);
    } catch {
      return artists.trim() ? [artists.trim()] : [];
    }
  }

  if (!Array.isArray(artists)) return [];

  return artists
    .map((artist) => {
      if (typeof artist === "string") {
        return artist.trim();
      }

      return (
        artist?.artist_name ||
        artist?.name ||
        artist?.username ||
        ""
      ).trim();
    })
    .filter(Boolean);
}

/* =====================================================
   NORMALIZE SONG
===================================================== */
/* =====================================================
   NORMALIZE SONG
===================================================== */

function normalizeSong(song) {
  return {
    ...song,

    id: song.id,

    title:
      song.title ||
      song.song_title ||
      "Untitled Song",

    artist:
      song.owner_name ||
      song.artist_name ||
      song.artist ||
      "Unknown Artist",

   featuredArtists: normalizeFeaturedArtists(
  song.featured_artists
),

    album:
      song.album_name ||
      "",

    release_type:
      String(
        song.release_type || "single"
      )
        .toLowerCase()
        .trim(),

    cover:
      getMediaUrl(
        song.cover_url
      ),

    audioUrl:
      getMediaUrl(
        song.audio_url
      ),

    genre:
      song.genre ||
      "Unknown",

    country:
      song.country ||
      "",

    plays:
      Number(song.plays) || 0,

    downloads:
      Number(song.downloads) || 0,

    likes:
      Number(song.likes) || 0,
  };
}

/* =====================================================
   GROUP RELEASES
===================================================== */

function groupReleases(
  songs,
  releaseType
) {
  const releases = new Map();

  songs.forEach(song => {

    if (
      song.release_type !== releaseType
    ) {
      return;
    }

    const key =
      `${song.artist}-${song.album}`
        .toLowerCase();

    if (!releases.has(key)) {

      releases.set(key, {
        ...song,
        tracks: [],
      });

    }

    releases
      .get(key)
      .tracks
      .push(song);

  });

  return Array.from(
    releases.values()
  );
}


/* =====================================================
   VERIFIED BADGES
   STANDARD + MASTER VERIFICATION
===================================================== */

function VerifiedBadge({
  verificationLevel,
  verified,
}) {

  const level = String(
    verificationLevel || "none"
  )
    .toLowerCase()
    .trim();

  // MASTER VERIFIED
  if (level === "master") {

    return (

      <span
        className="creator-master-verified-badge"
        title="Master Verified by Cave Tunes"
        aria-label="Master Verified by Cave Tunes"
      >

        <svg
          viewBox="0 0 24 24"
          width="25"
          height="25"
          fill="none"
          aria-hidden="true"
        >

          <path
            d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
            fill="#21aa2c"
            stroke="#21aa2c"
            strokeWidth="1"
          />

          <path
            d="M8 12.2L10.5 14.5L16 9"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M12 4.5L13 6.2L15 6.5L13.5 8L13.8 10L12 9L10.2 10L10.5 8L9 6.5L11 6.2L12 4.5Z"
            fill="#21aa2c"
          />

        </svg>

        <span>
          
        </span>

      </span>

    );

  }

  // STANDARD VERIFIED
  if (verified || level === "verified") {

    return (

      <span
        className="creator-verified-badge"
        title="Verified by Cave Tunes"
        aria-label="Verified by Cave Tunes"
      >

        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
        >

          <path
            d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
            fill="#a79b7c"
          />

          <path
            d="M8 12.2L10.5 14.5L16 9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        </svg>

      </span>

    );

  }

  // NO VERIFICATION
  return null;

}


/* ======================================================
   CREATOR SOCIAL MEDIA LINKS
====================================================== */

const SOCIAL_PLATFORM_INFO = {
  instagram: { name: "Instagram", logo: "instagram" },
  tiktok: { name: "TikTok", logo: "tiktok" },
  facebook: { name: "Facebook", logo: "facebook" },
  youtube: { name: "YouTube", logo: "youtube" },
  x: { name: "X", logo: "x" },
  soundcloud: { name: "SoundCloud", logo: "soundcloud" },
  audiomack: { name: "Audiomack", logo: null },
  spotify: { name: "Spotify", logo: "spotify" },
  whatsapp: { name: "WhatsApp", logo: "whatsapp" },
  telegram: { name: "Telegram", logo: "telegram" },
  threads: { name: "Threads", logo: "threads" },
  snapchat: { name: "Snapchat", logo: "snapchat" },
  linkedin: { name: "LinkedIn", logo: "linkedin" },
  website: { name: "Website", logo: null },
};

function CreatorSocialLinks({ links }) {
  const validLinks = (Array.isArray(links) ? links : [])
    .filter((link) => {
      if (!link?.platform || !link?.url) {
        return false;
      }

      try {
        const url = new URL(link.url);
        const platform = link.platform.toLowerCase();

        return (
          ["http:", "https:"].includes(url.protocol) &&
          Boolean(SOCIAL_PLATFORM_INFO[platform])
        );
      } catch {
        return false;
      }
    });

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <section className="creator-social-section">

      <div className="creator-social-header">
        <h2>Connect With Me</h2>

        <p>
          Follow me on social media and other platforms.
        </p>
      </div>

      <div className="creator-social-links">

        {validLinks.map((link) => {
          const platform = link.platform.toLowerCase();
          const info = SOCIAL_PLATFORM_INFO[platform];

          return (
            <a
              key={platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`creator-social-link creator-social-${platform}`}
              title={info.name}
              aria-label={`Visit ${info.name}`}
            >

              {info.logo ? (
                <img
                  src={`https://cdn.simpleicons.org/${info.logo}`}
                  alt=""
                  loading="lazy"
                />
              ) : platform === "website" ? (
                <Globe size={21} />
              ) : (
                <Music2 size={21} />
              )}

              <span>{info.name}</span>

            </a>
          );
        })}

      </div>

    </section>
  );
}


/* =====================================================
   CREATOR PROFILE
===================================================== */

function CreatorProfile() {

  const { user: authUser } = useAuth();

  const params = useParams();

  const id = params.id;

  const navigate =
    useNavigate();


  /* ==========================================
     PLAYER
  ========================================== */

  const {
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
  } = usePlayer();


  /* ==========================================
     STATE
  ========================================== */

  const [
    creator,
    setCreator,
  ] = useState(null);

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
    following,
    setFollowing,
  ] = useState(false);

  const [
    followLoading,
    setFollowLoading,
  ] = useState(false);


  /* ==========================================
     SUBSCRIPTION STATE
  ========================================== */

  const [
    hasActiveSubscription,
    setHasActiveSubscription,
  ] = useState(false);

  const [
    subscriptionLoading,
    setSubscriptionLoading,
  ] = useState(true);


  /* ==========================================
     API BASE URL
  ========================================== */

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://api.cavetunes.site"
    );


  /* ==========================================
     CHECK ACTIVE SUBSCRIPTION
  ========================================== */

  useEffect(() => {

    let cancelled = false;

    async function checkSubscription() {

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken");

      if (!token || !authUser?.id) {

        setHasActiveSubscription(false);

        setSubscriptionLoading(false);

        return;
      }

      try {

        setSubscriptionLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/api/subscription/status`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },

            credentials: "include",
          }
        );

        if (!response.ok) {

          throw new Error(
            "Unable to verify subscription."
          );

        }

        const data =
          await response.json();

        const subscription =
          data.subscription || data;

        const status =
          String(
            subscription.status || ""
          )
            .toLowerCase();

        const expiry =
          subscription.expiresAt ||
          subscription.expires_at;

        const expiryTime = expiry
          ? new Date(expiry).getTime()
          : 0;

        const active =
          status === "active" &&
          Number.isFinite(expiryTime) &&
          expiryTime > Date.now();

        if (!cancelled) {

          setHasActiveSubscription(active);

        }

      } catch (error) {

        console.error(
          "SUBSCRIPTION CHECK ERROR:",
          error
        );

        if (!cancelled) {

          setHasActiveSubscription(false);

        }

      } finally {

        if (!cancelled) {

          setSubscriptionLoading(false);

        }

      }

    }

    checkSubscription();

    return () => {

      cancelled = true;

    };

  }, [
    authUser?.id,
    API_BASE_URL
  ]);


  /* ==========================================
     LOAD CREATOR
  ========================================== */

  useEffect(() => {

    let cancelled = false;

    async function loadCreatorProfile() {

      try {

        setLoading(true);

        setError("");

        const response =
          await getCreator(id);

        if (cancelled) {
          return;
        }

        const creatorData =
          response.creator ||
          response.user;

console.log("PUBLIC CREATOR DATA:", creatorData);
console.log("CREATOR BIO:", creatorData?.bio);

        const creatorSongs =
          (
            response.songs ||
            creatorData?.songs ||
            []
          )
            .map(normalizeSong);

        const normalizedCreator = {

          ...creatorData,

          followers_count:
            Number(
              creatorData?.followers_count ??
              creatorData?.followers ??
              creatorData?.follower_count ??
              0
            ),

          followers:
            Number(
              creatorData?.followers_count ??
              creatorData?.followers ??
              creatorData?.follower_count ??
              0
            ),

        };

        setCreator(
          normalizedCreator
        );

        setSongs(
          creatorSongs
        );

        setFollowing(
          Boolean(
            creatorData?.following ??
            creatorData?.is_following ??
            false
          )
        );

      } catch (err) {

        if (cancelled) {
          return;
        }

        console.error(err);

        setError(
          err.message ||
          "Unable to load creator."
        );

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }

    loadCreatorProfile();

    return () => {

      cancelled = true;

    };

  }, [id]);


  /* ==========================================
     FOLLOW / UNFOLLOW
  ========================================== */

  async function handleFollowToggle() {

    if (followLoading) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {

      navigate(
        `/login?redirect=/creator/${id}`
      );

      return;
    }

    try {

      setFollowLoading(true);

      const response =
        await followCreator(id);

      console.log(
        "FOLLOW RESPONSE:",
        response
      );

      const newFollowing =
        Boolean(
          response.following
        );

      const newFollowers =
        Number(
          response.followers_count ??
          response.followers ??
          0
        );

      setFollowing(
        newFollowing
      );

      setCreator(previous => {

        if (!previous) {
          return previous;
        }

        return {

          ...previous,

          following:
            newFollowing,

          followers:
            newFollowers,

          followers_count:
            newFollowers,

        };

      });

    } catch (error) {

      console.error(
        "FOLLOW ERROR:",
        error
      );

      alert(
        error.message ||
        "Unable to update follow."
      );

    } finally {

      setFollowLoading(false);

    }

  }


  /* ==========================================
     RELEASES
  ========================================== */

  const albums = useMemo(
    () =>
      groupReleases(
        songs,
        "album"
      ),
    [songs]
  );

  const eps = useMemo(
    () =>
      groupReleases(
        songs,
        "ep"
      ),
    [songs]
  );

  const singles = useMemo(
    () =>
      songs.filter(
        song =>
          song.release_type === "single"
      ),
    [songs]
  );


  /* ==========================================
     PLAY SONG
  ========================================== */

  function handlePlaySong(song) {

    if (!song) return;

    const currentId =
      currentSong?.id != null
        ? String(currentSong.id)
        : null;

    const songId =
      String(song.id);

    if (
      currentId === songId &&
      isPlaying
    ) {

      pauseSong();

      return;
    }

    playSong(song, songs);

  }


/* ==========================================
   DOWNLOAD SONG
   ACTIVE SUBSCRIPTION REQUIRED
========================================== */

async function handleDownloadSong(song) {

  // Check subscription verification.

  if (subscriptionLoading) {

    alert(
      "Please wait while we verify your Cave Tunes subscription."
    );

    return;
  }

  if (!hasActiveSubscription) {

    alert(
      "An active Cave Tunes subscription is required to download music."
    );

    return;
  }

  if (!song?.id) {

    alert(
      "Invalid song."
    );

    return;
  }


  // Check authentication.

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");

  if (!token) {

    navigate(
      `/login?redirect=/creator/${id}`
    );

    return;
  }


  try {

    // Request the protected MP3 download.
    // The backend verifies the subscription again.

    const result =
      await downloadSongFile(song.id);


    if (!result?.blob || result.blob.size === 0) {

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


        if (result.downloadsCount !== null &&
            result.downloadsCount !== undefined) {

          newDownloadCount =
            Number(result.downloadsCount);

        } else if (result.downloadCounted) {

          newDownloadCount += 1;

        }

        return {

          ...item,

          downloads: newDownloadCount,

        };

      })

    );


    // Create temporary download URL.

    const downloadUrl =
      window.URL.createObjectURL(
        result.blob
      );


    // Create download link.

    const link =
      document.createElement("a");

    link.href =
      downloadUrl;

    link.download =
      result.filename ||
      `${song.title || "song"}.mp3`;

    link.style.display =
      "none";

    document.body.appendChild(link);


    // Start downloading.

    link.click();


    // Clean up.

    document.body.removeChild(link);

    setTimeout(() => {

      window.URL.revokeObjectURL(
        downloadUrl
      );

    }, 1000);


  } catch (error) {

    console.error(
      "Download error:",
      error
    );

    alert(
      error.message ||
      "Unable to download song."
    );

  }

}

  /* ==========================================
     OPEN RELEASE
  ========================================== */

  function openRelease(release) {

    navigate(
      `/album/${encodeURIComponent(
        release.album
      )}/${encodeURIComponent(
        release.artist
      )}`
    );

  }


  /* ==========================================
     RELEASE CARD
  ========================================== */

  function renderReleaseCards(
    title,
    releases
  ) {

    if (!releases.length) {
      return null;
    }

    return (

      <section className="creator-release-section">

        <div className="creator-section-heading">

          <h2>
            {title}
          </h2>

          <span>
            {releases.length}
          </span>

        </div>

        <div className="creator-release-grid">

          {releases.map(release => (

            <div
              key={`${release.artist}-${release.album}`}
              className="creator-release-card"
              onClick={() =>
                openRelease(release)
              }
            >

              <div className="creator-release-cover">

                {release.cover ? (

                  <img
                    src={release.cover}
                    alt={release.album}
                  />

                ) : (

                  <Music2 size={40} />

                )}

              </div>

              <div className="creator-release-info">

                <h3>
                  {release.album}
                </h3>

                <p>
                  {release.artist}
                </p>

                <span>

                  {release.tracks.length}

                  {" "}

                  {release.tracks.length === 1
                    ? "Song"
                    : "Songs"}

                </span>

              </div>

            </div>

          ))}

        </div>

      </section>

    );

  }


  /* ==========================================
     SONG LIST
  ========================================== */

  function renderSingles() {

    if (!singles.length) {
      return null;
    }

    return (

      <section className="creator-songs-section">

        <div className="creator-section-heading">

          <h2>
            Singles
          </h2>

          <span>
            {singles.length}
          </span>

        </div>

        <div className="creator-song-list">

          {singles.map(song => {

            const active =
              String(currentSong?.id) ===
              String(song.id);

            const downloadDisabled =
              !hasActiveSubscription ||
              subscriptionLoading;

            return (

              <div
                key={song.id}
                className={`creator-song-row ${
                  active
                    ? "creator-song-playing"
                    : ""
                }`}
              >

                {/* SONG COVER */}

                <div className="creator-song-cover">

                  {song.cover ? (

                    <img
                      src={song.cover}
                      alt={song.title}
                    />

                  ) : (

                    <Music2 size={22} />

                  )}

                </div>


                {/* SONG INFORMATION */}
{/* SONG INFORMATION */}

<div className="creator-song-info">

  <h3>
    {song.title}
  </h3>

  <span className="song-artist-line">

    {song.artist}

    {song.featuredArtists?.length > 0 && (
      <span className="song-featured-artists">
        {" "}feat. {song.featuredArtists.join(", ")}
      </span>
    )}

  </span>

  <div className="creator-song-stats">

    <span>
      <Play size={13} fill="currentColor" />
      {song.plays}
    </span>

    <span>
      <Download size={13} />
      {song.downloads}
    </span>

  </div>

</div>


                {/* SONG ACTIONS */}

                <div className="creator-song-actions">

                  {/* DOWNLOAD BUTTON */}

                  <button
                    type="button"

                    className={`creator-song-download-button ${
                      downloadDisabled
                        ? "download-disabled"
                        : ""
                    }`}

                    onClick={() =>
                      handleDownloadSong(song)
                    }

                    disabled={downloadDisabled}

                    title={
                      subscriptionLoading
                        ? "Checking subscription..."
                        : hasActiveSubscription
                          ? "Download song"
                          : "An active subscription is required"
                    }

                    aria-label={
                      hasActiveSubscription
                        ? `Download ${song.title}`
                        : `Subscribe to download ${song.title}`
                    }
                  >

                    {subscriptionLoading ? (

                      <Loader2
                        size={18}
                        className="creator-profile-spinner"
                      />

                    ) : hasActiveSubscription ? (

                      <Download
                        size={18}
                      />

                    ) : (

                      <LockKeyhole
                        size={18}
                      />

                    )}

                  </button>


                  {/* PLAY BUTTON */}

                  <button
                    type="button"

                    className="creator-song-play-button"

                    onClick={() =>
                      handlePlaySong(song)
                    }

                    title={
                      active && isPlaying
                        ? "Pause song"
                        : "Play song"
                    }

                    aria-label={
                      active && isPlaying
                        ? `Pause ${song.title}`
                        : `Play ${song.title}`
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

                </div>

              </div>

            );

          })}

        </div>

      </section>

    );

  }


  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {

    return (

      <main className="page creator-profile-page">

        <div className="creator-profile-loading">

          <Loader2
            size={34}
            className="creator-profile-spinner"
          />

          <span>
            Loading creator...
          </span>

        </div>

      </main>

    );

  }


  /* ==========================================
     ERROR
  ========================================== */

  if (error || !creator) {

    return (

      <main className="page creator-profile-page">

        <button
          className="creator-back-button"
          onClick={() => navigate(-1)}
        >

          <ArrowLeft size={18} />

          Back

        </button>

        <div className="creator-profile-error">

          <Music2 size={45} />

          <h2>
            Creator not found
          </h2>

          <p>
            {error}
          </p>

        </div>

      </main>

    );

  }


  /* ==========================================
     PROFILE DATA
  ========================================== */

  const creatorName =
    creator.username ||
    creator.artist_name ||
    creator.name ||
    "Unknown Artist";

  const creatorImage =
    getMediaUrl(

      creator.profile_image ||

      creator.profile_image_url ||

      creator.avatar ||

      ""

    );

  const followers =
    Number(
      creator.followers_count ??
      creator.followers ??
      creator.follower_count ??
      0
    );

  const loggedUserId =
    String(
      authUser?.id ||
      authUser?.user_id ||
      ""
    );

  const creatorId =
    String(
      creator.id ||
      creator.user_id ||
      ""
    );

  const isOwnProfile =
    loggedUserId !== "" &&
    creatorId !== "" &&
    loggedUserId === creatorId;


  /* ==========================================
     PAGE
  ========================================== */

  return (

    <main className="page creator-profile-page">

      {/* BACK BUTTON */}

      <button
        className="creator-back-button"
        onClick={() => navigate(-1)}
      >

        <ArrowLeft size={18} />

        Back

      </button>


      {/* ===============================
          HEADER
      =============================== */}

      <section className="creator-profile-header">

        <div className="creator-profile-image">

          {creatorImage ? (

            <img
              src={creatorImage}
              alt={creatorName}
            />

          ) : (

            <div className="creator-profile-image-fallback">

              <Music2 size={55} />

            </div>

          )}

        </div>


        <div className="creator-profile-details">

          <span className="creator-profile-role">

            {creator.role || "Artist"}

          </span>


          <div className="creator-name-row">

            <h1>
              {creatorName}
            </h1>

         <VerifiedBadge
  verificationLevel={creator.verification_level}
  verified={creator.verified}
/>

          </div>


          <div className="creator-profile-country">

            <MapPin size={16} />

            {creator.country || "Unknown"}

          </div>


          <div className="creator-profile-followers">

            <Users size={16} />

            <strong>
              {followers}
            </strong>

            <span>
              Followers
            </span>

          </div>


          {!isOwnProfile && !loading && (

            <button
              className={`creator-follow-button ${
                following
                  ? "following"
                  : ""
              }`}

              onClick={handleFollowToggle}

              disabled={followLoading}
            >

              {followLoading ? (

                <Loader2
                  size={18}
                  className="creator-profile-spinner"
                />

              ) : following ? (

                <>

                  <UserCheck size={18} />

                  Following

                </>

              ) : (

                <>

                  <UserPlus size={18} />

                  Follow

                </>

              )}

            </button>

          )}

        </div>

      </section>


     {/* =================================================
          PROFILE BIO
      ================================================= */}

      <section className="profile-bio-display">

        <div className="profile-bio-header">
          <h2>About Me</h2>
        </div>

        <div className="profile-bio-content">

          {creator.bio && creator.bio.trim() ? (

            <p>{creator.bio}</p>

          ) : (

            <p className="profile-bio-empty">
              This user hasn't added a bio yet.
            </p>

          )}

        </div>

      </section>

           <CreatorSocialLinks
        links={creator.social_links}
      />


      {/* ===============================
          MUSIC
      =============================== */}

      <section className="creator-music-section">

        <div className="creator-music-header">

          <h2>
            Music
          </h2>

          <span>

            {songs.length}

            {" "}

            {songs.length === 1
              ? "Song"
              : "Songs"}

          </span>

        </div>


        {/* ALBUMS */}

        {renderReleaseCards(
          "Albums",
          albums
        )}


        {/* EPS */}

        {renderReleaseCards(
          "EPs",
          eps
        )}


        {/* SINGLES */}

        {renderSingles()}


        {/* EMPTY MUSIC */}

        {!songs.length && (

          <div className="creator-no-music">

            <Music2 size={40} />

            <h3>
              No music yet
            </h3>

            <p>
              This creator hasn't uploaded any music.
            </p>

          </div>

        )}

      </section>

    </main>

  );

}


export default CreatorProfile;