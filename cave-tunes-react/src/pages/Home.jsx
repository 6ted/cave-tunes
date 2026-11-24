import { API_BASE_URL as SHARED_API_BASE_URL } from "../services/api";
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Headphones,
  Music2,
  RadioIcon,
  Play,
  Sparkles,
  Scissors,
  Download,
  TrendingUp,
  Disc3,
  RefreshCw,
  Globe2,
  
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import { useNavigate } from "react-router-dom";

import MusicCard from "../components/MusicCard";

import { usePlayer } from "../context/usePlayer";

import {
  getPopularCreators,
  getTrendingInCountry,
  getFeaturedCharts,
} from "../services/api";

import "./Home.css";

/* =====================================================
   CREATOR VERIFICATION BADGE
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

function CreatorVerificationBadge({ creator }) {
    const verified = isEnabled(creator?.verified);
    const monetized = isEnabled(creator?.monetized);

    // Master requires BOTH verification and monetization.
    const isMaster = verified && monetized;

    // Ordinary verification requires verified only.
    const isVerified = verified;

    if (!isVerified) return null;

    const badgeTitle = isMaster
        ? "Master Verified by Cave Tunes"
        : "Verified by Cave Tunes";

    return (
        <span
            className={`creator-verification-badge ${
                isMaster ? "master" : "verified"
            }`}
            title={badgeTitle}
            aria-label={badgeTitle}
        >
            <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
            >
                <path
                    d="M12 2L14.7 4.1L18 4.3L19.7 7L22 9L21 12L22 15L19.7 17L18 19.7L14.7 19.9L12 22L9.3 19.9L6 19.7L4.3 17L2 15L3 12L2 9L4.3 7L6 4.3L9.3 4.1L12 2Z"
                    fill={isMaster ? "#21aa2c" : "#bbb29b"}
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


// ======================================================
// API CONFIGURATION — LOCAL NETWORK + PRODUCTION
// ======================================================

const API_BASE_URL = SHARED_API_BASE_URL;

// All local services use the same backend.
const ADS_API_BASE_URL = API_BASE_URL;

const LIBRARY_API_BASE_URL = API_BASE_URL;

// ======================================================
// MEDIA URL HELPER
// ======================================================

function getMediaUrl(value) {
  if (!value) return "";

  const url = String(value).trim();

  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ======================================================
// IMAGE ADVERTISEMENT URL HELPER
// ======================================================

function getAdImageUrl(value) {
  if (!value) return "";

  const url = String(value).trim();

  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${ADS_API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ======================================================
// NORMALIZE SONG
// ======================================================

function normalizeSong(song) {
  if (!song) return null;

  return {
    ...song,

    id: song.id,

    title:
      song.title ||
      song.song_title ||
      "Untitled Song",

    artist:
      song.artist ||
      song.artist_name ||
      "Unknown Artist",

    cover: getMediaUrl(
      song.cover ||
      song.cover_url ||
      song.cover_file_url
    ),

    audioUrl: getMediaUrl(
      song.audioUrl ||
      song.audio_url ||
      song.audio_file_url
    ),

    genre:
      song.genre ||
      song.music_genre ||
      "",

    country:
      song.country ||
      song.country_code ||
      song.artist_country ||
      "",

    uploader_role: String(
      song.uploader_role ||
      song.role ||
      ""
    ).toLowerCase().trim(),

    plays: Number(song.plays || 0),

    likes: Number(song.likes || 0),

    downloads: Number(song.downloads || 0),
  };
}


// ======================================================
// COUNTRY NAME HELPER
// ======================================================

function getCountryName(countryCode) {
  if (!countryCode) return "";

  const country = String(countryCode).trim();

  if (!country) return "";

  const specialCountries = {
    MW: "Malawi",
    ZA: "South Africa",
    ZM: "Zambia",
    ZW: "Zimbabwe",
    TZ: "Tanzania",
    KE: "Kenya",
    NG: "Nigeria",
    GH: "Ghana",
    UG: "Uganda",
    RW: "Rwanda",
    BW: "Botswana",
    MZ: "Mozambique",
    US: "United States",
    GB: "United Kingdom",
    OTHER: "Other",
  };

  const upperCountry = country.toUpperCase();

  if (specialCountries[upperCountry]) {
    return specialCountries[upperCountry];
  }

  if (!/^[A-Z]{2}$/.test(upperCountry)) {
    return country;
  }

  try {
    const displayNames = new Intl.DisplayNames(
      ["en"],
      { type: "region" }
    );

    return displayNames.of(upperCountry) || country;

  } catch {
    return country;
  }
}


// ======================================================
// COUNTRY CHART FLAG IMAGE
// ======================================================

function getCountryCode(chart) {
  const code = String(
    chart.country_code ||
    chart.countryCode ||
    chart.iso2 ||
    chart.code ||
    ""
  ).trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(code)) {
    return code.toLowerCase();
  }

  const fallback = {
    malawi: "mw",
    "south-africa": "za",
    zambia: "zm",
    zimbabwe: "zw",
    tanzania: "tz",
    kenya: "ke",
    nigeria: "ng",
    ghana: "gh",
    uganda: "ug",
    rwanda: "rw",
    botswana: "bw",
    mozambique: "mz",
    usa: "us",
    "united-states": "us",
    "united-kingdom": "gb",
  };

  const slug = String(
    chart.slug || chart.country || ""
  ).toLowerCase().trim();

  return fallback[slug] || "";
}

function getCountryFlagUrl(chart) {
  const code = getCountryCode(chart);

  return code
    ? `https://flagcdn.com/w160/${code}.png`
    : "";
}

// ======================================================
// NORMALIZE FILTER VALUE
// ======================================================

function normalizeFilterValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


// ======================================================
// LOAD MUSIC FROM BACKEND
// ======================================================

async function fetchHomeMusic() {
  const response = await fetch(
    `${API_BASE_URL}/api/music`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load music. Server returned ${response.status}.`
    );
  }

  const data = await response.json();

  if (data?.success === false) {
    throw new Error(
      data.message ||
      "Unable to load Cave Tunes music."
    );
  }

  const songs = Array.isArray(data?.songs)
    ? data.songs
    : [];

 const normalizedSongs = songs
  .map(normalizeSong)
  .filter(Boolean);

// ====================================================
// SEPARATE MUSIC BY UPLOADER ROLE
// ====================================================

const artistSongs = normalizedSongs.filter(
  (song) => song.uploader_role === "artist"
);

const djSongs = normalizedSongs.filter(
  (song) => song.uploader_role === "dj"
);

const producerSongs = normalizedSongs.filter(
  (song) => song.uploader_role === "producer"
);

// Support both record_label and label.
const recordLabelSongs = normalizedSongs.filter(
  (song) =>
    ["record_label", "label"].includes(
      song.uploader_role
    )
);

// All releases eligible for the main music catalog.
const catalogSongs = [
  ...artistSongs,
  ...recordLabelSongs,
];


  // ====================================================
  // NEW RELEASES
  // ====================================================

  const releaseMap = new Map();

[...catalogSongs]
    .sort((a, b) =>
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

        releaseMap.set(
          `single-${song.id}`,
          song
        );

        return;
      }

      const releaseName =
        song.album_name ||
        song.album_title ||
        song.release_name ||
        "Untitled Release";

      const artist =
        song.artist_name ||
        song.artist ||
        "Unknown Artist";

      const key =
        `${releaseType}-${artist}-${releaseName}`
          .toLowerCase();

      if (!releaseMap.has(key)) {
        releaseMap.set(key, song);
      }

    });

  // Keep all releases so filters can find matches
  // beyond the first eight.

  const releases = Array.from(
    releaseMap.values()
  );


  // ====================================================
  // TRENDING SONGS
  // ====================================================

const trending = [...catalogSongs]

    .filter((song) =>
      song.downloads > 0 ||
      song.plays > 0
    )

    .sort((a, b) => {

      const downloadDiff =
        b.downloads - a.downloads;

      if (downloadDiff !== 0) {
        return downloadDiff;
      }

      return b.plays - a.plays;

    });


  // ====================================================
  // ALBUMS AND EPS
  // ====================================================

  const albumMap = new Map();

catalogSongs.forEach((song) => {

    const releaseType = String(
      song.release_type || ""
    )
      .toLowerCase()
      .trim();

    if (
      releaseType !== "album" &&
      releaseType !== "ep"
    ) {
      return;
    }

    const releaseName =
      song.album_name ||
      song.album_title ||
      song.title ||
      "Untitled Release";

    const artistName =
      song.artist_name ||
      song.artist ||
      "Unknown Artist";

    const key =
      `${releaseType}-${artistName}-${releaseName}`
        .toLowerCase();

    if (!albumMap.has(key)) {

      albumMap.set(key, {

        id:
          song.album_id ||
          song.upc ||
          key,

        title: releaseName,

        artist: artistName,

        cover:
          song.cover_url ||
          song.cover_file_url ||
          song.cover ||
          "",

        type:
          releaseType === "ep"
            ? "EP"
            : "Album",

        genres: [],

        countries: [],

        songs: 0,

        plays: 0,

        likes: 0,

      });

    }

    const release = albumMap.get(key);

    release.songs += 1;

    release.plays += song.plays;

    release.likes += song.likes;

    if (
      song.genre &&
      !release.genres.some(
        (value) =>
          normalizeFilterValue(value) ===
          normalizeFilterValue(song.genre)
      )
    ) {
      release.genres.push(song.genre);
    }

    if (
      song.country &&
      !release.countries.some(
        (value) =>
          normalizeFilterValue(value) ===
          normalizeFilterValue(song.country)
      )
    ) {
      release.countries.push(song.country);
    }

    if (
      !release.cover &&
      song.cover
    ) {
      release.cover = song.cover;
    }

  });


  const albums = Array.from(
    albumMap.values()
  )

    .map((album) => ({

      ...album,

      cover: getMediaUrl(album.cover),

      genre: album.genres[0] || "",

      country: album.countries[0] || "",

      total_plays: album.plays,

      total_likes: album.likes,

      track_count: album.songs,

    }))

    .sort((a, b) => {

      const aScore = a.plays + a.likes;

      const bScore = b.plays + b.likes;

      return bScore - aScore;

    });


  // ====================================================
  // AVAILABLE GENRES
  // ====================================================

  const genres = [
    ...new Set(
      normalizedSongs
        .map((song) => song.genre)
        .filter(Boolean)
        .filter(
          (genre) =>
            normalizeFilterValue(genre) !== "other"
        )
    ),
  ].sort((a, b) => a.localeCompare(b));


  // ====================================================
  // AVAILABLE COUNTRIES
  // ====================================================

  const countries = [
    ...new Set(
      normalizedSongs
        .map((song) => song.country)
        .filter(Boolean)
        .filter(
          (country) =>
            normalizeFilterValue(country) !== "other"
        )
    ),
  ].sort((a, b) => a.localeCompare(b));


return {
  releases,
  trending,
  albums,
  genres,
  countries,
  allSongs: normalizedSongs,
  djSongs,
  producerSongs,
  recordLabelSongs,
};
}


// ======================================================
// SECTION HEADER
// ======================================================

function SectionHeader({
  label,
  title,
  icon,
  onSeeAll,
}) {

  return (

    <div className="home-section-header">

      <div className="home-section-heading">

        <div className="home-section-label">

          {icon}

          <span>{label}</span>

        </div>

        <h2>{title}</h2>

      </div>

      {onSeeAll && (

        <button
          type="button"
          className="home-see-all"
          onClick={onSeeAll}
        >

          <span>See all</span>

          <ChevronRight size={18} />

        </button>

      )}

    </div>

  );
}


// ======================================================
// ALBUM CARD
// ======================================================

function AlbumCard({
  album,
  onOpen,
}) {

  const title =
    album.title ||
    album.album_title ||
    album.album_name ||
    "Untitled Release";

  const artist =
    album.artist ||
    album.artist_name ||
    "Unknown Artist";

  const cover = getMediaUrl(album.cover);

  const releaseType = String(
    album.type ||
    album.release_type ||
    "Album"
  );

  const trackCount = Number(
    album.track_count ||
    album.songs ||
    0
  );

  const totalPlays = Number(
    album.total_plays ||
    album.plays ||
    0
  );

  return (

    <article
      className="home-album-card"
      onClick={onOpen}
    >

      <div className="home-album-cover">

        {cover ? (

          <img
            src={cover}
            alt={title}
            loading="lazy"
          />

        ) : (

          <div className="home-album-cover-placeholder">

            <Disc3 size={42} />

          </div>

        )}

        <button
          type="button"
          className="home-album-play"
          aria-label={`Open ${title}`}
          onClick={(event) => {

            event.stopPropagation();

            onOpen();

          }}
        >

          <Play
            size={19}
            fill="currentColor"
          />

        </button>

      </div>

      <div className="home-album-info">

        <h3>{title}</h3>

        <p>{artist}</p>

        <span>
          {releaseType}
          {" • "}
          {trackCount}
          {" "}
          {trackCount === 1 ? "song" : "songs"}
        </span>

        <small>
          {totalPlays.toLocaleString()}
          {" "}
          {totalPlays === 1 ? "play" : "plays"}
        </small>

      </div>

    </article>

  );

}

// ======================================================
// COUNTRY TRENDING RELEASE CARD
// ======================================================

function CountryTrendingReleaseCard({
  release,
  onOpen,
  type,
}) {
  const title =
    release.release_title ||
    release.song_title ||
    "Untitled Release";

  const artist =
    release.artist_name ||
    release.username ||
    "Unknown Artist";

  const cover = getMediaUrl(release.cover_url);

  const listeners = Number(
    release.local_unique_listeners || 0
  );

  const trackCount = Number(
    release.track_count || 0
  );

  return (
    <button
      type="button"
      className="home-country-release-card"
      onClick={onOpen}
    >
      <div className="home-country-release-cover">
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="home-country-release-placeholder">
            <Disc3 size={42} />
          </div>
        )}

        <span className="home-country-release-play">
          <Play size={20} fill="currentColor" />
        </span>
      </div>

      <div className="home-country-release-info">
        <h3>{title}</h3>

        <p>{artist}</p>

        <span>
          {type}
          {type !== "Single" && trackCount > 0
            ? ` • ${trackCount} ${
                trackCount === 1 ? "song" : "songs"
              }`
            : ""}
        </span>

        <small>
          {listeners.toLocaleString()}{" "}
          {listeners === 1 ? "local listener" : "local listeners"}
        </small>
      </div>
    </button>
  );
}

// ======================================================
// ANIMATED FILTER BUTTONS
// ======================================================

function AnimatedFilterRow({
  title,
  icon,
  items,
  selectedValue,
  onSelect,
  direction = "left",
}) {

  if (!items.length) return null;

  const animatedItems = [
    ...items,
    ...items,
  ];

  return (

    <div className="home-filter-row">

      <div className="home-filter-heading">

        {icon}

        <span>{title}</span>

      </div>

      <div
        className={`home-filter-marquee ${direction}`}
      >

        <div className="home-filter-track">

          {animatedItems.map((item, index) => {

            const value =
              typeof item === "string"
                ? item
                : item.value;

            const label =
              typeof item === "string"
                ? item
                : item.label;

            const active =
              normalizeFilterValue(selectedValue) ===
              normalizeFilterValue(value);

            return (

              <button
                type="button"
                key={`${value}-${index}`}
                className={`home-filter-chip ${
                  active ? "active" : ""
                }`}
                aria-pressed={active}
                onClick={() => onSelect(value)}
              >

                {label}

              </button>

            );

          })}

        </div>

      </div>

    </div>

  );

}


// ======================================================
// HOME
// ======================================================

function Home() {

  const navigate = useNavigate();

// ====================================================
// GLOBAL MUSIC PLAYER
// ====================================================

const {
  playSong,
  setFullPlayerOpen,
  currentSong,
} = usePlayer();


// ====================================================
// RECENTLY PLAYED STATE
// ====================================================

const [recentlyPlayedSongs, setRecentlyPlayedSongs] = useState([]);

    // ====================================================
  // IMAGE ADVERTISEMENT STATE
  // ====================================================

  const [imageAds, setImageAds] = useState([]);

  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const touchStartX = useRef(0);

  // ====================================================
  // MUSIC STATE
  // ====================================================

  const [newReleases, setNewReleases] = useState([]);

  const [trendingSongs, setTrendingSongs] = useState([]);

  const [topAlbums, setTopAlbums] = useState([]);

  const [djSongs, setDjSongs] = useState([]);

  

const [producerSongs, setProducerSongs] = useState([]);

  const [availableGenres, setAvailableGenres] = useState([]);

  const [availableCountries, setAvailableCountries] = useState([]);

// POPULAR ARTISTS STATE

const [popularArtists, setPopularArtists] = useState([]);
const [popularProducers, setPopularProducers] = useState([]);
const [popularDJs, setPopularDJs] = useState([]);

// ====================================================
// FEATURED COUNTRY CHARTS
// ====================================================

const [featuredCharts, setFeaturedCharts] = useState([]);
// ====================================================
// TRENDING IN LISTENER'S COUNTRY
// ====================================================

const [countryTrending, setCountryTrending] = useState({
  country: "",
  artists: [],
  albums: [],
  eps: [],
  singles: [],
});

// ====================================================
// NORMALIZE COUNTRY TRENDING SINGLES FOR PLAYER
// ====================================================

const playableCountrySingles = useMemo(() => {

  return countryTrending.singles
    .map(normalizeSong)
    .filter((song) => song && song.audioUrl);

}, [countryTrending.singles]);

  // ====================================================
  // LOADING AND ERROR
  // ====================================================

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // ====================================================
  // FILTER STATE
  // ====================================================

 const [selectedGenre, setSelectedGenre] = useState("all");

const [selectedCountry, setSelectedCountry] = useState("all");


  // ====================================================
  // LOAD HOME MUSIC
  // ====================================================

  const loadHomeMusic = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const data = await fetchHomeMusic();

      setNewReleases(data.releases);

      setTrendingSongs(data.trending);

      setTopAlbums(data.albums);
      setDjSongs(data.djSongs || []);

setProducerSongs(data.producerSongs || []);

      setAvailableGenres(data.genres);

      setAvailableCountries(data.countries);

    } catch (err) {

      console.error("HOME MUSIC ERROR:", err);

      setError(
        err.message ||
        "Unable to load Cave Tunes music."
      );

    } finally {

      setLoading(false);

    }

  }, []);


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    let cancelled = false;

    async function loadInitialMusic() {

      try {

        const data = await fetchHomeMusic();

        if (cancelled) return;

        setNewReleases(data.releases);

        setTrendingSongs(data.trending);

        setTopAlbums(data.albums);

        setDjSongs(data.djSongs || []);

setProducerSongs(data.producerSongs || []);

        setAvailableGenres(data.genres);

        setAvailableCountries(data.countries);

        setError("");

      } catch (err) {

        if (cancelled) return;

        console.error("HOME MUSIC ERROR:", err);

        setError(
          err.message ||
          "Unable to load Cave Tunes music."
        );

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }

    loadInitialMusic();

    return () => {
      cancelled = true;
    };

  }, []);

  // ====================================================
  // LOAD ACTIVE IMAGE ADVERTISEMENTS
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadImageAds() {
      try {
        const response = await fetch(
          `${ADS_API_BASE_URL}/api/ads/images/active`
        );

        if (!response.ok) {
          throw new Error("Failed to load image advertisements.");
        }

        const data = await response.json();

        if (cancelled) return;

        const ads = Array.isArray(data?.ads)
          ? data.ads.map((ad) => ({
              ...ad,
              image_url: getAdImageUrl(
                ad.image_url || ad.image_path
              ),
            })).filter((ad) => ad.image_url)
          : [];

        setImageAds(ads);
        setActiveAdIndex(0);

      } catch (error) {
        console.error("IMAGE ADS ERROR:", error);

        if (!cancelled) {
          setImageAds([]);
        }
      }
    }

    loadImageAds();

    return () => {
      cancelled = true;
    };
  }, []);

// ====================================================
// LOAD POPULAR CREATORS
// ====================================================

useEffect(() => {
    let cancelled = false;

    async function loadPopularCreators() {
        try {
            const data = await getPopularCreators();
console.log("HOME POPULAR CREATORS:", data?.creators);
            if (cancelled) return;

            const creators = Array.isArray(data?.creators)
                ? data.creators
                : [];

            // Preserve the backend discovery ranking.
            // Do NOT sort these arrays on the frontend.

            setPopularArtists(
                creators.filter(
                    (creator) =>
                        String(creator.role || "").toLowerCase() === "artist"
                )
            );

            setPopularProducers(
                creators.filter(
                    (creator) =>
                        String(creator.role || "").toLowerCase() === "producer"
                )
            );

            setPopularDJs(
                creators.filter(
                    (creator) =>
                        String(creator.role || "").toLowerCase() === "dj"
                )
            );

        } catch (error) {
            console.error("POPULAR CREATORS ERROR:", error);

            if (!cancelled) {
                setPopularArtists([]);
                setPopularProducers([]);
                setPopularDJs([]);
            }
        }
    }

    loadPopularCreators();

    return () => {
        cancelled = true;
    };

}, []);

// ====================================================
// LOAD TRENDING IN LISTENER'S COUNTRY
// ====================================================

useEffect(() => {
  let cancelled = false;

  async function loadCountryTrending() {
    try {
      const data = await getTrendingInCountry();

      if (cancelled) return;

      setCountryTrending({
        country: data?.country || "",
        artists: Array.isArray(data?.artists)
          ? data.artists
          : [],
        albums: Array.isArray(data?.albums)
          ? data.albums
          : [],
        eps: Array.isArray(data?.eps)
          ? data.eps
          : [],
        singles: Array.isArray(data?.singles)
          ? data.singles
          : [],
      });

    } catch (error) {
      console.error(
        "TRENDING IN COUNTRY ERROR:",
        error
      );

      if (!cancelled) {
        setCountryTrending({
          country: "",
          artists: [],
          albums: [],
          eps: [],
          singles: [],
        });
      }
    }
  }

  loadCountryTrending();

  return () => {
    cancelled = true;
  };

}, []);

// ====================================================
// LOAD FEATURED COUNTRY CHARTS
// ====================================================

useEffect(() => {
  let cancelled = false;

  async function loadFeaturedCharts() {
    try {
      const data = await getFeaturedCharts();

      if (cancelled) return;

      const charts =
        data?.charts ||
        data?.featuredCharts ||
        data?.featured ||
        [];

      const normalizedCharts = Array.isArray(charts)
        ? charts
        : Object.entries(charts).map(([slug, chart]) => ({
            slug,
            ...chart,
          }));

      setFeaturedCharts(normalizedCharts);

    } catch (error) {
      console.error("FEATURED CHARTS ERROR:", error);

      if (!cancelled) {
        setFeaturedCharts([]);
      }
    }
  }

  loadFeaturedCharts();

  return () => {
    cancelled = true;
  };
}, []);

// ====================================================
// LOAD RECENTLY PLAYED SONGS
// ====================================================

useEffect(() => {
  let cancelled = false;

  async function loadRecentlyPlayed() {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken");

      const response = await fetch(
        `${LIBRARY_API_BASE_URL}/api/library/recently-played`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
        }
      );

      if (!response.ok) {
        if (response.status !== 401) {
          throw new Error(
            `Recently played request failed: ${response.status}`
          );
        }

        if (!cancelled) {
          setRecentlyPlayedSongs([]);
        }

        return;
      }

      const data = await response.json();

      if (cancelled) return;

      const songs = Array.isArray(data?.songs)
        ? data.songs
            .map(normalizeSong)
            .filter(Boolean)
        : [];

      setRecentlyPlayedSongs(songs);

    } catch (error) {
      console.error("RECENTLY PLAYED ERROR:", error);

      if (!cancelled) {
        setRecentlyPlayedSongs([]);
      }
    }
  }

  // Allow the listening-history request to finish
  // before refreshing after a song change.

  const timeout = setTimeout(
    loadRecentlyPlayed,
    currentSong?.id ? 700 : 0
  );

  return () => {
    cancelled = true;
    clearTimeout(timeout);
  };

}, [currentSong?.id]);

    // ====================================================
  // IMAGE ADVERTISEMENT CAROUSEL CONTROLS
  // ====================================================

  const nextImageAd = () => {
    setActiveAdIndex((current) =>
      current >= imageAds.length - 1 ? 0 : current + 1
    );
  };

  const previousImageAd = () => {
    setActiveAdIndex((current) =>
      current <= 0 ? imageAds.length - 1 : current - 1
    );
  };

  // Automatically change adverts every 5 seconds

  useEffect(() => {
    if (imageAds.length <= 1) return;

    const interval = setInterval(() => {
      setActiveAdIndex((current) =>
        (current + 1) % imageAds.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [imageAds.length]);

  // Mobile swipe support

  const handleAdTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleAdTouchEnd = (event) => {
    const touchEndX = event.changedTouches[0].clientX;

    const difference =
      touchStartX.current - touchEndX;

    if (Math.abs(difference) < 45) return;

    if (difference > 0) {
      nextImageAd();
    } else {
      previousImageAd();
    }
  };

  // Open advert destination when supplied

  const openImageAd = (ad) => {
    if (!ad?.click_url) return;

    const destination = ad.click_url.trim();

    if (!destination) return;

    if (destination.startsWith("/")) {
      navigate(destination);
      return;
    }

    try {
      const url = new URL(destination);

      if (
        url.protocol === "https:" ||
        url.protocol === "http:"
      ) {
        window.open(url.href, "_blank", "noopener,noreferrer");
      }
    } catch {
      console.error("Invalid image advertisement URL:", destination);
    }
  };
// ======================================================
// GENRE FILTER — SAME LOGIC AS TUNES
// ======================================================

const toggleGenre = (genre) => {
  setSelectedGenre((current) =>
    current === genre ? "all" : genre
  );
};


// ======================================================
// COUNTRY FILTER — SAME LOGIC AS TUNES
// ======================================================

const toggleCountry = (country) => {
  setSelectedCountry((current) =>
    current === country ? "all" : country
  );
};


// ======================================================
// CLEAR FILTERS
// ======================================================

const clearFilters = () => {
  setSelectedGenre("all");
  setSelectedCountry("all");
};


const hasActiveFilters =
  selectedGenre !== "all" ||
  selectedCountry !== "all";


  // ====================================================
  // FILTER NEW RELEASES
  // ====================================================
const filteredNewReleases = useMemo(() => {

  return newReleases.filter((song) => {

    const matchesGenre =
      selectedGenre === "all" ||
      normalizeFilterValue(song.genre) ===
      normalizeFilterValue(selectedGenre);

    const matchesCountry =
      selectedCountry === "all" ||
      normalizeFilterValue(song.country) ===
      normalizeFilterValue(selectedCountry);

    return matchesGenre && matchesCountry;

  });

}, [
  newReleases,
  selectedGenre,
  selectedCountry,
]);

  // ====================================================
  // FILTER TRENDING SONGS
  // ====================================================

const filteredTrendingSongs = useMemo(() => {

  return trendingSongs.filter((song) => {

    const matchesGenre =
      selectedGenre === "all" ||
      normalizeFilterValue(song.genre) ===
      normalizeFilterValue(selectedGenre);

    const matchesCountry =
      selectedCountry === "all" ||
      normalizeFilterValue(song.country) ===
      normalizeFilterValue(selectedCountry);

    return matchesGenre && matchesCountry;

  });

}, [
  trendingSongs,
  selectedGenre,
  selectedCountry,
]);


  // ====================================================
  // FILTER ALBUMS
  // ====================================================
const filteredAlbums = useMemo(() => {

  return topAlbums.filter((album) => {

    const matchesGenre =
      selectedGenre === "all" ||
      (album.genres || []).some(
        (genre) =>
          normalizeFilterValue(genre) ===
          normalizeFilterValue(selectedGenre)
      );

    const matchesCountry =
      selectedCountry === "all" ||
      (album.countries || []).some(
        (country) =>
          normalizeFilterValue(country) ===
          normalizeFilterValue(selectedCountry)
      );

    return matchesGenre && matchesCountry;

  });

}, [
  topAlbums,
  selectedGenre,
  selectedCountry,
]);


// ====================================================
// FILTER DJ SONGS
// ====================================================

const filteredDJSongs = useMemo(() => {

  return djSongs.filter((song) => {

    const matchesGenre =
      selectedGenre === "all" ||
      normalizeFilterValue(song.genre) ===
      normalizeFilterValue(selectedGenre);

    const matchesCountry =
      selectedCountry === "all" ||
      normalizeFilterValue(song.country) ===
      normalizeFilterValue(selectedCountry);

    return matchesGenre && matchesCountry;

  });

}, [
  djSongs,
  selectedGenre,
  selectedCountry,
]);


// ====================================================
// FILTER PRODUCER SONGS
// ====================================================

const filteredProducerSongs = useMemo(() => {

  return producerSongs.filter((song) => {

    const matchesGenre =
      selectedGenre === "all" ||
      normalizeFilterValue(song.genre) ===
      normalizeFilterValue(selectedGenre);

    const matchesCountry =
      selectedCountry === "all" ||
      normalizeFilterValue(song.country) ===
      normalizeFilterValue(selectedCountry);

    return matchesGenre && matchesCountry;

  });

}, [
  producerSongs,
  selectedGenre,
  selectedCountry,
]);


  // ====================================================
  // NAVIGATION
  // ====================================================

  const goToTunes = () => {
    navigate("/tunes");
  };

  const goToArtists = () => {
    navigate("/artists");
  };


  // ====================================================
  // OPEN ALBUM
  // ====================================================

  const openAlbum = (album) => {

    const type = String(
      album.type || "album"
    ).toLowerCase();

    if (type === "ep") {

      navigate(
        `/ep/${encodeURIComponent(album.title)}/${encodeURIComponent(album.artist)}`
      );

      return;

    }

    navigate(
      `/album/${encodeURIComponent(album.title)}/${encodeURIComponent(album.artist)}`
    );

  };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {

    return (

      <main className="home-page">

        <section className="home-loading">

          <div className="home-loading-logo">

            <img
              src="/Cave-Tunes-logo.png"
              alt="Cave Tunes"
            />

          </div>

          <h2>Loading Cave Tunes...</h2>

          <p>Getting the latest music for you.</p>

        </section>

      </main>

    );

  }


  // ====================================================
  // PAGE
  // ====================================================

  return (

    <main className="home-page">

{/* ====================================================
    RECENTLY PLAYED - SPOTIFY STYLE
==================================================== */}

