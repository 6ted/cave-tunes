import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
import {
  Fragment,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Disc3,
  Download,
  Headphones,
  Megaphone,
  Heart,
  LayoutDashboard,
  LogOut,
  Music2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import "../styles/AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { usePlayer } from "../context/usePlayer";

// ======================================================
// MEDIA URL
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;



function getMediaUrl(url){

  if(!url){

    return "";

  }


  const value =
    String(url).trim();



  if(
    value.startsWith("http") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ){

    return value;

  }



  if(value.startsWith("/")){

    return `${API_BASE_URL}${value}`;

  }


  return `${API_BASE_URL}/${value}`;

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
          width="20"
          height="20"
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
          width="20"
          height="20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 17L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
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

  return null;
}

import {
getAdminDashboard,
getAdminUsers,
getAdminSongs,
getAdminTopSongs,



deleteAdminUser,
deleteAdminSong,
updateAdminStatus,
updateAdminUserRole,

} from "../services/api";

function AdminDashboard() {

const navigate = useNavigate();

const {
user,
loading: authLoading,
logout,
refreshUser,
} = useAuth();

const {
  playSong: playGlobalSong,
  setFullPlayerOpen,
} = usePlayer();

const toggleCollection = (collectionKey) => {
  setExpandedCollections((previous) => {
    const updated = new Set(previous);

    if (updated.has(collectionKey)) {
      updated.delete(collectionKey);
    } else {
      updated.add(collectionKey);
    }

    return updated;
  });
};


// ======================================================
// STATE
// ======================================================

const [dashboard, setDashboard] =
useState(null);


const [users, setUsers] =
useState([]);

const [songs, setSongs] =
useState([]);

const [topSongs, setTopSongs] =
useState([]);

const [expandedCollections, setExpandedCollections] = useState(
  new Set()
);

// ======================================================
// LOADING STATES
// ======================================================


const [loading, setLoading] =
useState(true);

const [error, setError] =
useState("");

const [actionLoading, setActionLoading] =
useState(false);



// ======================================================
// ADMIN CHECK
// ======================================================

const isAdmin =
user?.is_admin === true ||
user?.is_admin === "true";

// ======================================================
// LOAD DASHBOARD
// ======================================================

const loadDashboard = useCallback(
async () => {


  const response =
    await getAdminDashboard();

  setDashboard(
    response?.stats || {}
  );

},
[]


);

const stats = dashboard || {};

// ======================================================
// GROUP ALBUMS AND EPS
// ======================================================

const musicLibraryItems = [];
const collectionMap = new Map();

songs.forEach((song) => {
  const releaseType = String(
    song.release_type || "single"
  ).toLowerCase().trim();

  const albumName = String(
    song.album_name || ""
  ).trim();

  const isCollection =
    (releaseType === "album" || releaseType === "ep") &&
    albumName.length > 0;

  // Singles and songs without an album name stay separate.
  if (!isCollection) {
    musicLibraryItems.push({
      type: "song",
      song,
    });

    return;
  }

  // Separate collections by uploader, release type and name.
  const collectionKey = [
    song.user_id ?? "unknown",
    releaseType,
    albumName.toLowerCase(),
  ].join("::");

  if (!collectionMap.has(collectionKey)) {
    const collection = {
      key: collectionKey,
      title: albumName,
      releaseType,
      artist: song.artist_name || "Unknown Artist",
      cover: song.cover_url,
      songs: [],
    };

    collectionMap.set(collectionKey, collection);

    musicLibraryItems.push({
      type: "collection",
      collection,
    });
  }

  collectionMap.get(collectionKey).songs.push(song);
});

// ======================================================
// LOAD USERS
// ======================================================

const loadUsers = useCallback(
async () => {


  const response =
    await getAdminUsers();

  setUsers(
    Array.isArray(response?.users)
      ? response.users
      : []
  );

},
[]


);

// ======================================================
// LOAD SONGS
// ======================================================

const loadSongs = useCallback(
async () => {


  const response =
    await getAdminSongs();

  setSongs(
    Array.isArray(response?.songs)
      ? response.songs
      : []
  );

},
[]


);

// ======================================================
// LOAD TOP SONGS
// ======================================================

const loadTopSongs = useCallback(
async () => {


  const response =
    await getAdminTopSongs();

  setTopSongs(
    Array.isArray(response?.songs)
      ? response.songs
      : []
  );

},
[]


);



// ======================================================
// LOAD EVERYTHING
// ======================================================

const loadAll = useCallback(
async () => {


  try {

    setError("");
    setLoading(true);

   await Promise.all([

loadDashboard(),

loadUsers(),

loadSongs(),

loadTopSongs(),



]);

  }

  catch (loadError) {

    console.error(
      "ADMIN DASHBOARD LOAD ERROR:",
      loadError
    );

    setError(
      loadError?.message ||
      "Unable to load administrator dashboard."
    );

  }

  finally {

    setLoading(false);

  }

},
[
loadDashboard,
loadUsers,
loadSongs,
loadTopSongs,


]


);


// ======================================================
// AUTH + INITIAL LOAD
// ======================================================

useEffect(() => {


if (authLoading) {
  return;
}


// ----------------------------------------------------
// Not logged in
// ----------------------------------------------------

if (!user) {

  navigate(
    "/login",
    {
      replace: true,
    }
  );

  return;
}


// ----------------------------------------------------
// Logged in but not admin
// ----------------------------------------------------

if (!isAdmin) {

  navigate(
    "/profile",
    {
      replace: true,
    }
  );

  return;
}


// ----------------------------------------------------
// Load asynchronously after effect begins.
//
// This avoids the React Hooks
// set-state-in-effect warning.
// ----------------------------------------------------

const timer =
  setTimeout(() => {

    void loadAll();

  }, 0);


return () => {

  clearTimeout(timer);

};


}, [
authLoading,
user,
isAdmin,
navigate,
loadAll,
]);

// ======================================================
// REFRESH
// ======================================================

const handleRefresh = async () => {


try {

  setError("");
  setLoading(true);

  await refreshUser();

  await loadAll();

}

catch (refreshError) {

  console.error(
    "ADMIN REFRESH ERROR:",
    refreshError
  );

  setError(
    refreshError?.message ||
    "Unable to refresh dashboard."
  );

}

finally {

  setLoading(false);

}


};

// ======================================================
// NORMALIZE ADMIN SONG FOR GLOBAL PLAYER
// ======================================================

const normalizeAdminSong = (song) => ({
  ...song,

  id: song.id,

  title:
    song.title ||
    song.song_title ||
    "Untitled",

  artist:
    song.artist_name ||
    song.artist ||
    "Unknown Artist",

  artist_name:
    song.artist_name ||
    song.artist ||
    "Unknown Artist",

  cover_url: getMediaUrl(
    song.cover_url ||
    song.cover_image_url
  ),

  cover_image_url: getMediaUrl(
    song.cover_image_url ||
    song.cover_url
  ),

  audio_url: getMediaUrl(
    song.audio_url
  ),

  release_type:
    song.release_type ||
    "Single",

  plays: Number(song.plays || 0),

  downloads: Number(song.downloads || 0),

  featured_artists:
    song.featured_artists ||
    song.featuredArtists ||
    [],
});


// ======================================================
// PLAY SONG IN FULL PLAYER
// ======================================================

const handlePlaySong = (selectedSong, songList) => {

  const normalizedSongs = songList.map(
    normalizeAdminSong
  );

  const normalizedSong = normalizeAdminSong(
    selectedSong
  );

  const result = playGlobalSong(
    normalizedSong,
    normalizedSongs
  );

  setFullPlayerOpen(true);

  return result;
};


// ======================================================
// OPEN CREATOR PROFILE
// ======================================================

const handleViewUser = (selectedUser) => {

  if (!selectedUser?.id) {
    return;
  }

  const role = selectedUser.role || "listener";

  navigate(
    `/creator/${role}/${selectedUser.id}`
  );

};

// ======================================================
// DELETE USER
// ======================================================

const handleDeleteUser = async (
userId,
username
) => {


const confirmed =
  window.confirm(
    `Delete user "${username || "this user"}"? This action cannot be undone.`
  );

if (!confirmed) {
  return;
}


try {

  setActionLoading(true);
  setError("");

  await deleteAdminUser(
    userId
  );

  await loadUsers();
  await loadDashboard();

}

catch (deleteError) {

  console.error(
    "DELETE USER ERROR:",
    deleteError
  );

  setError(
    deleteError?.message ||
    "Unable to delete user."
  );

}

finally {

  setActionLoading(false);

}


};

// ======================================================
// DELETE SONG
// ======================================================

const handleDeleteSong = async (
songId,
title
) => {


const confirmed =
  window.confirm(
    `Delete "${title || "this song"}"? This action cannot be undone.`
  );

if (!confirmed) {
  return;
}


try {

  setActionLoading(true);
  setError("");

  await deleteAdminSong(
    songId
  );

  await loadSongs();
  await loadTopSongs();
  await loadDashboard();

}

catch (deleteError) {

  console.error(
    "DELETE SONG ERROR:",
    deleteError
  );

  setError(
    deleteError?.message ||
    "Unable to delete song."
  );

}

finally {

  setActionLoading(false);

}


};

// ======================================================
// TOGGLE ADMIN
// ======================================================

const handleToggleAdmin = async (
selectedUser
) => {


const currentlyAdmin =
  selectedUser.is_admin === true ||
  selectedUser.is_admin === "true";


try {

  setActionLoading(true);
  setError("");

  await updateAdminStatus(
    selectedUser.id,
    !currentlyAdmin
  );

  await loadUsers();

}

catch (adminError) {

  console.error(
    "UPDATE ADMIN ERROR:",
    adminError
  );

  setError(
    adminError?.message ||
    "Unable to update administrator status."
  );

}

finally {

  setActionLoading(false);

}


};

// ======================================================
// CHANGE ROLE
// ======================================================

const handleRoleChange = async (
selectedUser,
role
) => {


try {

  setActionLoading(true);
  setError("");

  await updateAdminUserRole(
    selectedUser.id,
    role
  );

  await loadUsers();

}

catch (roleError) {

  console.error(
    "UPDATE ROLE ERROR:",
    roleError
  );

  setError(
    roleError?.message ||
    "Unable to update user role."
  );

}

finally {

  setActionLoading(false);

}


};



// ======================================================
// LOGOUT
// ======================================================

const handleLogout = () => {


logout();

navigate(
  "/login",
  {
    replace: true,
  }
);


};

// ======================================================
// AUTH LOADING
// ======================================================

if (authLoading) {


return (

  <main className="admin-page">

    <div className="admin-loading">

      <RefreshCw
        size={28}
        className="admin-spin"
      />

      <p>
        Checking administrator access...
      </p>

    </div>

  </main>

);


}

// ======================================================
// NOT ADMIN
// ======================================================

if (!user || !isAdmin) {


return null;


}



// ======================================================
// PAGE
// ======================================================

return (


<main className="admin-page">

  {/* ==================================================
      HEADER
  ================================================== */}

  <header className="admin-header">

    <div className="admin-brand">

      <div className="admin-logo">

      <img
              src="/Cave-Tunes-logo-circular.png"
              alt="Cave Tunes"
              className="home-hero-brand-logo"
            />

      </div>

      <div>

        <strong>
          Cave Tunes
        </strong>

        <span>
          Administration
        </span>

      </div>

    </div>


    <div className="admin-header-actions">

      <button
        type="button"
        className="admin-refresh-button"
        onClick={handleRefresh}
        disabled={loading}
      >

        <RefreshCw
          size={17}
          className={
            loading
              ? "admin-spin"
              : ""
          }
        />

        Refresh

      </button>


      <button
        type="button"
        className="admin-logout-button"
        onClick={handleLogout}
      >

        <LogOut size={17} />

        Logout

      </button>

    </div>

  </header>


  {/* ==================================================
      CONTENT
  ================================================== */}

  <section className="admin-content">


    {/* ==================================================
        WELCOME
    ================================================== */}

    <div className="admin-welcome">

      <div>

        <div className="admin-title-row">

          <ShieldCheck
            size={26}
          />

          <h1>
            Admin Dashboard
          </h1>

        </div>

        <p>
          Welcome back,{" "}
          <strong>
            {user.username}
          </strong>.
          Manage Cave Tunes from one place.
        </p>

      </div>


      <div className="admin-status">

        <span />

        Administrator

      </div>

    </div>


    {/* ==================================================
        ERROR
    ================================================== */}

    {error && (

      <div
        className="admin-error"
        role="alert"
      >

        <UserX size={18} />

        <span>
          {error}
        </span>

      </div>

    )}


    {/* ==================================================
        STATISTICS
    ================================================== */}

    <div className="admin-stats-grid">


      {/* USERS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Users size={22} />

        </div>

        <div>

          <span>
            Total Users
          </span>

          <strong>
            {stats.users ?? 0}
          </strong>

        </div>

      </div>


      {/* ARTISTS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <UserCheck size={22} />

        </div>

        <div>

          <span>
            Artists
          </span>

          <strong>
            {stats.artists ?? 0}
          </strong>

        </div>

      </div>


      {/* LISTENERS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Headphones size={22} />

        </div>

        <div>

          <span>
            Listeners
          </span>

          <strong>
            {stats.listeners ?? 0}
          </strong>

        </div>

      </div>


      {/* SONGS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Music2 size={22} />

        </div>

        <div>

          <span>
            Total Songs
          </span>

          <strong>
            {stats.songs ?? 0}
          </strong>

        </div>

      </div>


      {/* ALBUMS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Disc3 size={22} />

        </div>

        <div>

          <span>
            Albums
          </span>

          <strong>
            {stats.albums ?? 0}
          </strong>

        </div>

      </div>


      {/* PLAYS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <BarChart3 size={22} />

        </div>

        <div>

          <span>
            Total Plays
          </span>

          <strong>
            {stats.plays ?? 0}
          </strong>

        </div>

      </div>


      {/* LIKES */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Heart size={22} />

        </div>

        <div>

          <span>
            Likes
          </span>

          <strong>
            {stats.likes ?? 0}
          </strong>

        </div>

      </div>


      {/* DOWNLOADS */}

      <div className="admin-stat-card">

        <div className="admin-stat-icon">

          <Download size={22} />

        </div>

        <div>

          <span>
            Downloads
          </span>

          <strong>
            {stats.downloads ?? 0}
          </strong>

        </div>

      </div>

    </div>


    {/* ==================================================
        RECENT USERS
    ================================================== */}

    <section className="admin-panel">

      <div className="admin-panel-header">

        <div>

          <h2>
            Recent Users
          </h2>

          <p>
            Recently registered Cave Tunes accounts.
          </p>

        </div>

        <Users size={21} />

      </div>


      <div className="admin-table-wrapper">

        <table className="admin-table">

          <thead>

            <tr>

              <th>
                User
              </th>

              <th>
                Email
              </th>

              <th>
                Role
              </th>

              <th>
                Admin
              </th>

              <th>
                Country
              </th>

              <th>
                Actions
              </th>

            </tr>

          </thead>



<tbody>
  {users.length === 0 ? (
    <tr>
      <td colSpan="6" className="admin-empty">
        No users found.
      </td>
    </tr>
  ) : (
    users.map((selectedUser) => {
      const currentlyAdmin =
        selectedUser.is_admin === true ||
        selectedUser.is_admin === "true";

      return (
        <tr key={selectedUser.id}>
          {/* USER */}
          <td>
            <div className="admin-song-table-cell">
              <strong>
                {selectedUser.username || "Unknown User"}
              </strong>

              <VerifiedBadge
                verificationLevel={
                  selectedUser.verification_level ||
                  selectedUser.verificationLevel
                }
                verified={selectedUser.verified}
              />
            </div>
          </td>

          {/* EMAIL */}
          <td>
            {selectedUser.email || "No email"}
          </td>

          {/* ROLE */}
          <td>
            <select
              value={selectedUser.role || "listener"}
              onChange={(event) =>
                handleRoleChange(
                  selectedUser,
                  event.target.value
                )
              }
              disabled={actionLoading}
              aria-label={`Change role for ${selectedUser.username}`}
            >
              <option value="listener">Listener</option>
              <option value="artist">Artist</option>
            </select>
          </td>

          {/* ADMIN STATUS */}
          <td>
            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                handleToggleAdmin(selectedUser)
              }
              disabled={actionLoading}
            >
              {currentlyAdmin ? "Admin" : "Make Admin"}
            </button>
          </td>

          {/* COUNTRY */}
          <td>
            {selectedUser.country || "Unknown"}
          </td>

          {/* ACTIONS */}
          <td>
            <div className="admin-action-buttons">
              <button
                type="button"
                className="admin-action-button"
                onClick={() =>
                  handleViewUser(selectedUser)
                }
                title="View user profile"
              >
                View
              </button>

              <button
                type="button"
                className="admin-delete-button"
                onClick={() =>
                  handleDeleteUser(
                    selectedUser.id,
                    selectedUser.username
                  )
                }
                disabled={actionLoading}
                title="Delete user"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    })
  )}
</tbody>

        </table>

      </div>

    </section>


    {/* ==================================================
        TOP SONGS
    ================================================== */}

    <section className="admin-panel">

      <div className="admin-panel-header">

        <div>

          <h2>
            Top Songs
          </h2>

          <p>
            Most played and liked music.
          </p>

        </div>

        <BarChart3 size={21} />

      </div>


      <div className="admin-top-songs">

        {topSongs.length === 0 ? (

          <div className="admin-empty-card">
            No songs available.
          </div>

        ) : (

          topSongs.map(
            (song, index) => (

             <div
  className="admin-song-row admin-clickable-row"
  key={song.id}
  onClick={() => handlePlaySong(song, topSongs)}
  role="button"
  tabIndex={0}
  title="Play song"
  onKeyDown={(event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handlePlaySong(song, topSongs);
    }
  }}
>

                <div className="admin-song-rank">
                  #{index + 1}
                </div>


                <div className="admin-song-cover">

                 {getMediaUrl(song.cover_url) ? (

                   <img
                    src={
                      getMediaUrl(
                        song.cover_url
                      )
                    }
                    alt={song.title}
                    />

                  ) : (

                    <Music2
                      size={20}
                    />

                  )}

                </div>


                <div className="admin-song-info">

                  <strong>
                    {song.title ||
                      song.song_title ||
                      "Untitled"}
                  </strong>

                  <span>
                    {song.artist_name ||
                      "Unknown Artist"}
                  </span>

                </div>


                <div className="admin-song-stat">

                  <Headphones
                    size={15}
                  />

                  {song.plays ?? 0}

                </div>


                <div className="admin-song-stat">

                  <Heart
                    size={15}
                  />

                  {song.likes ?? 0}

                </div>

              </div>

            )

          )

        )}

      </div>

    </section>


    {/* ==================================================
        ALL MUSIC
    ================================================== */}

    <section className="admin-panel">

      <div className="admin-panel-header">

        <div>

          <h2>
            Music Library
          </h2>

          <p>
            Manage songs uploaded to Cave Tunes.
          </p>

        </div>

        <Music2 size={21} />

      </div>


      <div className="admin-table-wrapper">

        <table className="admin-table">

          <thead>

            <tr>

              <th>
                Song
              </th>

              <th>
                Artist
              </th>

              <th>
                Type
              </th>

              <th>
                Plays
              </th>

              <th>
                Likes
              </th>

              <th>
                Downloads
              </th>

              <th>
                Actions
              </th>

            </tr>

          </thead>


         
<tbody>
  {musicLibraryItems.length === 0 ? (
    <tr>
      <td colSpan="7" className="admin-empty">
        No songs found.
      </td>
    </tr>
  ) : (
    musicLibraryItems.map((item) => {
      // ==========================================
      // ALBUM / EP COLLECTION
      // ==========================================

      if (item.type === "collection") {
        const collection = item.collection;

        const expanded = expandedCollections.has(
          collection.key
        );

        const totalPlays = collection.songs.reduce(
          (total, song) =>
            total + Number(song.plays || 0),
          0
        );

        const totalLikes = collection.songs.reduce(
          (total, song) =>
            total + Number(song.likes || 0),
          0
        );

        const totalDownloads = collection.songs.reduce(
          (total, song) =>
            total + Number(song.downloads || 0),
          0
        );

        return (
          <Fragment key={collection.key}>
            {/* COLLECTION HEADER */}

            <tr className="admin-collection-row">
              <td>
                <div className="admin-collection-title">
                  <button
                    type="button"
                    className="admin-collection-toggle"
                    onClick={() =>
                      toggleCollection(collection.key)
                    }
                    aria-expanded={expanded}
                    title={
                      expanded
                        ? "Collapse collection"
                        : "Expand collection"
                    }
                  >
                    {expanded ? (
                      <ChevronDown size={19} />
                    ) : (
                      <ChevronRight size={19} />
                    )}
                  </button>

                  <div className="admin-small-cover">
                    {getMediaUrl(collection.cover) ? (
                      <img
                        src={getMediaUrl(collection.cover)}
                        alt={collection.title}
                      />
                    ) : (
                      <Disc3 size={18} />
                    )}
                  </div>

                  <div className="admin-collection-info">
                    <strong>{collection.title}</strong>

                    <span>
                      {collection.songs.length}{" "}
                      {collection.songs.length === 1
                        ? "track"
                        : "tracks"}
                    </span>
                  </div>
                </div>
              </td>

              <td>{collection.artist}</td>

              <td>
                <span className="admin-collection-badge">
                  {collection.releaseType === "ep"
                    ? "EP"
                    : "Album"}
                </span>
              </td>

              <td>{totalPlays}</td>
              <td>{totalLikes}</td>
              <td>{totalDownloads}</td>

              <td>
                <span className="admin-collection-count">
                  {expanded ? "Expanded" : "View tracks"}
                </span>
              </td>
            </tr>

            {/* EXPANDED TRACKS */}

            {expanded &&
              collection.songs.map((song, index) => (
                <tr
                  key={song.id}
                  className="admin-collection-track-row admin-clickable-row"
                  onClick={() =>
                    handlePlaySong(song, songs)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      handlePlaySong(song, songs);
                    }
                  }}
                  tabIndex={0}
                  title="Play song"
                >
                  <td>
                    <div className="admin-song-table-cell admin-track-cell">
                      <span className="admin-track-number">
                        {index + 1}
                      </span>

                      <div className="admin-small-cover">
                        {getMediaUrl(song.cover_url) ? (
                          <img
                            src={getMediaUrl(song.cover_url)}
                            alt={song.title || "Song"}
                          />
                        ) : (
                          <Music2 size={17} />
                        )}
                      </div>

                      <strong>
                        {song.title ||
                          song.song_title ||
                          "Untitled"}
                      </strong>
                    </div>
                  </td>

                  <td>
                    {song.artist_name || "Unknown"}
                  </td>

                  <td>Track</td>

                  <td>{song.plays ?? 0}</td>
                  <td>{song.likes ?? 0}</td>
                  <td>{song.downloads ?? 0}</td>

                  <td>
                    <button
                      type="button"
                      className="admin-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();

                        handleDeleteSong(
                          song.id,
                          song.title || song.song_title
                        );
                      }}
                      disabled={actionLoading}
                      title="Delete song"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
          </Fragment>
        );
      }

      // ==========================================
      // INDIVIDUAL SINGLE
      // ==========================================

      const song = item.song;

      return (
        <tr
          key={song.id}
          className="admin-clickable-row"
          onClick={() => handlePlaySong(song, songs)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              handlePlaySong(song, songs);
            }
          }}
          tabIndex={0}
          title="Play song"
        >
          <td>
            <div className="admin-song-table-cell">
              <div className="admin-small-cover">
                {getMediaUrl(song.cover_url) ? (
                  <img
                    src={getMediaUrl(song.cover_url)}
                    alt={song.title || "Song"}
                  />
                ) : (
                  <Music2 size={17} />
                )}
              </div>

              <strong>
                {song.title ||
                  song.song_title ||
                  "Untitled"}
              </strong>
            </div>
          </td>

          <td>{song.artist_name || "Unknown"}</td>

          <td>{song.release_type || "Single"}</td>

          <td>{song.plays ?? 0}</td>
          <td>{song.likes ?? 0}</td>
          <td>{song.downloads ?? 0}</td>

          <td>
            <button
              type="button"
              className="admin-delete-button"
              onClick={(event) => {
                event.stopPropagation();

                handleDeleteSong(
                  song.id,
                  song.title || song.song_title
                );
              }}
              disabled={actionLoading}
              title="Delete song"
            >
              <Trash2 size={16} />
            </button>
          </td>
        </tr>
      );
    })
  )}
