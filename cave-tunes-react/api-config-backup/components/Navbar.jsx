import {
  Bell,
  Search,
  UserCircle,
  LogIn,
  X,
  Music2,
  Play,
  Loader2,
   Users,
    BadgeCheck,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./Navbar.css";

import { useAuth } from "../context/useAuth";
import { PlayerContext } from "../context/PlayerContext";
import { useYouTubePlayer } from "../context/YouTubePlayerContext";
import {
  getMediaUrl,
  getSongs,
} from "../services/api";

// ======================================================
// API
// ======================================================

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;

// ======================================================
// SEARCH SETTINGS
// ======================================================

const SEARCH_DEBOUNCE = 700;
const MIN_SEARCH_LENGTH = 3;

const MAX_CAVE_TUNES_RESULTS = 6;
const MAX_YOUTUBE_RESULTS = 6;

const MAX_USER_RESULTS = 6;

const CREATOR_ROLES = [
  "artist",
  "producer",
  "dj",
  "record_label",
  "podcaster",
];
// ======================================================
// COUNTRY NAMES
// ======================================================

const COUNTRY_NAMES = {
  MW: "Malawi",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
  MZ: "Mozambique",
  TZ: "Tanzania",
  KE: "Kenya",
  UG: "Uganda",
  RW: "Rwanda",
  BI: "Burundi",
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  AO: "Angola",
  BW: "Botswana",
  NA: "Namibia",
  LS: "Lesotho",
  SZ: "Eswatini",

  NG: "Nigeria",
  GH: "Ghana",
  CI: "Ivory Coast",
  SN: "Senegal",
  GM: "Gambia",
  SL: "Sierra Leone",
  LR: "Liberia",
  GN: "Guinea",
  BF: "Burkina Faso",
  ML: "Mali",
  NE: "Niger",
  BJ: "Benin",
  TG: "Togo",
  CM: "Cameroon",
  GA: "Gabon",
  GQ: "Equatorial Guinea",

  ET: "Ethiopia",
  ER: "Eritrea",
  SO: "Somalia",
  DJ: "Djibouti",
  SD: "Sudan",
  SS: "South Sudan",
  EG: "Egypt",

  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  LY: "Libya",

  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IE: "Ireland",

  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  GR: "Greece",
  RU: "Russia",
  UA: "Ukraine",

  BR: "Brazil",
  AR: "Argentina",
  CO: "Colombia",
  MX: "Mexico",
  CL: "Chile",
  PE: "Peru",
  VE: "Venezuela",

  AU: "Australia",
  NZ: "New Zealand",

  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",

  CN: "China",
  JP: "Japan",
  KR: "South Korea",

  PH: "Philippines",
  ID: "Indonesia",
  MY: "Malaysia",
  SG: "Singapore",
  TH: "Thailand",
  VN: "Vietnam",

  OTHER: "Other",
};

// ======================================================
// COUNTRY HELPER
// ======================================================

function getCountryName(code) {
  return (
    COUNTRY_NAMES[
      String(code || "").toUpperCase()
    ] ||
    code ||
    ""
  );
}

// ======================================================
// NAVBAR
// ======================================================

function Navbar() {
  const {
    user,
    isAuthenticated,
  } = useAuth();


  // ====================================================
  // GLOBAL PLAYER
  // ====================================================

  const {
    playSong,
  } = useContext(PlayerContext);

  const navigate = useNavigate();


    const {
  openYouTubeVideo,
} = useYouTubePlayer();

  // ====================================================
  // REFS
  // ====================================================

  const searchContainerRef =
    useRef(null);

  const searchInputRef =
    useRef(null);

  const searchAbortRef =
    useRef(null);

  // ====================================================
  // UNREAD COUNT
  // ====================================================

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  // ====================================================
  // SEARCH STATE
  // ====================================================

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    searchFocused,
    setSearchFocused,
  ] = useState(false);

  const [
    caveTunesSongs,
    setCaveTunesSongs,
  ] = useState([]);

  const [
    youtubeResults,
    setYoutubeResults,
  ] = useState([]);

  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);

  const [
    caveTunesLoading,
    setCaveTunesLoading,
  ] = useState(true);

  const [
    searchError,
    setSearchError,
  ] = useState("");

  const [
    hasSearched,
    setHasSearched,
  ] = useState(false);

  // ====================================================