{recentlyPlayedSongs.length > 0 && (

  <section className="home-recently-played-section">

    <SectionHeader
      label="YOUR MUSIC HISTORY"
      title="Recently Played"
      icon={<RefreshCw size={16} />}
      onSeeAll={() => navigate("/library")}
    />

    <div className="home-recently-played-row">

      {recentlyPlayedSongs.map((song) => (

        <button
          type="button"
          className="home-recently-played-card"
          key={song.id}
          onClick={() => {
            playSong(song, recentlyPlayedSongs);
            setFullPlayerOpen(true);
          }}
          aria-label={`Play ${song.title} by ${song.artist}`}
        >

          <div className="home-recently-played-cover">

            {song.cover ? (

              <img
                src={song.cover}
                alt={song.title}
                loading="lazy"
              />

            ) : (

              <div className="home-recently-played-placeholder">
                <Disc3 size={42} />
              </div>

            )}

            <span className="home-recently-played-play">

              <Play
                size={23}
                fill="currentColor"
              />

            </span>

          </div>

          <div className="home-recently-played-info">

            <h3>{song.title}</h3>

            <p>{song.artist}</p>

          </div>

        </button>

      ))}

    </div>

  </section>

)}

  {/* IMAGE ADVERTISEMENT CAROUSEL */}

        {imageAds.length > 0 && (

          <section className="home-image-ads-section">

            <div className="home-image-ads-header">
              <span>FEATURED ADVERTISEMENTS</span>
            </div>

            <div
              className="home-image-ads-carousel"
              onTouchStart={handleAdTouchStart}
              onTouchEnd={handleAdTouchEnd}
            >

              <div
                className="home-image-ads-track"
                style={{
                  transform: `translateX(-${activeAdIndex * 100}%)`,
                }}
              >

                {imageAds.map((ad) => (

                  <div
                    className="home-image-ad-slide"
                    key={ad.id}
                  >

                    <div
                      className={`home-image-ad-content ${
                        ad.click_url ? "clickable" : ""
                      }`}
                      onClick={() => openImageAd(ad)}
                      role={ad.click_url ? "link" : undefined}
                      tabIndex={ad.click_url ? 0 : undefined}
                      onKeyDown={(event) => {
                        if (
                          ad.click_url &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          openImageAd(ad);
                        }
                      }}
                    >

                      <img
                        src={ad.image_url}
                        alt={ad.alt_text || ad.title || "Cave Tunes advertisement"}
                        loading="lazy"
                      />

                      {(ad.title || ad.description) && (

                        <div className="home-image-ad-caption">

                          {ad.title && <h3>{ad.title}</h3>}

                          {ad.description && (
                            <p>{ad.description}</p>
                          )}

                        </div>

                      )}

                    </div>

                  </div>

                ))}

              </div>

              {imageAds.length > 1 && (

                <>

                  <button
                    type="button"
                    className="home-image-ad-arrow previous"
                    onClick={previousImageAd}
                    aria-label="Previous advertisement"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <button
                    type="button"
                    className="home-image-ad-arrow next"
                    onClick={nextImageAd}
                    aria-label="Next advertisement"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <div className="home-image-ad-dots">

                    {imageAds.map((ad, index) => (

                      <button
                        type="button"
                        key={ad.id}
                        className={`home-image-ad-dot ${
                          activeAdIndex === index ? "active" : ""
                        }`}
                        onClick={() => setActiveAdIndex(index)}
                        aria-label={`Show advertisement ${index + 1}`}
                        aria-pressed={activeAdIndex === index}
                      />

                    ))}

                  </div>

                </>

              )}

            </div>

          </section>

        )}

      {/* HERO */}

      <section className="home-hero">

        <div className="home-hero-background" />

        <div className="home-hero-content">

          <div className="home-hero-brand">

            <img
              src="/Cave-Tunes-logo.png"
              alt="Cave Tunes"
              className="home-hero-brand-logo"
            />

            <span className="home-hero-brand-text">
              Cave Tunes
            </span>

          </div>

          <h1>
            Discover your
            <br />

            <span>
              next favorite song.
            </span>
          </h1>

          <p>
            Stream fresh music, discover rising artists
            and experience sounds from Africa and
            around the world.
          </p>

          <div className="home-hero-actions">

            <button
              type="button"
              className="home-primary-button"
              onClick={goToTunes}
            >

              <Headphones size={19} />

              Explore Tunes

              <ArrowRight size={18} />

            </button>

            <button
              type="button"
              className="home-secondary-button"
              onClick={goToArtists}
            >

              Discover Artists

            </button>

          </div>

        </div>


        {/* ROTATING LOGO */}

        <div className="home-hero-decoration">

          <div className="home-floating-disc">

            <img
              src="/Cave-Tunes-logo.png"
              alt="Cave Tunes"
              className="home-rotating-logo"
            />

          </div>

        </div>

      </section>


      {/* ERROR */}

      {error && (

        <div className="home-error">

          <Music2 size={22} />

          <span>{error}</span>

          <button
            type="button"
            onClick={loadHomeMusic}
          >

            <RefreshCw size={16} />

            Retry

          </button>

        </div>

      )}


      {/* CONTENT */}

      <div className="home-content">



