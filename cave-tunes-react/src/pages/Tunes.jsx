import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Search,
  X,
  Clock3,
  Play,
  Music2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import MusicCard from "../components/MusicCard";

import {
  getMediaUrl,
  getSongs,
} from "../services/api";

import { usePlayer } from "../context/usePlayer";

import "./Tunes.css";

const RECENT_SEARCHES_KEY = "caveTunesRecentSearches";
const MAX_RECENT_SEARCHES = 6;


// ======================================================
// NORMALIZE GENRE NAMES
// ======================================================

function normalizeGenre(genre) {
  const value = String(genre || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    "rnb": "r&b",
    "rhythm and blues": "r&b",
    "hiphop": "hip hop",
    "afro beat": "afrobeats",
    "afrobeat": "afrobeats",
  };

  return aliases[value] || value;
}


// ======================================================
// FILTER MUSIC FOR TUNES PAGE
//
// Singles appear normally.
// Albums and EPs appear only once.
// ======================================================

function prepareTunesSongs(songs) {
  const releaseMap = new Map();

  [...songs]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .forEach((song) => {
      const releaseType = String(
        song.release_type || "single"
      )
        .toLowerCase()
        .trim();

      if (releaseType === "single") {
        releaseMap.set(`single-${song.id}`, song);
        return;
      }

      const key = `${releaseType}-${
        song.artist_name || ""
      }-${song.album_name || song.title}`.toLowerCase();

      if (!releaseMap.has(key)) {
        releaseMap.set(key, song);
      }
    });

  return Array.from(releaseMap.values());
}


// ======================================================
// DATABASE → REACT SONG FORMAT
// ======================================================

function normalizeSong(song) {
  return {
    ...song,

    id: song.id,

    title: song.title || "Untitled Song",

    artist: song.artist_name || "Unknown Artist",

    album: song.album_name || "",

    cover: getMediaUrl(song.cover_url),

    audioUrl: getMediaUrl(song.audio_url),

    genre: song.genre || "Unknown",

    country: song.country || "",

    duration: song.duration || 0,

    plays: Number(song.plays) || 0,

    likes: Number(song.likes) || 0,

    downloads: Number(song.downloads) || 0,
  };
}


// ======================================================
// COUNTRY DISPLAY
// ======================================================