// USER SEARCH STATE
// ====================================================

const [userResults, setUserResults] = useState([]);

const [userSearchLoading, setUserSearchLoading] = useState(false);

const userSearchAbortRef = useRef(null);

  // ====================================================
  // AUTH TOKEN
  // ====================================================

  const getToken = useCallback(() => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("caveTunesToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("caveTunesToken") ||
      null
    );
  }, []);

  // ====================================================
  // LOAD CAVE TUNES SONGS
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCaveTunesSongs() {
      try {
        const response =
          await getSongs();

        if (cancelled) {
          return;
        }

        const results =
          Array.isArray(response)
            ? response
            : response?.songs || [];

        const normalized =
          results.map(normalizeSong);

        setCaveTunesSongs(
          normalized
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "NAVBAR CAVE TUNES SEARCH LOAD ERROR:",
          error
        );

        setCaveTunesSongs([]);
      } finally {
        if (!cancelled) {
          setCaveTunesLoading(false);
        }
      }
    }

    loadCaveTunesSongs();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // CAVE TUNES SEARCH
  // ====================================================

  const caveTunesResults =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (
        search.length <
        MIN_SEARCH_LENGTH
      ) {
        return [];
      }

      return caveTunesSongs
        .filter((song) => {
          const title =
            String(
              song.title || ""
            ).toLowerCase();

          const artist =
            String(
              song.artist || ""
            ).toLowerCase();

          const genre =
            String(
              song.genre || ""
            ).toLowerCase();

          const countryCode =
            String(
              song.country || ""
            ).toLowerCase();

          const countryName =
            getCountryName(
              song.country
            ).toLowerCase();

          return (
            title.includes(search) ||
            artist.includes(search) ||
            genre.includes(search) ||
            countryCode.includes(search) ||
            countryName.includes(search)
          );
        })
        .slice(
          0,
          MAX_CAVE_TUNES_RESULTS
        );
    }, [
      caveTunesSongs,
      searchTerm,
    ]);

  // ====================================================
  // YOUTUBE SEARCH REQUEST
  // ====================================================

  const searchYouTube =
    useCallback(
      async (
        query,
        signal
      ) => {
        const response =
          await fetch(
            `${API_BASE_URL}/api/youtube/search?` +
              new URLSearchParams({
                q: query,
                maxResults:
                  String(
                    MAX_YOUTUBE_RESULTS
                  ),
                regionCode: "MW",
                type: "video",
              }),
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
              signal,
            }
          );

        let data;

        try {
          data =
            await response.json();
        } catch {
          throw new Error(
            "Invalid server response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `YouTube search failed (${response.status})`
          );
        }

        if (
          data?.success === false
        ) {
          throw new Error(
            data?.message ||
              "YouTube search failed."
          );
        }

        return (
          data?.items ||
          data?.results ||
          []
        );
      },
      []
    );

    // ====================================================
// SEARCH CAVE TUNES USER ACCOUNTS
// ====================================================