{/* ====================================================
    FEATURED COUNTRY CHARTS
==================================================== */}

{featuredCharts.length > 0 && (
  <section className="home-featured-charts-section">

    <SectionHeader
      label="COUNTRY MUSIC RANKINGS"
      title="Featured Charts"
      icon={<TrendingUp size={16} />}
      onSeeAll={() => navigate("/charts")}
    />

    <div className="home-featured-charts-grid">

      {featuredCharts.map((chart) => {

        const slug = chart.slug;

        const chartName =
          chart.name ||
          chart.chart_name ||
          chart.country_name ||
          chart.country ||
          slug;

        const flagUrl = getCountryFlagUrl(chart);

        return (
          <button
            type="button"
            className="home-featured-chart-card"
            key={slug}
            onClick={() =>
              navigate(
                `/charts?chart=${encodeURIComponent(slug)}`
              )
            }
          >

            <div className="home-featured-chart-flag">

              {flagUrl ? (
                <img
                  src={flagUrl}
                  alt={`${chartName} flag`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Globe2 size={55} />
              )}

            </div>

            <div className="home-featured-chart-info">

              <span>COUNTRY CHART</span>

              <h3>{chartName}</h3>

              <p>
                Explore the top songs
              </p>

            </div>

            <div className="home-featured-chart-arrow">
              <ArrowRight size={19} />
            </div>

          </button>
        );
      })}

    </div>

  </section>
)}

        {/* GENRE AND COUNTRY FILTERS */}

        {(availableGenres.length > 0 ||
          availableCountries.length > 0) && (

          <section className="home-filters-section">

            <div className="home-filters-header">

              <div>

                <div className="home-section-label">

                  <SlidersHorizontal size={16} />

                  MUSIC DISCOVERY

                </div>

                <h2>Explore by Genre & Country</h2>

                <p>
                  Discover music from different sounds
                  and places around the world.
                </p>

              </div>

              {hasActiveFilters && (

                <button
                  type="button"
                  className="home-clear-filters"
                  onClick={clearFilters}
                >

                  <X size={15} />

                  Clear Filters

                </button>

              )}

            </div>


            {/* GENRES */}

            <AnimatedFilterRow
              title="GENRES"
              icon={<Music2 size={16} />}
              items={availableGenres}
              selectedValue={selectedGenre}
              onSelect={toggleGenre}
              direction="left"
            />


            {/* COUNTRIES */}

            <AnimatedFilterRow
              title="COUNTRIES"
              icon={<Globe2 size={16} />}
              items={availableCountries.map((country) => ({
                value: country,
                label: getCountryName(country),
              }))}
              selectedValue={selectedCountry}
              onSelect={toggleCountry}
              direction="right"
            />


            {/* ACTIVE FILTER INFORMATION */}

            {hasActiveFilters && (

              <div className="home-active-filters">

                <span>Showing music:</span>

                {selectedGenre !== "all" && (

                  <span className="home-active-filter-tag">
                    {selectedGenre}
                  </span>

                )}

               {selectedCountry !== "all" && (

                  <span className="home-active-filter-tag">
                    {getCountryName(selectedCountry)}
                  </span>

                )}

              </div>

            )}

          </section>

        )}


      


        {/* NEW RELEASES */}

        <section className="home-music-section">

          <SectionHeader
            label="JUST DROPPED"
            title="New Releases"
            icon={<Sparkles size={16} />}
            onSeeAll={goToTunes}
          />

          {filteredNewReleases.length > 0 ? (

            <div className="home-music-grid">

              {filteredNewReleases.slice(0, 8).map((song) => (

                <MusicCard
                  key={song.id}
                  song={song}
                  songs={filteredNewReleases}
                />

              ))}

            </div>

          ) : (

            <div className="home-empty-section">

              <Music2 size={28} />

              <p>
                {hasActiveFilters
                  ? "No new releases match your selected filters."
                  : "No new releases yet."}
              </p>

              {hasActiveFilters && (

                <button
                  type="button"
                  className="home-clear-filters"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>

              )}

            </div>

          )}

        </section>


{/* ====================================================
    DJ SONGS
==================================================== */}

<section className="home-music-section">

  <SectionHeader
    label="MIXES AND DJ RELEASES"
    title="DJ Mixtapes"
    icon={<Headphones size={16} />}
    onSeeAll={() => navigate("/tunes")}
  />

  {filteredDJSongs.length > 0 ? (

    <div className="home-music-grid">

      {filteredDJSongs.slice(0, 8).map((song) => (

        <MusicCard
          key={song.id}
          song={song}
          songs={filteredDJSongs}
        />

      ))}

    </div>

  ) : (

    <div className="home-empty-section">

      <Headphones size={28} />

      <p>
        {hasActiveFilters
          ? "No DJ songs match your selected filters."
          : "DJ songs will appear here when DJs upload music."}
      </p>

    </div>

  )}

</section>


{/* ====================================================
    PRODUCER SONGS
==================================================== */}

<section className="home-music-section">

  <SectionHeader
    label="PRODUCER RELEASES"
    title="Producer's Catalog"
    icon={<Disc3 size={16} />}
    onSeeAll={() => navigate("/tunes")}
  />

  {filteredProducerSongs.length > 0 ? (

    <div className="home-music-grid">

      {filteredProducerSongs.slice(0, 8).map((song) => (

        <MusicCard
          key={song.id}
          song={song}
          songs={filteredProducerSongs}
        />

      ))}

    </div>

  ) : (

    <div className="home-empty-section">

      <Disc3 size={28} />

      <p>
        {hasActiveFilters
          ? "No producer songs match your selected filters."
          : "Producer songs will appear here when producers upload music."}
      </p>

    </div>

  )}

</section>


{/* ====================================================
    POPULAR ARTISTS
==================================================== */}

{popularArtists.length > 0 && (
  <section className="home-popular-artists-section">

    <SectionHeader
      label="COMMUNITY FAVORITES"
      title="Popular Artists"
      icon={<Music2 size={16} />}
      onSeeAll={goToArtists}
    />

    <div className="home-popular-artists-row">

      {popularArtists.map((artist) => {

        const artistName =
          artist.username ||
          artist.artist_name ||
          artist.name ||
          "Unknown Artist";

        const artistImage = getAdImageUrl(
          artist.profile_image_url ||
          artist.profile_image ||
          artist.avatar ||
          ""
        );

        const followers = Number(
          artist.followers_count || 0
        );

        return (
          <button
            type="button"
            className="home-popular-artist-card"
            key={artist.id}
            onClick={() =>
             navigate(`/creator/${artist.role}/${artist.id}`)
            }
            aria-label={`View ${artistName}'s profile`}
          >

            <div className="home-popular-artist-image">

              <Music2
                className="home-popular-artist-placeholder"
                size={38}
              />

              {artistImage && (
                <img
                  src={artistImage}
                  alt={artistName}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}

            </div>

            <div className="home-popular-artist-info">

             <div className="home-creator-name-row">
    <h3>{artistName}</h3>

  <CreatorVerificationBadge creator={artist} />
</div>
<span className="home-creator-role-badge">
    Artist
</span>
              <p>
                {followers.toLocaleString()}{" "}
                {followers === 1 ? "follower" : "followers"}
              </p>

            </div>

          </button>
        );
      })}

    </div>

  </section>
)}

{/* ====================================================
   POPULAR PRODUCERS
==================================================== */}

{popularProducers.length > 0 && (
    <section className="home-popular-artists-section">

        <SectionHeader
            label="BEHIND THE SOUND"
            title="Popular Producers"
            icon={<Disc3 size={16} />}
        />

        <div className="home-popular-artists-row">

            {popularProducers.map((producer) => {

                const producerName =
                    producer.username ||
                    producer.name ||
                    "Unknown Producer";

                const producerImage = getMediaUrl(
                    producer.profile_image_url ||
                    producer.profile_image ||
                    producer.avatar ||
                    ""
                );

                const followers = Number(
                    producer.followers_count || 0
                );

                return (
                    <button
                        type="button"
                        className="home-popular-artist-card"
                        key={producer.id}
                        onClick={() =>
                            navigate(`/creator/${producer.role}/${producer.id}`)
                        }
                        aria-label={`View ${producerName}'s profile`}
                    >

                        <div className="home-popular-artist-image">

                            <Disc3
                                className="home-popular-artist-placeholder"
                                size={38}
                            />

                            {producerImage && (
                                <img
                                    src={producerImage}
                                    alt={producerName}
                                    loading="lazy"
                                    onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                    }}
                                />
                            )}

                        </div>

                        <div className="home-popular-artist-info">

                           <div className="home-creator-name-row">
    <h3>{producerName}</h3>

   <CreatorVerificationBadge creator={producer} />
</div>
<span className="home-creator-role-badge">
    Producer
</span>
                            <p>
                                {followers.toLocaleString()}{" "}
                                {followers === 1 ? "follower" : "followers"}
                            </p>

                        </div>

                    </button>
                );
            })}

        </div>

    </section>
)}

