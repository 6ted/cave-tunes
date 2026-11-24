import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  User,
  
  Music2,
  Play,
  Pause,
  Trash2,
  Download,
  Loader2,
  Eye,
  Settings,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
    Globe,
} from "lucide-react";
import { usePlayer } from "../context/usePlayer";

import "./Profile.css";


/* ======================================================
   API
====================================================== */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;


/* ======================================================
   TOKEN
====================================================== */

function getToken() {
  return localStorage.getItem("token");
}


/* ======================================================
   MEDIA URL
====================================================== */

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


/* ======================================================
   JSON READER
====================================================== */

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


/* ======================================================
   NORMALIZE USER
====================================================== */

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,

    id:
      user.id ??
      user.user_id ??
      null,

    followers_count: Number(
      user.followers_count ??
      user.followers ??
      0
    ),

    username:
      user.username ||
      user.name ||
      "Cave Tunes User",

    role:
      user.role ||
      "listener",

    country:
      user.country ||
      "",

    phone:
      user.phone ||
      "",

    profile_image_url:
      user.profile_image_url ||
      user.avatar ||
      "",
  };
}

/* =====================================================
   VERIFIED BADGES
   STANDARD + MASTER VERIFICATION
===================================================== */

function isEnabled(value) {
  return (
    value === true ||
    value === 1 ||
    ["true", "t", "1"].includes(
      String(value).toLowerCase().trim()
    )
  );
}

function VerifiedBadge({ creator }) {
  const verified = isEnabled(creator?.verified);
  const monetized = isEnabled(creator?.monetized);

  const isMaster = verified && monetized;

  if (!verified) {
    return null;
  }

  return (
    <span
      className={
        isMaster
          ? "creator-master-verified-badge"
          : "creator-verified-badge"
      }
      title={
        isMaster
          ? "Master Verified by Cave Tunes"
          : "Verified by Cave Tunes"
      }
      aria-label={
        isMaster
          ? "Master Verified by Cave Tunes"
          : "Verified by Cave Tunes"
      }
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
          fill={isMaster ? "#21aa2c" : "#bbb29b"}
        />

        <path
          d="M8 12.2L10.5 14.5L16 9"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
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
/* ======================================================
   NORMALIZE SONG
====================================================== */

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

         featuredArtists: normalizeFeaturedArtists(
      song.featured_artists
    ),

    release_type:
      String(
        song.release_type || ""
      ).toLowerCase(),

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


/* ======================================================
   ALBUM / EP SECTION
====================================================== */

function AlbumSection({
  title,
  albums,
  navigate,
 
  type,
}) {
  return (
    <section className="my-songs-section">

      <div className="my-songs-header">

        <h2>
          {title}
        </h2>

        <span>
          {albums.length}
        </span>

      </div>


      {albums.length === 0 ? (

        <p>
          No {type === "ep" ? "EPs" : "albums"} here yet.
        </p>

      ) : (

        <div className="album-grid">

          {albums.map((album) => (

           <article
  key={`${album.album_name}-${album.artist}`}
  className="album-card"
  role="link"
  tabIndex={0}
  onClick={() => {
    navigate(
      `/${type}/${encodeURIComponent(
        album.album_name
      )}/${encodeURIComponent(
        album.artist
      )}`
    );
  }}
  onKeyDown={(event) => {
    if (event.key === "Enter") {
      navigate(
        `/${type}/${encodeURIComponent(
          album.album_name
        )}/${encodeURIComponent(
          album.artist
        )}`
      );
    }
  }}
>

              <div className="album-cover">

                {album.cover ? (

                  <img
                    src={album.cover}
                    alt={album.album_name}
                  />

                ) : (

                  <Music2 />

                )}

              </div>


          <CatalogueActions
  release={album}
  type={type}
  navigate={navigate}
/>


              <div className="album-info">

                <h3>
                  {album.album_name}
                </h3>

                <p>
                  {album.artist}
                </p>

                <span>
                  {album.songs.length} tracks
                </span>

                <span>
                  <Play size={12} />
                  {album.plays}
                </span>

              </div>

            </article>

          ))}

        </div>

      )}

    </section>
  );
}


function SongSection({
title,
songs,
currentSong,
isPlaying,
playSong,
pauseSong,
handleDeleteSong,
deletingSongId,
}) {
const [open, setOpen] = useState(false);

return ( <section className="my-songs-section">


  <button
    type="button"
    className="singles-dropdown-header"
    onClick={() => setOpen(!open)}
  >
    <div>
      <h2>{title}</h2>
      <span>{songs.length} singles</span>
    </div>

    <span className="singles-arrow">
      {open ? "▲" : "▼"}
    </span>
  </button>

  {open && (
    <div className="my-songs-list">

      {songs.length === 0 ? (
        <p>No singles uploaded yet.</p>
      ) : (

        songs.map((song) => {

          const active =
            String(currentSong?.id) === String(song.id);

          const playing =
            active && isPlaying;

          const deleting =
            deletingSongId === song.id;

          return (
            <article
              key={song.id}
              className={
                active
                  ? "my-song-item my-song-playing"
                  : "my-song-item"
              }
              onClick={() => playSong(song, songs)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  playSong(song, songs);
                }
              }}
            >

              <div className="song-cover">
                {song.cover ? (
                  <img
                    src={song.cover}
                    alt={song.title}
                  />
                ) : (
                  <Music2 />
                )}
              </div>

              <div className="song-info">

                <strong>{song.title}</strong>

               <span className="song-artist-line">
  {song.artist}

  {song.featuredArtists?.length > 0 && (
    <span className="song-featured-artists">
      {" "}feat. {song.featuredArtists.join(", ")}
    </span>
  )}
</span>

                <div className="song-stats">

                  <span>
                    <Play size={13} />
                    {song.plays}
                  </span>

                  <span>
                    <Download size={13} />
                    {song.downloads}
                  </span>

                </div>

              </div>

              <div className="song-actions">

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (playing) {
                      pauseSong();
                    } else {
                      playSong(song, songs);
                    }
                  }}
                >
                  {playing ? (
                    <Pause size={17} />
                  ) : (
                    <Play size={17} />
                  )}
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteSong(song);
                  }}
                >
                  {deleting ? (
                    <Loader2 />
                  ) : (
                    <Trash2 />
                  )}
                </button>

              </div>

            </article>
          );
        })

      )}

    </div>
  )}