</tbody>


        </table>

      </div>

    </section>


<br></br>
   {/* ==================================================
       NAVIGATION TO REQUEST PAGES
    ================================================== */}

<div
    className="admin-stat-card admin-clickable"
    onClick={() => navigate("/admin-requests")}
>
    <div className="admin-stat-icon">
        <ShieldCheck size={22} />
    </div>

    <div>
        <span>Manage Requests</span>
        <strong>Open</strong>
    </div>
</div>
<br></br>
{/* ==================================================
    ADVERTISEMENT MANAGER
================================================== */}

<div
    className="admin-stat-card admin-clickable"
    onClick={() => navigate("/admin-ads")}
>

    <div className="admin-stat-icon">

        <Megaphone size={22} />

    </div>

    <div>

        <span>
            Advertisement Manager
        </span>

        <strong>
            Manage Ads
        </strong>

    </div>

</div>
<br></br>
  {/* ==================================================
       NAVIGATION TO ADMIN ANALYTICS
    ================================================== */}

<div
    className="admin-stat-card admin-clickable"
    onClick={() => navigate("/admin-analytics")}
>
    <div className="admin-stat-icon">
        <ShieldCheck size={22} />
    </div>

    <div>
        <span>View Analytics</span>
        <strong>Open Analytics</strong>
    </div>
</div>
<br></br>

  {/* ==================================================
       NAVIGATION TO ADMIN NOTIFICATION
    ================================================== */}

<div
    className="admin-stat-card admin-clickable"
    onClick={() => navigate("/admin-notifications")}
>
    <div className="admin-stat-icon">
        <ShieldCheck size={22} />
    </div>

    <div>
        <span>Notifications Panel</span>
        <strong>View panel</strong>
    </div>
</div>
<br></br>

    {/* ==================================================
        FOOTER
    ================================================== */}

    <footer className="admin-footer">

      <LayoutDashboard
        size={16}
      />

      <span>
        Cave Tunes Administration
      </span>

      <span>
        •
      </span>

      <span>
        Administrator:
        {" "}
        {user.username}
      </span>

    </footer>

  </section>

</main>


);

}

export default AdminDashboard;