const searchUsers = useCallback(
  async (query) => {
    if (query.length < MIN_SEARCH_LENGTH) {
      return;
    }

    if (userSearchAbortRef.current) {
      userSearchAbortRef.current.abort();
    }

    const controller = new AbortController();

    userSearchAbortRef.current = controller;

    try {
      setUserSearchLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/users/search?` +
          new URLSearchParams({
            q: query,
          }),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || "User search failed."
        );
      }

      if (controller.signal.aborted) {
        return;
      }

      const users = Array.isArray(data?.users)
        ? data.users
        : [];

      const normalizedUsers = users
        .filter((user) => {
          const role = String(
            user.role || ""
          ).toLowerCase();

          return (
            user.id &&
            CREATOR_ROLES.includes(role)
          );
        })
        .map(normalizeUser)
        .slice(0, MAX_USER_RESULTS);

      setUserResults(normalizedUsers);

    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error(
        "NAVBAR USER SEARCH ERROR:",
        error
      );

      setUserResults([]);

    } finally {
      if (userSearchAbortRef.current === controller) {
        userSearchAbortRef.current = null;
        setUserSearchLoading(false);
      }
    }
  },
  []
);

// ====================================================
// USER ACCOUNT CLICK
// ====================================================

const handleUserResult = (user) => {
  if (!user || !user.id || !user.role) {
    return;
  }

  // Cancel pending searches.
  if (searchAbortRef.current) {
    searchAbortRef.current.abort();
    searchAbortRef.current = null;
  }

  if (userSearchAbortRef.current) {
    userSearchAbortRef.current.abort();
    userSearchAbortRef.current = null;
  }

  setSearchFocused(false);
  setSearchLoading(false);
  setUserSearchLoading(false);

  // Open public CreatorProfile.
  navigate(
    `/creator/${user.role}/${user.id}`
  );
};

  // ====================================================
  // PERFORM YOUTUBE SEARCH
  // ====================================================

  const performYouTubeSearch =
    useCallback(
      async (query) => {
        if (
          query.length <
          MIN_SEARCH_LENGTH
        ) {
          return;
        }

        if (
          searchAbortRef.current
        ) {
          searchAbortRef.current.abort();
        }

        const controller =
          new AbortController();

        searchAbortRef.current =
          controller;

        try {
          setSearchLoading(true);
          setSearchError("");

          const results =
            await searchYouTube(
              query,
              controller.signal
            );

          if (
            controller.signal.aborted
          ) {
            return;
          }

          const normalized =
            results
              .map(
                normalizeYouTubeResult
              )
              .filter(
                (item) =>
                  item.videoId
              )
              .slice(
                0,
                MAX_YOUTUBE_RESULTS
              );

          setYoutubeResults(
            normalized
          );

          setHasSearched(true);
        } catch (error) {
          if (
            error?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "NAVBAR YOUTUBE SEARCH ERROR:",
            error
          );

          setYoutubeResults([]);

          setSearchError(
            "Unable to search right now, Check internet connections"
          );
        } finally {
          if (
            searchAbortRef.current ===
            controller
          ) {
            searchAbortRef.current =
              null;

            setSearchLoading(false);
          }
        }
      },
      [searchYouTube]
    );

  // ====================================================
  // SEARCH INPUT CHANGE
  // ====================================================

  const handleSearchChange =
    (event) => {
      const value =
        event.target.value;

      setSearchTerm(value);

      const query =
        value.trim();

      if (
        query.length <
        MIN_SEARCH_LENGTH
      ) {
        if (
          searchAbortRef.current
        ) {
          searchAbortRef.current.abort();
          searchAbortRef.current =
            null;
        }
if (userSearchAbortRef.current) {
  userSearchAbortRef.current.abort();
  userSearchAbortRef.current = null;
}

setUserResults([]);
setUserSearchLoading(false);
        setYoutubeResults([]);
        setHasSearched(false);
        setSearchError("");
        setSearchLoading(false);
      }
    };

  // ====================================================
  // DEBOUNCED YOUTUBE SEARCH
  // ====================================================

// ====================================================
// DEBOUNCED GLOBAL SEARCH
// ====================================================

useEffect(() => {
  const query = searchTerm.trim();

  if (query.length < MIN_SEARCH_LENGTH) {
    return undefined;
  }

  const timer = setTimeout(() => {
    performYouTubeSearch(query);
    searchUsers(query);
  }, SEARCH_DEBOUNCE);

  return () => {
    clearTimeout(timer);
  };

}, [
  searchTerm,
  performYouTubeSearch,
  searchUsers,
]);

  // ====================================================
  // SEARCH RESULT STATE
  // ====================================================

 const hasSearchResults =
  caveTunesResults.length > 0 ||
  youtubeResults.length > 0 ||
  userResults.length > 0;

  const showSearchPanel =
    searchFocused &&
    searchTerm.trim().length >=
      MIN_SEARCH_LENGTH;

  // ====================================================
  // CLOSE SEARCH ON OUTSIDE CLICK
  // ====================================================

  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(
          event.target
        )
      ) {
        setSearchFocused(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ====================================================
  // ESCAPE KEY
  // ====================================================

  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === "Escape"
      ) {
        setSearchFocused(false);

        searchInputRef.current?.blur();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // ====================================================
  // CLEAR SEARCH
  // ====================================================

  const clearSearch = () => {
    if (
      searchAbortRef.current
    ) {
      searchAbortRef.current.abort();
      searchAbortRef.current =
        null;
    }

    if (userSearchAbortRef.current) {
  userSearchAbortRef.current.abort();
  userSearchAbortRef.current = null;
}

setUserResults([]);
setUserSearchLoading(false);

    setSearchTerm("");
    setYoutubeResults([]);
    setHasSearched(false);
    setSearchError("");
    setSearchLoading(false);

    searchInputRef.current?.focus();

    setSearchFocused(true);
  };

  // ====================================================
  // CAVE TUNES RESULT CLICK
  //
  // IMPORTANT:
  // This now uses the GLOBAL PlayerContext.
  //
  // The song can therefore play from ANY PAGE.
  // We do NOT navigate to "/".
  // ====================================================

  const handleCaveTunesResult =
    async (song) => {
      if (!song) {
        return;
      }

      if (!song.id) {
        console.warn(
          "Cave Tunes result has no song ID:",
          song
        );

        return;
      }

      if (!song.audioUrl) {
        console.warn(
          "Cave Tunes result has no audio URL:",
          song
        );

        return;
      }

      // Close search dropdown.
      setSearchFocused(false);

      // Stop active YouTube search.
      if (
        searchAbortRef.current
      ) {
        searchAbortRef.current.abort();
        searchAbortRef.current =
          null;
      }

      setSearchLoading(false);

      try {
        // ==================================================
        // PLAY DIRECTLY THROUGH GLOBAL PLAYER
        // ==================================================

        await playSong(song);

      } catch (error) {
        console.error(
          "NAVBAR CAVE TUNES PLAY ERROR:",
          error
        );
      }
    };


// ====================================================
// YOUTUBE RESULT CLICK
// PLAY DIRECTLY USING GLOBAL YOUTUBE PLAYER
// ====================================================

const handleYouTubeResult = (video) => {
  if (!video || !video.videoId) {
    console.warn(
      "YouTube result has no videoId:",
      video
    );

    return;
  }

  const videoId = String(video.videoId).trim();

  const normalizedVideo = {
    ...video,

    videoId,

    title:
      video.title ||
      "YouTube Video",

    channelTitle:
      video.channelTitle ||
      video.channel ||
      "YouTube",

    channel:
      video.channelTitle ||
      video.channel ||
      "YouTube",

    thumbnail:
      video.thumbnail ||
      video.thumbnail_url ||
      "",

    youtubeUrl:
      video.youtubeUrl ||
      video.url ||
      `https://www.youtube.com/watch?v=${videoId}`,

    embedUrl:
      video.embedUrl ||
      `https://www.youtube.com/embed/${videoId}`,
  };

  // Stop any active YouTube search request.
  if (searchAbortRef.current) {
    searchAbortRef.current.abort();
    searchAbortRef.current = null;
  }

  setSearchLoading(false);

  // Close Navbar search dropdown.
  setSearchFocused(false);

  // Play directly through the global YouTube player.
  try {
    openYouTubeVideo(normalizedVideo);
  } catch (error) {
    console.error(
      "NAVBAR YOUTUBE PLAY ERROR:",
      error
    );
  }
};


  // ====================================================
  // SEARCH SUBMIT
  // ====================================================

  const handleSearchSubmit =
    (event) => {
      event.preventDefault();

      const query =
        searchTerm.trim();

      if (
        query.length <
        MIN_SEARCH_LENGTH
      ) {
        return;
      }

      setSearchFocused(true);

      performYouTubeSearch(
        query
      );
    };

  // ====================================================
  // NOTIFICATION COUNT
  // ====================================================

  const loadUnreadCount =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          return;
        }

        const token =
          getToken();

        if (!token) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/notifications/unread-count`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (!response.ok) {
            return;
          }

          const data =
            await response.json();

          if (
            data?.success
          ) {
            const count =
              Number(
                data.unreadCount ||
                  0
              );

            setUnreadCount(
              Number.isFinite(
                count
              )
                ? Math.max(
                    0,
                    count
                  )
                : 0
            );
          }
        } catch (error) {
          console.error(
            "NAVBAR NOTIFICATION COUNT ERROR:",
            error
          );
        }
      },
      [
        isAuthenticated,
        getToken,
      ]
    );

  // ====================================================
  // INITIAL NOTIFICATION LOAD
  // ====================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let cancelled = false;

    async function loadInitialUnreadCount() {
      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/api/notifications/unread-count`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          !cancelled &&
          data?.success
        ) {
          const count =
            Number(
              data.unreadCount ||
                0
            );

          setUnreadCount(
            Number.isFinite(
              count
            )
              ? Math.max(
                  0,
                  count
                )
              : 0
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "INITIAL NOTIFICATION COUNT ERROR:",
            error
          );
        }
      }
    }

    loadInitialUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    getToken,
  ]);

  // ====================================================
  // POLL NOTIFICATIONS
  // ====================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        loadUnreadCount();
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [
    isAuthenticated,
    loadUnreadCount,
  ]);

  // ====================================================
  // NOTIFICATION UPDATE EVENT
  // ====================================================

  useEffect(() => {
    const handleNotificationUpdate =
      () => {
        loadUnreadCount();
      };

    window.addEventListener(
      "caveTunesNotificationsUpdated",
      handleNotificationUpdate
    );

    return () => {
      window.removeEventListener(
        "caveTunesNotificationsUpdated",
        handleNotificationUpdate
      );
    };
  }, [
    loadUnreadCount,
  ]);

  // ====================================================
  // NOTIFICATION CLICK
  // ====================================================

  const handleNotificationClick =
    useCallback(() => {
      navigate(
        "/notifications"
      );
    }, [navigate]);

  // ====================================================
  // PROFILE IMAGE
  // ====================================================

  const profileImage =
    getMediaUrl(
      user?.profile_image_url ||
        user?.avatar
    );

  // ====================================================
  // DISPLAY COUNT
  // ====================================================

  const displayedUnreadCount =
    Math.min(
      Math.max(
        Number(
          unreadCount
        ) || 0,
        0
      ),
      99
    );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <header className="navbar">

      {/* ==================================================
          LEFT
      ================================================== */}

      <div className="navbar-left">

        {/* SEARCH */}

        <div
          className={`navbar-search ${
            searchFocused
              ? "navbar-search-active"
              : ""
          }`}
          ref={
            searchContainerRef
          }
        >

          <form
            className="search-box"
            onSubmit={
              handleSearchSubmit
            }
          >

            <Search size={18} />

            <input
              ref={
                searchInputRef
              }
              type="search"
              value={searchTerm}
              placeholder="Search songs, artists..."
              onFocus={() =>
                setSearchFocused(
                  true
                )
              }
              onChange={
                handleSearchChange
              }
              aria-label="Search Cave Tunes and YouTube"
            />

            {searchTerm && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={
                  clearSearch
                }
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}

          </form>

          {/* ==================================================
              SEARCH RESULTS
          ================================================== */}

          {showSearchPanel && (
            <div className="navbar-search-results">

              {/* HEADER */}

              <div className="navbar-search-results-header">

                <span>
                  Search results
                </span>

                {searchLoading && (
                  <Loader2
                    size={16}
                    className="navbar-search-spinner"
                  />
                )}

              </div>

              {/* ==================================================
    USER ACCOUNTS
================================================== */}

<section className="navbar-search-section">

  <div className="navbar-search-section-title">

    <div>
      <Users size={15} />

      <span>
        User Accounts
      </span>
    </div>

    {!userSearchLoading && (
      <span>
        {userResults.length}
      </span>
    )}

  </div>

  {userSearchLoading ? (

    <div className="navbar-search-loading">

      <Loader2
        size={17}
        className="navbar-search-spinner"
      />

      <span>
        Searching accounts...
      </span>

    </div>

  ) : userResults.length > 0 ? (

    <div className="navbar-search-list">

      {userResults.map((user) => (

        <button
          type="button"
          className="navbar-search-result"
          key={`user-${user.id}`}
          onClick={() => handleUserResult(user)}
        >

          <div className="navbar-search-result-image">

            {user.profileImage ? (

              <img
                src={user.profileImage}
                alt=""
              />

            ) : (

              <UserCircle size={22} />

            )}

          </div>

          <div className="navbar-search-result-info">

            <strong>

              {user.username}

              {user.verified && (
                <BadgeCheck
                  size={14}
                  style={{
                    marginLeft: "5px",
                    verticalAlign: "middle",
                    color: "#3b82f6",
                  }}
                />
              )}

            </strong>

            <span>

              {user.role.replace("_", " ")}

              {user.country &&
                ` • ${getCountryName(user.country)}`}

            </span>

          </div>

        </button>

      ))}

    </div>

  ) : (

    <div className="navbar-search-empty">

      <Users size={17} />

      <span>
        No user accounts found
      </span>

    </div>

  )}

</section>

              {/* ==================================================
                  CAVE TUNES
              ================================================== */}

              <section className="navbar-search-section">

                <div className="navbar-search-section-title">

                  <div>
                    <Music2 size={15} />

                    <span>
                      Cave Tunes
                    </span>
                  </div>

                  {!caveTunesLoading && (
                    <span>
                      {
                        caveTunesResults.length
                      }
                    </span>
                  )}

                </div>

                {caveTunesLoading ? (

                  <div className="navbar-search-loading">

                    <Loader2
                      size={17}
                      className="navbar-search-spinner"
                    />

                    <span>
                      Loading Cave Tunes...
                    </span>

                  </div>

                ) : caveTunesResults.length >
                  0 ? (

                  <div className="navbar-search-list">

                    {caveTunesResults.map(
                      (song) => (
                        <button
                          type="button"
                          className="navbar-search-result"
                          key={
                            `cave-${song.id}`
                          }
                          onClick={() =>
                            handleCaveTunesResult(
                              song
                            )
                          }
                        >

                          <div className="navbar-search-result-image">

                            {song.cover ? (

                              <img
                                src={
                                  song.cover
                                }
                                alt=""
                              />

                            ) : (

                              <Music2
                                size={18}
                              />

                            )}

                          </div>

                          <div className="navbar-search-result-info">

                            <strong>
                              {
                                song.title
                              }
                            </strong>

                            <span>

                              {
                                song.artist
                              }

                              {song.genre &&
                                ` • ${song.genre}`}

                              {song.country &&
                                ` • ${getCountryName(
                                  song.country
                                )}`}

                            </span>

                          </div>

                        </button>
                      )
                    )}

                  </div>

                ) : (

                  <div className="navbar-search-empty">

                    <Music2
                      size={17}
                    />

                    <span>
                      No Cave Tunes results
                    </span>

                  </div>

                )}

              </section>

              {/* ==================================================
                  YOUTUBE
              ================================================== */}

              <section className="navbar-search-section">

                <div className="navbar-search-section-title">

                  <div>
                    <Play size={15} />

                    <span>
                      other Source
                    </span>
                  </div>

                  <span>
                    {
                      youtubeResults.length
                    }
                  </span>

                </div>

                {youtubeResults.length >
                0 ? (

                  <div className="navbar-search-list">

                    {youtubeResults.map(
                      (video) => (
                        <button
                          type="button"
                          className="navbar-search-result"
                          key={
                            `youtube-${video.videoId}`
                          }
                          onClick={() =>
                            handleYouTubeResult(
                              video
                            )
                          }
                        >

                          <div className="navbar-search-result-image youtube-result-image">

                            {video.thumbnail ? (

                              <img
                                src={
                                  video.thumbnail
                                }
                                alt=""
                              />

                            ) : (

                              <Play
                                size={18}
                              />

                            )}

                          </div>

                          <div className="navbar-search-result-info">

                            <strong>
                              {
                                video.title
                              }
                            </strong>

                            <span>
                              {
                                video.channelTitle ||
                                video.channel ||
                                "YouTube"
                              }
                            </span>

                          </div>

                        </button>
                      )
                    )}

                  </div>

                ) : searchLoading ? (

                  <div className="navbar-search-loading">

                    <Loader2
                      size={17}
                      className="navbar-search-spinner"
                    />

                    <span>
                      Searching ...
                    </span>

                  </div>

                ) : (

                  <div className="navbar-search-empty">

                    <Play
                      size={17}
                    />

                    <span>
                      No results found 
                    </span>

                  </div>

                )}

              </section>

              {/* ERROR */}

              {searchError && (
                <div className="navbar-search-error">
                  {searchError}
                </div>
              )}

              {/* NOTHING FOUND */}

              {hasSearched &&
                !hasSearchResults &&
                !searchLoading &&
                !searchError && (

                  <div className="navbar-search-no-results">

                    <Search size={22} />

                    <strong>
                      No results found
                    </strong>

                    <span>
                      Try another song,
                      artist or video.
                    </span>

                  </div>

                )}

            </div>
          )}

        </div>

      </div>

      {/* ==================================================
          RIGHT
      ================================================== */}

      <div className="navbar-right">

        {/* NOTIFICATIONS */}

        {isAuthenticated && (

          <button
            type="button"
            className="icon-btn notification-btn"
            onClick={
              handleNotificationClick
            }
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
          >

            <Bell size={21} />

            {unreadCount > 0 && (

              <span className="notification-badge">

                {unreadCount > 99
                  ? "99+"
                  : displayedUnreadCount}

              </span>

            )}

          </button>

        )}

        {/* PROFILE / LOGIN */}

        {isAuthenticated ? (

          <Link
            to="/profile"
            className="profile-btn"
          >

            {profileImage ? (

              <img
                src={profileImage}
                alt={
                  user?.username ||
                  "Profile"
                }
              />

            ) : (

              <UserCircle
                size={34}
              />

            )}

            <span>
              {
                user?.username ||
                "User"
              }
            </span>

          </Link>

        ) : (

          <Link
            to="/login"
            className="login-btn"
          >

            <LogIn size={18} />

            Login

          </Link>

        )}

      </div>

    </header>
  );
}