{/* ====================================================
   POPULAR DJs
==================================================== */}

{popularDJs.length > 0 && (
    <section className="home-popular-artists-section">

        <SectionHeader
            label="ON THE DECKS"
            title="Popular DJs"
            icon={<Headphones size={16} />}
        />

        <div className="home-popular-artists-row">

            {popularDJs.map((dj) => {

                const djName =
                    dj.username ||
                    dj.name ||
                    "Unknown DJ";

                const djImage = getMediaUrl(
                    dj.profile_image_url ||
                    dj.profile_image ||
                    dj.avatar ||
                    ""
                );

                const followers = Number(
                    dj.followers_count || 0
                );

                return (
                    <button
                        type="button"
                        className="home-popular-artist-card"
                        key={dj.id}
                        onClick={() =>
                            navigate(`/creator/${dj.role}/${dj.id}`)
                        }
                        aria-label={`View ${djName}'s profile`}
                    >

                        <div className="home-popular-artist-image">

                            <Headphones
                                className="home-popular-artist-placeholder"
                                size={38}
                            />

                            {djImage && (
                                <img
                                    src={djImage}
                                    alt={djName}
                                    loading="lazy"
                                    onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                    }}
                                />
                            )}

                        </div>

                        <div className="home-popular-artist-info">

                           <div className="home-creator-name-row">
    <h3>{djName}</h3>

  <CreatorVerificationBadge creator={dj} />
</div>

<span className="home-creator-role-badge">
    DJ
</span>
                            <p>
                                {followers.toLocaleString()}{" "}
                                {followers === 1 ? "follower" : "followers"}
                            </p>

                        </div>

                    </button>
                );
            })}

        </div>

    </section>
)}