</section>


);
}

/* ======================================================
   CATALOGUE ACTIONS
====================================================== */

function CatalogueActions({
  release,
  type,
  navigate,
  
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="catalogue-wrapper">

      <button
        type="button"
        className="album-card-button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((previous) => !previous);
        }}
      >
        Options
      </button>


      {open && (

        <div className="catalogue-menu">

          <button
            type="button"
            onClick={(event) => {

              event.stopPropagation();

              navigate(
                `/${type}/${encodeURIComponent(
                  release.album_name
                )}/${encodeURIComponent(
                  release.artist
                )}`
              );

              setOpen(false);

            }}
          >
            🎵 View & Play
          </button>


          <button
  type="button"
  onClick={(event) => {

    event.stopPropagation();

    navigate(
      `/manage-catalogue/${type}/${encodeURIComponent(
        release.album_name
      )}/${encodeURIComponent(
        release.artist
      )}`
    );

    setOpen(false);

  }}
>
  ⚙ Manage Catalogue
</button>

        </div>

      )}

    </div>
  );
}



/* ======================================================
   SOCIAL MEDIA LINKS
====================================================== */

const SOCIAL_PLATFORM_INFO = {
  instagram: {
    name: "Instagram",
    logo: "instagram",
  },
  tiktok: {
    name: "TikTok",
    logo: "tiktok",
  },
  facebook: {
    name: "Facebook",
    logo: "facebook",
  },
  youtube: {
    name: "YouTube",
    logo: "youtube",
  },
  x: {
    name: "X",
    logo: "x",
  },
  soundcloud: {
    name: "SoundCloud",
    logo: "soundcloud",
  },
  audiomack: {
    name: "Audiomack",
    logo: null,
  },
  spotify: {
    name: "Spotify",
    logo: "spotify",
  },
  whatsapp: {
    name: "WhatsApp",
    logo: "whatsapp",
  },
  telegram: {
    name: "Telegram",
    logo: "telegram",
  },
  threads: {
    name: "Threads",
    logo: "threads",
  },
  snapchat: {
    name: "Snapchat",
    logo: "snapchat",
  },
  linkedin: {
    name: "LinkedIn",
    logo: "linkedin",
  },
  website: {
    name: "Website",
    logo: null,
  },
};