// ======================================================
// DATABASE → REACT SONG FORMAT
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

    album:
      song.album_name ||
      song.album ||
      "",

    cover:
      getMediaUrl(
        song.cover_url ||
        song.cover
      ),

    audioUrl:
      getMediaUrl(
        song.audio_url ||
        song.audioUrl
      ),

    genre:
      song.genre ||
      "Unknown",

    country:
      song.country ||
      "",

    duration:
      song.duration ||
      0,

    plays:
      Number(
        song.plays
      ) || 0,

    likes:
      Number(
        song.likes
      ) || 0,

    downloads:
      Number(
        song.downloads
      ) || 0,
  };
}

// ======================================================
// YOUTUBE RESULT NORMALIZATION
// ======================================================

function normalizeYouTubeResult(item) {
  const snippet = item?.snippet || {};

  const videoId =
    typeof item?.id === "string"
      ? item.id
      : item?.id?.videoId ||
        item?.videoId ||
        item?.contentDetails?.videoId ||
        "";

  const thumbnails =
    snippet?.thumbnails ||
    item?.thumbnails ||
    {};

  const thumbnail =
    thumbnails?.medium?.url ||
    thumbnails?.high?.url ||
    thumbnails?.default?.url ||
    item?.thumbnail ||
    item?.thumbnail_url ||
    "";

  return {
    ...item,

    videoId,

    title:
      snippet?.title ||
      item?.title ||
      "YouTube Video",

    channelTitle:
      snippet?.channelTitle ||
      item?.channelTitle ||
      item?.channel ||
      "YouTube",

    channel:
      snippet?.channelTitle ||
      item?.channelTitle ||
      item?.channel ||
      "YouTube",

    thumbnail,

    youtubeUrl:
      item?.youtubeUrl ||
      item?.url ||
      (
        videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : ""
      ),

    embedUrl:
      item?.embedUrl ||
      (
        videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : ""
      ),
  };
}

// ======================================================
// DATABASE → REACT USER FORMAT
// ======================================================

function normalizeUser(user) {
  return {
    ...user,

    id: user.id,

    username:
      user.username ||
      user.artist_name ||
      user.name ||
      "Unknown User",

    role:
      String(user.role || "").toLowerCase(),

    country:
      user.country || "",

    profileImage:
      getMediaUrl(
        user.profile_image_url ||
        user.profile_image ||
        user.avatar
      ),

    verified:
      Boolean(user.verified),
  };
}

export default Navbar;