function getCountryName(code) {
  const countries = {
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

  return countries[code] || code || "";
}


// ======================================================
// TUNES COMPONENT
// ======================================================

function Tunes() {

  // ======================================================
  // PLAYER
  // ======================================================

  const {
    playSong,
    currentSong,
    isPlaying,
  } = usePlayer();


  // ======================================================
  // STATE
  // ======================================================

  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedGenre, setSelectedGenre] = useState("all");

  const [selectedCountry, setSelectedCountry] = useState("all");

  const [searchFocused, setSearchFocused] = useState(false);


  // ======================================================
  // REFS
  // ======================================================
const searchContainerRef = useRef(null);

const carouselRefs = useRef({});

// Manual genre and country marquee dragging
const marqueeDragRef = useRef(null);

// ======================================================
// GENRE AND COUNTRY MANUAL SCROLLING
// ======================================================

const handleMarqueePointerDown = (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  const container = event.currentTarget;

  const captureTarget =
    event.target.closest?.("button") || container;

  marqueeDragRef.current = {
    container,
    captureTarget,
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: container.scrollLeft,
    moved: false,
    active: true,
  };

  container.classList.add("is-dragging");

  try {
    captureTarget.setPointerCapture(event.pointerId);
  } catch {
    // Continue without pointer capture if unavailable.
  }
};

const handleMarqueePointerMove = (event) => {
  const drag = marqueeDragRef.current;

  if (
    !drag ||
    !drag.active ||
    drag.pointerId !== event.pointerId
  ) {
    return;
  }

  const distance = event.clientX - drag.startX;

  if (Math.abs(distance) > 5) {
    drag.moved = true;
  }

  if (drag.moved) {
    event.preventDefault();

    drag.container.scrollLeft =
      drag.startScrollLeft - distance;
  }
};

const handleMarqueePointerUp = (event) => {
  const drag = marqueeDragRef.current;

  if (
    !drag ||
    !drag.active ||
    drag.pointerId !== event.pointerId
  ) {
    return;
  }

  drag.active = false;

  drag.container.classList.remove("is-dragging");

  try {
    if (
      drag.captureTarget.hasPointerCapture(event.pointerId)
    ) {
      drag.captureTarget.releasePointerCapture(event.pointerId);
    }
  } catch {
    // Ignore pointer capture cleanup errors.
  }
};

const handleMarqueeClickCapture = (event) => {
  const drag = marqueeDragRef.current;

  if (
    drag?.moved &&
    event.detail !== 0 &&
    drag.container === event.currentTarget
  ) {
    event.preventDefault();
    event.stopPropagation();

    drag.moved = false;
  }
};

  // ======================================================
  // RECENT SEARCHES
  // ======================================================

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(
        RECENT_SEARCHES_KEY
      );

      if (!saved) return [];

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];

    } catch {
      return [];
    }
  });


  // ======================================================
  // LOAD SONGS
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    async function loadSongs() {
      try {
        setLoading(true);
        setError("");

        const response = await getSongs();

        if (cancelled) return;

        const results = Array.isArray(response)
          ? response
          : response?.songs || [];

        const normalizedSongs = results.map(normalizeSong);

        const tunesSongs = prepareTunesSongs(
          normalizedSongs
        );

        setSongs(tunesSongs);

      } catch (requestError) {
        if (cancelled) return;

        console.error(
          "Failed to load Cave Tunes:",
          requestError
        );

        setError(
          requestError.message ||
          "Unable to load music."
        );

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSongs();

    return () => {
      cancelled = true;
    };

  }, []);


  // ======================================================
  // CLOSE SEARCH PANEL OUTSIDE CLICK
  // ======================================================

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
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


  // ======================================================
  // CAVE TUNES GENRES
  // ======================================================

  const genres = [
    "Afrobeats",
    "Amapiano",
    "Hip Hop",
    "Rap",
    "R&B",
    "Dancehall",
    "Reggae",
    "Gospel",
    "Pop",
    "Rock",
    "Alternative",
    "Soul",
    "Jazz",
    "Blues",
    "Electronic",
    "House",
    "Techno",
    "Drill",
    "Trap",
    "Lo-fi",
    "Kwaito",
    "Bongo Flava",
    "Zimdancehall",
    "Afro House",
    "Afrobeat",
    "Highlife",
    "Fuji",
    "Makossa",
    "Traditional",
    "Classical",
    "Country",
    "Folk",
    "Acoustic",
    "Instrumental",
    "Soundtrack",
    "Other",
  ];


  // ======================================================
  // CAVE TUNES COUNTRIES
  // ======================================================

  const countries = [
    "MW", "ZA", "ZM", "ZW", "MZ", "TZ", "KE",
    "UG", "RW", "BI", "CD", "CG", "AO", "BW",
    "NA", "LS", "SZ", "NG", "GH", "CI", "SN",
    "GM", "SL", "LR", "GN", "BF", "ML", "NE",
    "BJ", "TG", "CM", "GA", "GQ", "ET", "ER",
    "SO", "DJ", "SD", "SS", "EG", "MA", "DZ",
    "TN", "LY", "US", "CA", "GB", "IE", "FR",
    "DE", "IT", "ES", "PT", "NL", "BE", "CH",
    "AT", "SE", "NO", "DK", "FI", "PL", "GR",
    "RU", "UA", "BR", "AR", "CO", "MX", "CL",
    "PE", "VE", "AU", "NZ", "IN", "PK", "BD",
    "LK", "NP", "CN", "JP", "KR", "PH", "ID",
    "MY", "SG", "TH", "VN", "OTHER",
  ];


  // ======================================================
  // SEARCH RESULTS
  // ======================================================

  const searchResults = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return [];

    return songs
      .filter((song) => {
        const title = String(song.title || "").toLowerCase();

        const artist = String(song.artist || "").toLowerCase();

        const genre = String(song.genre || "").toLowerCase();

        const countryCode = String(song.country || "").toLowerCase();

        const countryName = getCountryName(
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
      .slice(0, 10);

  }, [songs, searchTerm]);


  // ======================================================
  // FILTERED SONGS
  // ======================================================

  const filteredSongs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return songs.filter((song) => {
      const title = String(song.title || "").toLowerCase();

      const artist = String(song.artist || "").toLowerCase();

      const genre = String(song.genre || "").toLowerCase();

      const countryCode = String(song.country || "").toLowerCase();

      const countryName = getCountryName(
        song.country
      ).toLowerCase();

      const matchesSearch =
        !search ||
        title.includes(search) ||
        artist.includes(search) ||
        genre.includes(search) ||
        countryCode.includes(search) ||
        countryName.includes(search);

      const matchesGenre =
        selectedGenre === "all" ||
        normalizeGenre(song.genre) === normalizeGenre(selectedGenre);

      const matchesCountry =
        selectedCountry === "all" ||
        song.country === selectedCountry;

      return (
        matchesSearch &&
        matchesGenre &&
        matchesCountry
      );
    });

  }, [
    songs,
    searchTerm,
    selectedGenre,
    selectedCountry,
  ]);


  // ======================================================
  // GENRE SECTIONS
  // ======================================================

  const genreSections = useMemo(() => {
    const sections = [
      { title: "R&B", genre: "R&B" },
      { title: "Afrobeats", genre: "Afrobeats" },
      { title: "Hip Hop", genre: "Hip Hop" },
      { title: "Amapiano", genre: "Amapiano" },
      { title: "Gospel", genre: "Gospel" },
      { title: "Dancehall", genre: "Dancehall" },
      { title: "Reggae", genre: "Reggae" },
    ];

    return [
      ...sections.map((section) => ({
        ...section,

        songs: filteredSongs.filter(
          (song) =>
            normalizeGenre(song.genre) ===
            normalizeGenre(section.genre)
        ),
      })),

      {
        title: "All Tunes",
        genre: "all",
        songs: filteredSongs,
      },
    ];

  }, [filteredSongs]);


  // ======================================================
  // CAROUSEL NAVIGATION
  // ======================================================

  const scrollCarousel = (sectionTitle, direction) => {
    const carousel = carouselRefs.current[sectionTitle];

    if (!carousel) return;

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.8,
      behavior: "smooth",
    });
  };


  // ======================================================
  // SAVE RECENT SEARCH
  // ======================================================

  const saveRecentSearch = (value) => {
    const search = value.trim();

    if (!search) return;

    setRecentSearches((previous) => {
      const updated = [
        search,
        ...previous.filter(
          (item) =>
            item.toLowerCase() !== search.toLowerCase()
        ),
      ].slice(0, MAX_RECENT_SEARCHES);

      localStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });
  };


  // ======================================================
  // PLAY SEARCH RESULT
  // ======================================================

  const handleSearchResultPlay = (song) => {
    saveRecentSearch(searchTerm);

    setSearchFocused(false);

    playSong(song, searchResults);
  };


  // ======================================================
  // RECENT SEARCH CLICK
  // ======================================================

  const handleRecentSearch = (search) => {
    setSearchTerm(search);
    setSearchFocused(true);
  };


  // ======================================================
  // REMOVE RECENT SEARCH
  // ======================================================

  const removeRecentSearch = (event, search) => {
    event.stopPropagation();

    setRecentSearches((previous) => {
      const updated = previous.filter(
        (item) => item !== search
      );

      localStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });
  };


  // ======================================================
  // CLEAR ALL RECENT SEARCHES
  // ======================================================

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);

    setRecentSearches([]);
  };


  // ======================================================
  // SEARCH SUBMIT
  // ======================================================

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const search = searchTerm.trim();

    if (!search) return;

    saveRecentSearch(search);

    setSearchFocused(false);
  };


  // ======================================================
  // CLEAR SEARCH
  // ======================================================

  const clearSearch = () => {
    setSearchTerm("");
    setSearchFocused(true);
  };


  // ======================================================
  // CLEAR FILTERS
  // ======================================================

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGenre("all");
    setSelectedCountry("all");
  };


  const hasFilters =
    searchTerm.trim() !== "" ||
    selectedGenre !== "all" ||
    selectedCountry !== "all";

  const showSearchPanel = searchFocused;


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="page">
        <header className="page-header">
          <h1>Tunes</h1>
          <p>Loading Cave Tunes...</p>
        </header>
      </main>
    );
  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <main className="page">
        <header className="page-header">
          <h1>Tunes</h1>

          <div className="error-message">
            <strong>Unable to load music</strong>
            <p>{error}</p>
          </div>
        </header>
      </main>
    );
  }


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className="page">

      {/* HEADER */}

      <header className="page-header">
        <h1>Tunes</h1>

        <p>
          Discover music from Cave Tunes artists.
        </p>
      </header>


      {/* SEARCH */}

      <section
        className="tunes-search-section"
        ref={searchContainerRef}
      >
        <form
          className={`modern-search ${
            searchFocused ? "search-active" : ""
          }`}
          onSubmit={handleSearchSubmit}
        >
          <Search
            className="search-icon"
            size={21}
          />

          <input
            type="search"
            value={searchTerm}
            placeholder="Search songs, artists, genres or countries..."
            onFocus={() => setSearchFocused(true)}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Search Cave Tunes"
          />

          {searchTerm && (
            <button
              type="button"
              className="search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}

          <button
            type="submit"
            className="search-submit"
          >
            Search
          </button>
        </form>


        {/* SEARCH PANEL */}

        {showSearchPanel && (
          <div className="search-panel">

            {/* RECENT SEARCHES */}

            {!searchTerm.trim() &&
              recentSearches.length > 0 && (
                <div className="search-panel-section">

                  <div className="search-panel-heading">
                    <div>
                      <Clock3 size={16} />
                      <span>Recent searches</span>
                    </div>

                    <button
                      type="button"
                      onClick={clearRecentSearches}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="recent-search-list">
                    {recentSearches.map((search) => (
                      <button
                        type="button"
                        className="recent-search-item"
                        key={search}
                        onClick={() =>
                          handleRecentSearch(search)
                        }
                      >
                        <Clock3 size={16} />

                        <span>{search}</span>

                        <span
                          className="recent-search-remove"
                          onClick={(event) =>
                            removeRecentSearch(event, search)
                          }
                          role="button"
                          tabIndex={0}
                        >
                          <X size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}


            {/* SEARCH RESULTS */}

            {searchTerm.trim() && (
              <div className="search-panel-section">

                <div className="search-panel-heading">
                  <div>
                    <Search size={16} />
                    <span>Search results</span>
                  </div>

                  <span className="search-result-count">
                    {searchResults.length}
                  </span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="search-result-list">
                    {searchResults.map((song) => {
                      const isCurrent =
                        currentSong?.id === song.id;

                      return (
                        <button
                          type="button"
                          className={`search-result-item ${
                            isCurrent
                              ? "search-result-playing"
                              : ""
                          }`}
                          key={song.id}
                          onClick={() =>
                            handleSearchResultPlay(song)
                          }
                        >
                          <div className="search-result-cover">
                            {song.cover ? (
                              <img
                                src={song.cover}
                                alt=""
                              />
                            ) : (
                              <Music2 size={18} />
                            )}
                          </div>

                          <div className="search-result-info">
                            <strong>{song.title}</strong>

                            <span>
                              {song.artist}
                              {" • "}
                              {song.genre}

                              {song.country &&
                                ` • ${getCountryName(
                                  song.country
                                )}`}
                            </span>
                          </div>

                          <span className="search-result-play">
                            {isCurrent && isPlaying ? (
                              <span className="search-playing-indicator">
                                Playing
                              </span>
                            ) : (
                              <Play
                                size={17}
                                fill="currentColor"
                              />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="search-no-results">
                    <Search size={22} />

                    <strong>No results found</strong>

                    <span>
                      Try another song, artist, genre or country.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>


      {/* GENRE AND COUNTRY FILTERS */}

      <section className="tunes-filter-marquees">

        {/* GENRES */}

        <div className="filter-marquee-section">
          <div className="filter-marquee-heading">
            <h3>Explore Genres</h3>

            <span>
              {selectedGenre === "all"
                ? "All Genres"
                : selectedGenre}
            </span>
          </div>

         <div
  className="filter-marquee genre-marquee"
  onPointerDown={handleMarqueePointerDown}
  onPointerMove={handleMarqueePointerMove}
  onPointerUp={handleMarqueePointerUp}
  onPointerCancel={handleMarqueePointerUp}
  onClickCapture={handleMarqueeClickCapture}
>
            <div className="filter-marquee-track">
              {[...genres, ...genres].map(
                (genre, index) => (
                  <button
                    type="button"
                    key={`${genre}-${index}`}
                    className={`filter-chip ${
                      normalizeGenre(selectedGenre) ===
                      normalizeGenre(genre) &&
                      selectedGenre !== "all"
                        ? "filter-chip-active"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedGenre(
                        selectedGenre === genre
                          ? "all"
                          : genre
                      );
                    }}
                  >
                    {genre}
                  </button>
                )
              )}
            </div>
          </div>
        </div>


        {/* COUNTRIES */}

        <div className="filter-marquee-section">
          <div className="filter-marquee-heading">
            <h3>Explore Countries</h3>

            <span>
              {selectedCountry === "all"
                ? "All Countries"
                : getCountryName(selectedCountry)}
            </span>
          </div>

        <div
  className="filter-marquee country-marquee"
  onPointerDown={handleMarqueePointerDown}
  onPointerMove={handleMarqueePointerMove}
  onPointerUp={handleMarqueePointerUp}
  onPointerCancel={handleMarqueePointerUp}
  onClickCapture={handleMarqueeClickCapture}
>
            <div className="filter-marquee-track">
              {[...countries, ...countries].map(
                (country, index) => (
                  <button
                    type="button"
                    key={`${country}-${index}`}
                    className={`filter-chip ${
                      selectedCountry === country
                        ? "filter-chip-active"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCountry(
                        selectedCountry === country
                          ? "all"
                          : country
                      );
                    }}
                  >
                    {getCountryName(country)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>


        {/* CLEAR FILTERS */}

        {hasFilters && (
          <button
            type="button"
            className="clear-filters"
            onClick={clearFilters}
          >
            <X size={15} />
            Clear Filters
          </button>
        )}
      </section>


      {/* RESULTS INFO */}

      <div className="tunes-results-info">
        <span>
          {filteredSongs.length}{" "}
          {filteredSongs.length === 1 ? "song" : "songs"}
        </span>

        {hasFilters && (
          <span>
            filtered from {songs.length}
          </span>
        )}
      </div>


      {/* EMPTY DATABASE */}

      {songs.length === 0 && (
        <div className="empty-state">
          <h2>No music available yet</h2>

          <p>
            Songs uploaded to Cave Tunes will appear here.
          </p>
        </div>
      )}


      {/* NO RESULTS */}

      {songs.length > 0 &&
        filteredSongs.length === 0 && (
          <div className="empty-state">
            <h2>No songs found</h2>

            <p>
              Try another search or change your filters.
            </p>

            <button
              type="button"
              className="clear-filters"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        )}


      {/* ==================================================
          GENRE CAROUSELS
      ================================================== */}

      {filteredSongs.length > 0 && (
        <section className="tunes-genre-sections">

          {genreSections.map((section) => {

            // Hide empty genre sections.
            if (section.songs.length === 0) {
              return null;
            }

            return (
              <section
                className="tunes-genre-section"
                key={section.title}
              >

                {/* SECTION HEADER */}

                <div className="tunes-section-header">

                  <div className="tunes-section-title">
                    <h2>{section.title}</h2>

                    <span>
                      {section.songs.length}{" "}
                      {section.songs.length === 1
                        ? "song"
                        : "songs"}
                    </span>
                  </div>


                  {/* CAROUSEL CONTROLS */}

                  <div className="tunes-carousel-controls">

                    <button
                      type="button"
                      onClick={() =>
                        scrollCarousel(
                          section.title,
                          -1
                        )
                      }
                      aria-label={`Scroll ${section.title} left`}
                    >
                      <ChevronLeft size={21} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        scrollCarousel(
                          section.title,
                          1
                        )
                      }
                      aria-label={`Scroll ${section.title} right`}
                    >
                      <ChevronRight size={21} />
                    </button>

                  </div>
                </div>


                {/* HORIZONTAL CAROUSEL */}

                <div
                  className="tunes-horizontal-carousel"
                  ref={(element) => {
                    carouselRefs.current[section.title] =
                      element;
                  }}
                >

                  {section.songs.map((song) => (
                    <div
                      className="tunes-carousel-card"
                      key={song.id}
                    >
                      <MusicCard
                        song={song}
                        songs={section.songs}
                      />
                    </div>
                  ))}

                </div>

              </section>
            );
          })}

        </section>
      )}

    </main>
  );
}

export default Tunes;