function ProfileSocialLinks({ links }) {
  const validLinks = (Array.isArray(links) ? links : [])
    .filter((link) => {
      if (!link?.platform || !link?.url) return false;

      try {
        const parsedUrl = new URL(link.url);

        return (
          ["http:", "https:"].includes(parsedUrl.protocol) &&
          SOCIAL_PLATFORM_INFO[link.platform.toLowerCase()]
        );
      } catch {
        return false;
      }
    });

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <section className="profile-social-section">
      <div className="profile-social-header">
        <h2>Connect With Me</h2>
        <p>Find me on social media and other platforms.</p>
      </div>

      <div className="profile-social-links">
        {validLinks.map((link) => {
          const platform = link.platform.toLowerCase();
          const info = SOCIAL_PLATFORM_INFO[platform];

          return (
            <a
              key={platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`profile-social-link profile-social-${platform}`}
              aria-label={`Visit ${info.name}`}
              title={info.name}
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


/* ======================================================
   PROFILE PAGE
====================================================== */

export default function Profile() {

  const navigate = useNavigate();


  /* ====================================================
     PLAYER
  ==================================================== */

const {
  currentSong,
  isPlaying,
  playSong,
  pauseSong,
  setFullPlayerOpen,
  isPremium,
} = usePlayer();

/* ====================================================
   PLAY SONG AND OPEN FULL PLAYER
==================================================== */

const handlePlaySong = async (song, songs = [song]) => {
  if (!song) return;

  try {
    setError("");

    const result = playSong(song, songs);

    setFullPlayerOpen(true);

    await result;

  } catch (err) {
    console.error("Unable to play song:", err);
    setError("Unable to play this song. Please try again.");
  }
};
  /* ====================================================
     STATE
  ==================================================== */

  const [user, setUser] =
    useState(null);

  const [songs, setSongs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [songsLoading, setSongsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [deletingSongId, setDeletingSongId] =
    useState(null);

  /* ====================================================
   COMMUNITY POSTS STATE
==================================================== */

const [posts, setPosts] = useState([]);

const [postsLoading, setPostsLoading] = useState(true);

const [postActionId, setPostActionId] = useState(null);

const [deletingPostId, setDeletingPostId] = useState(null);

const [expandedComments, setExpandedComments] = useState({});

const [commentsByPost, setCommentsByPost] = useState({});

const [commentInputs, setCommentInputs] = useState({});

const [commentLoading, setCommentLoading] = useState({});

  /* ====================================================
     LOAD PROFILE
  ==================================================== */

  const loadProfile = useCallback(
    async () => {

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/auth/me`,
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
          "Unable to load profile"
        );
      }

      const currentUser =
        normalizeUser(
          data.user ||
          data
        );

      setUser(currentUser);
return currentUser;
    },
    [setUser] 
  );


  /* ====================================================
     LOAD SONGS
  ==================================================== */

  const loadSongs = useCallback(
    async () => {

      try {

        setSongsLoading(true);

        const token =
          getToken();

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
            "Unable to load songs"
          );
        }

        const list =
          data.songs ||
          data.data ||
          [];

        setSongs(
          list
            .map(normalizeSong)
            .filter(Boolean)
        );

      } catch (err) {

        setError(err.message);

      } finally {

        setSongsLoading(false);

      }

    },
    []
  );

/* ====================================================
   LOAD MY COMMUNITY POSTS
==================================================== */

const loadUserPosts = useCallback(async (userId) => {

  if (!userId) {
    setPosts([]);
    setPostsLoading(false);
    return;
  }

  try {

    setPostsLoading(true);

    const response = await fetch(
      `${API_BASE_URL}/api/feed/users/${userId}/posts`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to load community posts."
      );
    }

    setPosts(data.posts || []);

  } catch (err) {

    console.error("Community posts error:", err);

    setError(err.message);

  } finally {

    setPostsLoading(false);

  }

}, []);
  /* ====================================================
   INITIAL LOAD
==================================================== */

useEffect(() => {

  async function start() {

    try {

      setLoading(true);

      const currentUser = await loadProfile();

      await Promise.all([
        loadSongs(),
        loadUserPosts(currentUser?.id),
      ]);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  }

  start();

}, [
  loadProfile,
  loadSongs,
  loadUserPosts,
]);

  /* ====================================================
     FOLLOWER COUNT SYNC
  ==================================================== */

  useEffect(() => {

    function handleCreatorFollowUpdated(event) {

      const {
        creatorId,
        following,
        followers,
        followers_count,
      } = event.detail || {};

      if (!creatorId) {
        return;
      }

      setUser((previousUser) => {

        if (!previousUser) {
          return previousUser;
        }

        const currentUserId =
          String(
            previousUser.id ??
            previousUser.user_id ??
            ""
          );

        if (
          currentUserId !==
          String(creatorId)
        ) {
          return previousUser;
        }

        const newFollowers =
          Number(
            followers_count ??
            followers ??
            0
          );

        return {
          ...previousUser,

          followers_count:
            newFollowers,

          followers:
            newFollowers,

          following:
            Boolean(following),
        };

      });

    }


    window.addEventListener(
      "creator-follow-updated",
      handleCreatorFollowUpdated
    );


    return () => {

      window.removeEventListener(
        "creator-follow-updated",
        handleCreatorFollowUpdated
      );

    };

  }, []);





  /* ====================================================
     GROUP SINGLES
  ==================================================== */

  const singles =
    songs.filter(
      (song) =>
        song.release_type ===
        "single"
    );


  /* ====================================================
     GROUP ALBUMS
  ==================================================== */

  const groupedAlbums =
    Object.values(

      songs
        .filter(
          (song) =>
            song.release_type ===
            "album"
        )
        .reduce(
          (acc, song) => {

            const key =
              song.album_name ||
              "Untitled Album";

            if (!acc[key]) {

              acc[key] = {

                album_name: key,

                cover:
                  song.cover,

                artist:
                  song.artist,

                album_id:
                  song.album_id ||
                  null,

                songs: [],

                plays: 0,

              };

            }

            acc[key].songs.push(song);

            acc[key].plays +=
              song.plays;

            return acc;

          },
          {}
        )

    );


  /* ====================================================
     GROUP EPS
  ==================================================== */

  const groupedEPs =
    Object.values(

      songs
        .filter(
          (song) =>
            song.release_type ===
            "ep"
        )
        .reduce(
          (acc, song) => {

            const key =
              song.album_name ||
              "Untitled EP";

            if (!acc[key]) {

              acc[key] = {

                album_name: key,

                cover:
                  song.cover,

                artist:
                  song.artist,

                songs: [],

                plays: 0,

              };

            }

            acc[key].songs.push(song);

            acc[key].plays +=
              song.plays;

            return acc;

          },
          {}
        )

    );


  /* ====================================================
     DELETE SONG
  ==================================================== */

  async function handleDeleteSong(song) {

    const confirmed =
      window.confirm(
        `Delete ${song.title}?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setDeletingSongId(song.id);

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
          "Unable to delete song"
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
        "Song deleted successfully."
      );

    } catch (err) {

      setError(err.message);

    } finally {

      setDeletingSongId(null);

    }

  }

  /* ====================================================
   LIKE / UNLIKE COMMUNITY POST
==================================================== */

async function handleTogglePostLike(post) {

  if (!getToken()) {
    setError("Please log in to like posts.");
    return;
  }

  try {

    setPostActionId(post.id);

    const response = await fetch(
      `${API_BASE_URL}/api/feed/posts/${post.id}/like`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to like post.");
    }

    setPosts(previous =>
      previous.map(item =>
        item.id === post.id
          ? {
              ...item,
              is_liked: data.liked,
              likes_count: data.likes_count,
            }
          : item
      )
    );

  } catch (err) {

    setError(err.message);

  } finally {

    setPostActionId(null);

  }

}


/* ====================================================
   RESHARE COMMUNITY POST
==================================================== */

async function handleResharePost(post) {

  if (!getToken()) {
    setError("Please log in to reshare posts.");
    return;
  }

  try {

    setPostActionId(post.id);

    const response = await fetch(
      `${API_BASE_URL}/api/feed/posts/${post.id}/reshare`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          share_text: "",
        }),
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to reshare post.");
    }

    setPosts(previous =>
      previous.map(item =>
        item.id === post.id
          ? {
              ...item,
              is_reshared: data.reshared,
              shares_count: data.shares_count,
            }
          : item
      )
    );

    setSuccessMessage(
      data.reshared
        ? "Post reshared successfully."
        : "Reshare removed successfully."
    );

  } catch (err) {

    setError(err.message);

  } finally {

    setPostActionId(null);

  }

}


/* ====================================================
   LOAD POST COMMENTS
==================================================== */

async function handleLoadComments(post) {

  const postId = post.id;

  const isExpanded = expandedComments[postId];

  if (isExpanded) {

    setExpandedComments(previous => ({
      ...previous,
      [postId]: false,
    }));

    return;

  }

  setExpandedComments(previous => ({
    ...previous,
    [postId]: true,
  }));

  // Use cached comments if already loaded.
  if (commentsByPost[postId]) {
    return;
  }

  try {

    setCommentLoading(previous => ({
      ...previous,
      [postId]: true,
    }));

    const response = await fetch(
      `${API_BASE_URL}/api/feed/posts/${postId}/comments`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to load comments.");
    }

    setCommentsByPost(previous => ({
      ...previous,
      [postId]: data.comments || [],
    }));

  } catch (err) {

    setError(err.message);

    setExpandedComments(previous => ({
      ...previous,
      [postId]: false,
    }));

  } finally {

    setCommentLoading(previous => ({
      ...previous,
      [postId]: false,
    }));

  }

}


/* ====================================================
   ADD POST COMMENT
==================================================== */

async function handleAddComment(post) {

  const postId = post.id;

  const content = (
    commentInputs[postId] || ""
  ).trim();

  if (!content) {
    return;
  }

  if (!getToken()) {
    setError("Please log in to comment.");
    return;
  }

  try {

    setCommentLoading(previous => ({
      ...previous,
      [postId]: true,
    }));

    const response = await fetch(
      `${API_BASE_URL}/api/feed/posts/${postId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          content,
        }),
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to add comment.");
    }

    // Refresh comments to obtain author information.
    const commentsResponse = await fetch(
      `${API_BASE_URL}/api/feed/posts/${postId}/comments`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const commentsData = await readJson(commentsResponse);

    if (!commentsResponse.ok) {
      throw new Error(
        commentsData.message || "Comment was added, but comments could not be refreshed."
      );
    }

    setCommentsByPost(previous => ({
      ...previous,
      [postId]: commentsData.comments || [],
    }));

    setCommentInputs(previous => ({
      ...previous,
      [postId]: "",
    }));

    setPosts(previous =>
      previous.map(item =>
        item.id === postId
          ? {
              ...item,
              comments_count: Number(item.comments_count || 0) + 1,
            }
          : item
      )
    );

  } catch (err) {

    setError(err.message);

  } finally {

    setCommentLoading(previous => ({
      ...previous,
      [postId]: false,
    }));

  }

}


/* ====================================================
   DELETE COMMUNITY POST
==================================================== */

async function handleDeletePost(post) {

  const confirmed = window.confirm(
    "Are you sure you want to permanently delete this community post?"
  );

  if (!confirmed) {
    return;
  }

  try {

    setDeletingPostId(post.id);

    const response = await fetch(
      `${API_BASE_URL}/api/feed/posts/${post.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete post.");
    }

    setPosts(previous =>
      previous.filter(item => item.id !== post.id)
    );

    setSuccessMessage("Community post deleted successfully.");

  } catch (err) {

    setError(err.message);

  } finally {

    setDeletingPostId(null);

  }

}

  /* ====================================================
     PUBLIC PROFILE
  ==================================================== */

  function handleViewPublicProfile() {

    if (!user?.id) {
      return;
    }

    navigate(
      `/creator/${user.role}/${user.id}`
    );

  }


  /* ====================================================
     STATS
  ==================================================== */

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


  /* ====================================================
     LOADING
  ==================================================== */

  if (loading) {

    return (

      <main className="page">

        <div className="songs-loading">

          <Loader2
            className="loading-spinner"
          />

          Loading Profile...

        </div>

      </main>

    );

  }


  /* ====================================================
     NO USER
  ==================================================== */

  if (!user) {

    return (

      <main className="page">

        <h1>
          Profile unavailable
        </h1>

        <p>
          {error ||
            "Unable to load your profile."}
        </p>

      </main>

    );

  }


  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <main className="page">


      <header className="page-header">

        <h1>
          Profile
        </h1>

        <p>
          Manage your Cave Tunes account.
        </p>

      </header>


      {successMessage && (

        <div className="profile-success">

          {successMessage}

        </div>

      )}


      {error && (

        <div className="error-message">

          {error}

        </div>

      )}


      {/* =================================================
          PROFILE CARD
      ================================================= */}

      <section className="profile-card">


        <div className="profile-avatar">

          {user.profile_image_url ? (

            <img
              src={getMediaUrl(
                user.profile_image_url
              )}
              alt={user.username}
            />

          ) : (

            <User size={45} />

          )}

        </div>


        <div className="profile-main-info">


          <div className="profile-username">

            <h2>
              {user.username}
            </h2>

<VerifiedBadge creator={user} />

          </div>


          <p className="profile-email">

            {user.email ||
              "No email"}

          </p>


          <div className="profile-followers">

            <User size={15} />

            <strong>
              {Number(
                user.followers_count
              ) || 0}
            </strong>

            <span>
              Followers
            </span>

          </div>


          <span
            className={
              `profile-role-badge ${user.role}`
            }
          >
            {user.role}
          </span>

        </div>


        {/* =================================================
            PROFILE ACTIONS
        ================================================= */}

      <div className="profile-card-actions">

  <button
    type="button"
    className="profile-settings-button"
    onClick={() => navigate("/settings")}
    aria-label="Settings"
    title="Settings"
  >
    <Settings size={17} />
    <span>Settings</span>
  </button>

  <button
    type="button"
    className="view-public-profile-button"
    onClick={handleViewPublicProfile}
    aria-label="Public Profile"
    title="Public Profile"
  >
    <Eye size={17} />
    <span>Public Profile</span>
  </button>

</div>


      </section>

{/* =================================================
    PROFILE COMPLETION REMINDER
================================================= */}

{user.profile_completed !== undefined &&
  !isEnabled(user.profile_completed) && (
    <section className="profile-completion-reminder">

      <div className="profile-reminder-icon">
        <User size={22} />
      </div>

      <div className="profile-reminder-content">
        <strong>Complete Your Profile</strong>

        <p>
          Go to Settings, then Edit Profile to complete your profile.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/settings")}
      >
        Go to Settings
      </button>

    </section>
)}

{/* =================================================
    PREMIUM MEMBERSHIP MINI SECTION
================================================= */}

{isPremium && (
  <section
    className="profile-premium-mini"
    style={{
      background:
        "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
      borderRadius: "16px",
      padding: "18px 22px",
      marginTop: "20px",
      marginBottom: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "16px",
      boxShadow: "0 10px 28px rgba(139, 92, 246, 0.2)",
      color: "#fff",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          minWidth: "44px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
        }}
      >
        ✦
      </div>

      <div>
        <strong
          style={{
            display: "block",
            fontSize: "16px",
            fontWeight: 800,
            marginBottom: "5px",
          }}
        >
          Cave Tunes Premium
        </strong>

        <span
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          You're enjoying an active Premium membership.
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={() => navigate("/premium")}
      style={{
        background: "#fff",
        color: "#9333ea",
        border: "none",
        borderRadius: "30px",
        padding: "11px 19px",
        fontSize: "13px",
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Check Duration →
    </button>
  </section>
)}

      {/* =================================================
          STATS
      ================================================= */}

      <section className="profile-stats">


        <div className="profile-stat">

          <Music2 />

          <strong>
            {songs.length}
          </strong>

          <span>
            Songs
          </span>

        </div>


        <div className="profile-stat">

          <Play />

          <strong>
            {totalPlays}
          </strong>

          <span>
            Plays
          </span>

        </div>


        <div className="profile-stat">

          <Download />

          <strong>
            {totalDownloads}
          </strong>

          <span>
            Downloads
          </span>

        </div>
      {/* =================================================
          PROFILE BIO
      ================================================= */}

      <section className="profile-bio-display">

        <div className="profile-bio-header">
          <h2>About Me</h2>
        </div>

        <div className="profile-bio-content">

          {user.bio && user.bio.trim() ? (

            <p>{user.bio}</p>

          ) : (

            <p className="profile-bio-empty">
              This user hasn't added a bio yet.
            </p>

          )}

        </div>

      </section>
      <ProfileSocialLinks links={user.social_links} />
      </section>


      {/* =================================================
          SONGS
      ================================================= */}

      {songsLoading ? (

        <div className="songs-loading">

          <Loader2
            className="loading-spinner"
          />

          Loading songs...

        </div>

      ) : (

        <>


         

          {/* =============================================
              SINGLES
          ============================================= */}

          <SongSection
            title="My Singles"
            songs={singles}
            currentSong={currentSong}
            isPlaying={isPlaying}
            playSong={handlePlaySong}
            pauseSong={pauseSong}
            handleDeleteSong={
              handleDeleteSong
            }
            deletingSongId={
              deletingSongId
            }
          />


          {/* =============================================
              ALBUMS
          ============================================= */}
<div className="my-albums-section">
          <AlbumSection
  title="My Albums"
  albums={groupedAlbums}
  navigate={navigate}
  type="album"
/>
</div>

          {/* =============================================
              EPS
          ============================================= */}
<div className="my-ep-section">
        <AlbumSection
  title="My EPs"
  albums={groupedEPs}
  navigate={navigate}
  type="ep"
/>
</div>

        </>

      )}
{/* =================================================
    MY COMMUNITY POSTS
================================================= */}

<section className="community-posts-section">

  <div className="community-posts-header">

    <div>

      <h2>My Community Posts</h2>

      <p>
        Posts you have published on the Cave Tunes Community Feed.
      </p>

    </div>

    <span className="community-post-count">
      {posts.length} Posts
    </span>

  </div>


  {postsLoading ? (

    <div className="community-post-loading">

      <Loader2 className="loading-spinner" />

      Loading your community posts...

    </div>

  ) : posts.length === 0 ? (

    <div className="community-post-empty">

      <MessageCircle size={38} />

      <h3>No community posts yet</h3>

      <p>
        Your posts from the Cave Tunes Community Feed will appear here.
      </p>

      <button
        type="button"
        onClick={() => navigate("/feed")}
      >
        Visit Community Feed
      </button>

    </div>

  ) : (

    <div className="community-post-list">

      {posts.map(post => (

        <article
          key={post.id}
          className="community-post-card"
        >

          {/* POST HEADER */}

          <div className="community-post-author">

            <div className="community-post-avatar">

              {post.profile_image_url || post.profile_image ? (

                <img
                  src={getMediaUrl(
                    post.profile_image_url ||
                    post.profile_image
                  )}
                  alt={post.username || "User"}
                />

              ) : (

                <User size={22} />

              )}

            </div>

            <div className="community-post-author-info">

        <div className="username-verified-badge">
                    <strong>
                      {post.username || user.username}
                    </strong>
<VerifiedBadge creator={post} />
       </div>
              <span>
                {post.created_at
                  ? new Date(post.created_at).toLocaleString()
                  : ""}
              </span>

            </div>

            <button
              type="button"
              className="community-delete-button"
              disabled={deletingPostId === post.id}
              onClick={() => handleDeletePost(post)}
              title="Delete post"
            >

              {deletingPostId === post.id ? (
                <Loader2 className="loading-spinner" size={17} />
              ) : (
                <Trash2 size={17} />
              )}

            </button>

          </div>


          {/* POST TEXT */}

          {post.content && (

            <p className="community-post-content">
              {post.content}
            </p>

          )}


          {/* POST LINK */}

          {post.link_url && (

            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="community-post-link"
            >
              {post.link_url}
            </a>

          )}


          {/* POST IMAGES */}

          {post.images?.length > 0 && (

            <div
              className={
                `community-post-images ${
                  post.images.length === 1
                    ? "single-community-image"
                    : ""
                }`
              }
            >

              {post.images.map(image => (

                <a
                  key={image.id}
                  href={getMediaUrl(image.image_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >

                  <img
                    src={getMediaUrl(image.image_url)}
                    alt="Community post"
                    loading="lazy"
                  />

                </a>

              ))}

            </div>

          )}


          {/* POST COUNTS */}

          <div className="community-post-stats">

            <span>
              {Number(post.likes_count || 0)} likes
            </span>

            <span>
              {Number(post.comments_count || 0)} comments
            </span>

            <span>
              {Number(post.shares_count || 0)} reshares
            </span>

          </div>


          {/* POST ACTIONS */}

          <div className="community-post-actions">

            <button
              type="button"
              className={post.is_liked ? "post-action-liked" : ""}
              disabled={postActionId === post.id}
              onClick={() => handleTogglePostLike(post)}
            >

              <Heart
                size={18}
                fill={post.is_liked ? "currentColor" : "none"}
              />

              Like

            </button>


            <button
              type="button"
              onClick={() => handleLoadComments(post)}
            >

              <MessageCircle size={18} />

              Comment

            </button>


            <button
              type="button"
              className={post.is_reshared ? "post-action-reshared" : ""}
              disabled={postActionId === post.id}
              onClick={() => handleResharePost(post)}
            >

              <Repeat2 size={18} />

              {post.is_reshared ? "Reshared" : "Reshare"}

            </button>

          </div>


          {/* COMMENTS */}

          {expandedComments[post.id] && (

            <div className="community-comments">

              {commentLoading[post.id] && !commentsByPost[post.id] ? (

                <div className="community-comment-loading">

                  <Loader2 className="loading-spinner" />

                  Loading comments...

                </div>

              ) : (

                <>

                  <div className="community-comments-list">

                    {(commentsByPost[post.id] || []).map(comment => (

                      <div
                        key={comment.id}
                        className="community-comment"
                      >

                        <div className="community-comment-avatar">

                          {comment.profile_image_url || comment.profile_image ? (

                            <img
                              src={getMediaUrl(
                                comment.profile_image_url ||
                                comment.profile_image
                              )}
                              alt={comment.username || "User"}
                            />

                          ) : (

                            <User size={15} />

                          )}

                        </div>

                        <div className="community-comment-body">
                          <div className="comment-plus-badge">
                              <strong>
                                {comment.username || "Cave Tunes User"}
                              </strong>
<VerifiedBadge creator={comment} />
                            </div>
                          <p>
                            {comment.content}
                          </p>

                          <span>
                            {comment.created_at
                              ? new Date(comment.created_at).toLocaleString()
                              : ""}
                          </span>

                        </div>

                      </div>

                    ))}


                    {(commentsByPost[post.id] || []).length === 0 && (

                      <p className="community-no-comments">
                        No comments yet. Start the conversation.
                      </p>

                    )}

                  </div>


                  {/* ADD COMMENT */}

                  <form
                    className="community-comment-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleAddComment(post);
                    }}
                  >

                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(event) => {

                        const value = event.target.value;

                        setCommentInputs(previous => ({
                          ...previous,
                          [post.id]: value,
                        }));

                      }}
                    />

                    <button
                      type="submit"
                      disabled={
                        !commentInputs[post.id]?.trim() ||
                        commentLoading[post.id]
                      }
                    >

                      {commentLoading[post.id] ? (
                        <Loader2 className="loading-spinner" size={18} />
                      ) : (
                        <Send size={18} />
                      )}

                    </button>

                  </form>

                </>

              )}

            </div>

          )}

        </article>

      ))}

    </div>

  )}

</section>
    </main>

  );

}