{/* ====================================================
    TRENDING ARTISTS IN LISTENER'S COUNTRY
==================================================== */}

{countryTrending.artists.length > 0 && (
  <section className="home-country-trending-section">

    <SectionHeader
      label="POPULAR WITH LISTENERS IN YOUR COUNTRY"
      title={`Trending Artists in ${getCountryName(countryTrending.country)}`}
      icon={<TrendingUp size={16} />}
      onSeeAll={goToArtists}
    />

    <div className="home-country-artists-row">

      {countryTrending.artists.map((artist) => {
        const artistName =
          artist.username ||
          artist.artist_name ||
          "Unknown Artist";

        const artistImage = getMediaUrl(
          artist.profile_image_url || ""
        );

        const listeners = Number(
          artist.local_unique_listeners || 0
        );

        return (
          <button
            type="button"
            className="home-country-artist-card"
            key={artist.id}
            onClick={() =>
              navigate(
                `/creator/${artist.role || "artist"}/${artist.id}`
              )
            }
            aria-label={`View ${artistName}'s profile`}
          >

            <div className="home-country-artist-image">

              <Music2
                className="home-country-artist-placeholder"
                size={38}
              />

              {artistImage && (
                <img
                  src={artistImage}
                  alt={artistName}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}

            </div>

            <div className="home-country-artist-info">
              <div className="home-creator-name-row">
    <h3>{artistName}</h3>

  <CreatorVerificationBadge creator={artist} />
</div>

              <p>
                {listeners.toLocaleString()}{" "}
                {listeners === 1 ? "local listener" : "local listeners"}
              </p>
            </div>

          </button>
        );
      })}

    </div>
  </section>
)}


{/* ====================================================
    TRENDING ALBUMS IN LISTENER'S COUNTRY
==================================================== */}

{countryTrending.albums.length > 0 && (
  <section className="home-country-trending-section">

    <SectionHeader
      label="ALBUMS GAINING ATTENTION"
      title={`Trending Albums in ${getCountryName(countryTrending.country)}`}
      icon={<Disc3 size={16} />}
      onSeeAll={goToTunes}
    />

    <div className="home-country-releases-row">

      {countryTrending.albums.map((album) => (
        <CountryTrendingReleaseCard
          key={album.id}
          release={album}
          type="Album"
          onOpen={() =>
            openAlbum({
              title: album.release_title,
              artist: album.artist_name,
              type: "album",
            })
          }
        />
      ))}

    </div>
  </section>
)}


{/* ====================================================
    TRENDING EPS IN LISTENER'S COUNTRY
==================================================== */}

{countryTrending.eps.length > 0 && (
  <section className="home-country-trending-section">

    <SectionHeader
      label="EPS GAINING ATTENTION"
      title={`Trending EPs in ${getCountryName(countryTrending.country)}`}
      icon={<Disc3 size={16} />}
      onSeeAll={goToTunes}
    />

    <div className="home-country-releases-row">

      {countryTrending.eps.map((ep) => (
        <CountryTrendingReleaseCard
          key={ep.id}
          release={ep}
          type="EP"
          onOpen={() =>
            openAlbum({
              title: ep.release_title,
              artist: ep.artist_name,
              type: "ep",
            })
          }
        />
      ))}

    </div>
  </section>
)}


{/* ====================================================
    TRENDING SINGLES IN LISTENER'S COUNTRY
==================================================== */}

{countryTrending.singles.length > 0 && (
  <section className="home-country-trending-section">

    <SectionHeader
      label="SINGLES PEOPLE ARE LISTENING TO"
      title={`Trending Singles in ${getCountryName(countryTrending.country)}`}
      icon={<TrendingUp size={16} />}
      onSeeAll={goToTunes}
    />

    <div className="home-country-releases-row">

      {countryTrending.singles.map((single) => (
        <CountryTrendingReleaseCard
          key={single.id}
          release={single}
          type="Single"
         onOpen={() => {

  const songToPlay = playableCountrySingles.find(
    (song) => String(song.id) === String(single.id)
  );

  if (!songToPlay) {
    console.error(
      "Unable to play trending single:",
      single.title
    );
    return;
  }

  playSong(
    songToPlay,
    playableCountrySingles
  );

  setFullPlayerOpen(true);

}}
        />
      ))}

    </div>
  </section>
)}

        {/* TRENDING SONGS */}

        <section className="home-music-section">

          <SectionHeader
            label="LISTEN NOW"
            title="Trending Global Songs"
            icon={<TrendingUp size={16} />}
            onSeeAll={goToTunes}
          />

          {filteredTrendingSongs.length > 0 ? (

            <div className="home-music-grid">

              {filteredTrendingSongs.slice(0, 8).map((song) => (

                <MusicCard
                  key={song.id}
                  song={song}
                  songs={filteredTrendingSongs}
                />

              ))}

            </div>

          ) : (

            <div className="home-empty-section">

              <TrendingUp size={28} />

              <p>
                {hasActiveFilters
                  ? "No trending songs match your selected filters."
                  : "Trending songs will appear here as people listen and download music."}
              </p>

            </div>

          )}

        </section>


        {/* TOP ALBUMS AND EPS */}

        <section className="home-albums-section">

          <SectionHeader
            label="TOP GLOBAL COLLECTIONS"
            title="Top Albums & EPs"
            icon={<Music2 size={16} />}
            onSeeAll={goToTunes}
          />

          {filteredAlbums.length > 0 ? (

            <div className="home-albums-grid">

              {filteredAlbums.slice(0, 8).map((album) => (

                <AlbumCard
                  key={album.id}
                  album={album}
                  onOpen={() => openAlbum(album)}
                />

              ))}

            </div>

          ) : (

            <div className="home-empty-section">

              <Music2 size={28} />

              <p>
                {hasActiveFilters
                  ? "No albums or EPs match your selected filters."
                  : "Albums and EPs will appear here when artists upload them."}
              </p>

            </div>

          )}

        </section>

{/* RADIO HERO */}
<section className="radio-hero">

        <div className="radio-hero-content">

          <div className="radio-eyebrow">
            <span className="radio-live-dot" />
            CAVE TUNES BROADCAST
          </div>

          <h1>
            CAVE TUNES
            <span> RADIO</span>
          </h1>

          <p>
            Your home for African music, live shows,
            countdowns and unforgettable radio moments.
          </p>

          <div className="radio-hero-tag">
            <RadioIcon size={17} />
            <span>Music. Culture. Connection.</span>
          </div>

        </div>

        <div className="radio-hero-art">

          <div className="radio-art-glow" />

          <div className="radio-art-circle">
            <RadioIcon size={76} strokeWidth={1.2} />
          </div>

          <div className="radio-wave">
            {Array.from({ length: 19 }).map((_, index) => (
              <span
                key={index}
                style={{
                  animationDelay: `${index * 0.08}s`,
                }}
              />
            ))}
          </div>

        </div>

      </section>


{/* SUBSCRIPTION-ADVERT-BOARD*/}

<div className="subscription-advert-bar">
  <h2>Subscription Advert</h2>
   <p>Upgrade your plan to access more features inside cave tunes.</p>
        <div className="subscription-benefits">

      <div className="subscription-benefit">
        <Download size={22} />

        <div>
          <h3>Premium Downloads</h3>

          <p>
            Download supported Cave Tunes music for
            offline listening inside the app.
          </p>
        </div>
      </div>

      <div className="subscription-benefit">
        <Headphones size={22} />

        <div>
          <h3>Ad-Free Listening</h3>

          <p>
            Enjoy your music without interruptions
            from advertisements.
          </p>
        </div>
      </div>

      <div className="subscription-benefit">
        <Scissors size={22} />

        <div>
          <h3>Sizaro</h3>

          <p>
        Extract Music From Visuals in the Cave Tunes
            Sizaro experience.
          </p>
        </div>
      </div>
 <div className="subscription-benefit">
       

        <div>
          <h3>New Coming soon</h3>

          <p>
       Stay tuned inside cave tunes for more new features coming soon!
          </p>
        </div>
      </div>
    </div>
   <br></br>
   <button className="subcription-button-check"
  onClick={() => {
            navigate("/subscription");
    }}
   >

    Check Subscription plans</button>
</div>

        {/* DISCOVER BANNER */}

        <section className="home-discover-banner">

          <div className="home-discover-icon">

            <Music2 size={28} />

          </div>

          <div className="home-discover-text">

            <span>CAVE TUNES DISCOVERY</span>

            <h2>
              There's always something new to hear.
            </h2>

            <p>
              Discover independent artists,
              producers, DJs and sounds from
              across the world.
            </p>

          </div>

          <button
            type="button"
            className="home-discover-button"
            onClick={goToTunes}
          >

            Explore

            <ArrowRight size={18} />

          </button>

        </section>

      </div>

    </main>

  );

}


export default Home;