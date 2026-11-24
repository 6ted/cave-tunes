
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Globe2,
  TrendingUp,
  Music2,
  Play,
  RefreshCw,
  Headphones,
  Crown,
  ChartNoAxesCombined,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { usePlayer } from "../context/usePlayer";

import {
  getFeaturedCharts,
  getAvailableCharts,
  getCountryChart,
  getMediaUrl,
} from "../services/api";

import "./Charts.css";

// ======================================================
// HELPERS
// ======================================================

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

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
      song.username ||
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

    plays: Number(
      song.plays ??
      song.qualifying_plays ??
      0
    ),

    likes: Number(song.likes || 0),
  };
}

function getChartList(data) {
  const charts =
    data?.charts ??
    data?.countries ??
    data?.availableCharts ??
    [];

  if (Array.isArray(charts)) {
    return charts;
  }

  if (charts && typeof charts === "object") {
    return Object.entries(charts).map(([slug, chart]) => ({
      slug,
      ...chart,
    }));
  }

  return [];
}

function getFeaturedList(data) {
  const charts =
    data?.charts ??
    data?.featuredCharts ??
    data?.featured ??
    [];

  if (Array.isArray(charts)) {
    return charts;
  }

  if (charts && typeof charts === "object") {
    return Object.entries(charts).map(([slug, chart]) => ({
      slug,
      ...chart,
    }));
  }

  return [];
}

function getCountryLabel(chart) {
  return (
    chart?.name ||
    chart?.chart_name ||
    chart?.country_name ||
    chart?.country ||
    chart?.slug ||
    "Country Chart"
  );
}

function getCountryCode(chart) {
  const code = String(
    chart?.country_code ||
    chart?.countryCode ||
    chart?.iso2 ||
    chart?.code ||
    chart?.slug ||
    ""
  ).trim().toLowerCase();

  const countryCodes = {
    malawi: "mw",
    france: "fr",
    "united kingdom": "gb",
    uk: "gb",
    "united states": "us",
    usa: "us",
  };

  return countryCodes[code] ||
    (/^[a-z]{2}$/.test(code) ? code : null);
}

function getCountryFlagUrl(chart) {
  const code = getCountryCode(chart);

  return code
    ? `https://flagcdn.com/w80/${code}.png`
    : null;
}

// ======================================================
// CHARTS PAGE
// ======================================================

function Charts() {
  const navigate = useNavigate();

  const {
    playSong,
    setFullPlayerOpen,
  } = usePlayer();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [availableCharts, setAvailableCharts] = useState([]);
  const [featuredCharts, setFeaturedCharts] = useState([]);

  const [selectedSlug, setSelectedSlug] = useState("malawi");

  const [chartInfo, setChartInfo] = useState(null);
  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);

  const [error, setError] = useState("");

  // Used to retry loading the selected chart.
  const [refreshKey, setRefreshKey] = useState(0);

  // --------------------------------------------------
  // NORMALIZED SONGS
  // --------------------------------------------------

  const normalizedSongs = useMemo(() => {
    return songs
      .map(normalizeSong)
      .filter(Boolean);
  }, [songs]);

  // --------------------------------------------------
  // LOAD CHART DIRECTORY AND FEATURED CHARTS
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadChartDirectory() {
      setLoading(true);
      setError("");

      try {
        const [
          countriesResponse,
          featuredResponse,
        ] = await Promise.all([
          getAvailableCharts(),
          getFeaturedCharts(),
        ]);

        if (cancelled) return;

        const countries = getChartList(countriesResponse);
        const featured = getFeaturedList(featuredResponse);

        setAvailableCharts(countries);
        setFeaturedCharts(featured);

        // Prefer Malawi as the initial chart.
        const initialChart =
          countries.find(
            (chart) =>
              String(chart.slug || "").toLowerCase() === "malawi"
          ) ||
          featured.find(
            (chart) =>
              String(chart.slug || "").toLowerCase() === "malawi"
          ) ||
          countries[0] ||
          featured[0];

        if (initialChart?.slug) {
          setSelectedSlug(initialChart.slug);
        } else {
          setError("No country charts are currently available.");
        }

      } catch (err) {
        console.error("CHART DIRECTORY ERROR:", err);

        if (!cancelled) {
          setError(
            err.message ||
            "Unable to load country charts."
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadChartDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------
  // LOAD SELECTED COUNTRY CHART
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!selectedSlug) return;

      setLoadingChart(true);
      setError("");

      try {
        const response = await getCountryChart(selectedSlug);

        if (cancelled) return;

        const chart = response?.chart || {};

        setChartInfo({
          ...chart,

          slug: chart.slug || selectedSlug,

          name:
            chart.name ||
            chart.chart_name ||
            chart.country_name ||
            chart.country ||
            selectedSlug,

          period_days: Number(chart.period_days || 30),
        });

       setSongs(
  Array.isArray(response?.chart?.songs)
    ? response.chart.songs
    : Array.isArray(response?.songs)
      ? response.songs
      : []
);

      } catch (err) {
        console.error("COUNTRY CHART ERROR:", err);

        if (!cancelled) {
          setSongs([]);
          setChartInfo(null);

          setError(
            err.message ||
            "Unable to load this country chart."
          );
        }

      } finally {
        if (!cancelled) {
          setLoadingChart(false);
        }
      }
    }

    loadChart();

    return () => {
      cancelled = true;
    };
  }, [selectedSlug, refreshKey]);

// --------------------------------------------------
// PLAY SONG IN FULL PLAYER
// --------------------------------------------------

const handlePlaySong = (song) => {
  if (!song) return;

  // Find the clicked song in the normalized playlist.
  const selectedSong = normalizedSongs.find(
    (item) => String(item.id) === String(song.id)
  );

  if (!selectedSong) {
    console.error("Selected chart song was not found.");
    return;
  }

  if (!selectedSong.audioUrl) {
    console.error(
      "This song has no playable audio URL:",
      selectedSong
    );
    return;
  }

  // Start the selected song using the chart playlist.
  playSong(selectedSong, normalizedSongs);

  // Open the full player.
  setFullPlayerOpen(true);
};
  // --------------------------------------------------
  // OPEN ARTIST PROFILE
  // --------------------------------------------------

  const openArtist = (song) => {
    const artistId =
      song?.artist_id ||
      song?.user_id;

    if (!artistId) return;

    navigate(`/creator/artist/${artistId}`);
  };

  // --------------------------------------------------
  // SELECT COUNTRY
  // --------------------------------------------------

  const selectChart = (slug) => {
    if (!slug || slug === selectedSlug) return;

    setSelectedSlug(slug);
  };

  // --------------------------------------------------
  // RETRY
  // --------------------------------------------------

  const retryChart = () => {
    setRefreshKey((current) => current + 1);
  };

  // --------------------------------------------------
  // LOADING DIRECTORY
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="charts-page">
        <div className="charts-loading">
          <RefreshCw
            className="charts-loading-icon"
            size={30}
          />

          <h2>Loading Cave Tunes Charts</h2>

          <p>
            Preparing the latest country rankings...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main className="charts-page">

      {/* HERO */}

      <section className="charts-hero">

        <div className="charts-hero-content">

          <div className="charts-eyebrow">
            <ChartNoAxesCombined size={17} />
            CAVE TUNES MUSIC RANKINGS
          </div>

          <h1>
            The charts.
            <span> Your music. Your world.</span>
          </h1>

          <p>
            Discover the songs making waves in different
            countries. Rankings are powered by real listening
            activity and engagement on Cave Tunes.
          </p>

          <div className="charts-hero-meta">

            <span>
              <Globe2 size={16} />
              Country rankings
            </span>

            <span>
              <TrendingUp size={16} />
              Updated from live data
            </span>

          </div>

        </div>

        <div className="charts-hero-art">

          <div className="charts-hero-disc">

            <div className="charts-hero-disc-inner">
              <img
                src="/Cave-Tunes-logo.png"
                alt="Cave Tunes"
              />
            </div>

          </div>

        </div>

      </section>

      {/* ERROR */}

      {error && (
        <div className="charts-error">

          <Music2 size={20} />

          <span>{error}</span>

          <button
            type="button"
            onClick={retryChart}
          >
            <RefreshCw size={15} />
            Retry
          </button>

        </div>
      )}

      {/* FEATURED CHARTS */}

      {featuredCharts.length > 0 && (
        <section className="charts-featured-section">

          <div className="charts-section-heading">

            <div>
              <span className="charts-section-label">
                <Crown size={15} />
                DISCOVER THE WORLD
              </span>

              <h2>Featured Country Charts</h2>

              <p>
                Explore the leading songs in each chart.
              </p>
            </div>

          </div>

          <div className="charts-featured-grid">

            {featuredCharts.map((chart, index) => {
              const slug = chart.slug;

              const topSong =
                chart.songs?.[0] ||
                chart.top_song ||
                chart.topSong ||
                null;

              const topSongTitle =
                topSong?.title ||
                topSong?.song_title ||
                topSong?.artist_name ||
                "Explore this chart";

              return (
                <button
                  type="button"
                  className={`charts-featured-card ${
                    selectedSlug === slug ? "active" : ""
                  }`}
                  key={slug || index}
                  onClick={() => selectChart(slug)}
                  disabled={!slug}
                >

                  <span className="charts-featured-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                 <span className="charts-featured-icon">
  {getCountryFlagUrl(chart) ? (
    <img
      src={getCountryFlagUrl(chart)}
      alt={`${getCountryLabel(chart)} flag`}
      className="charts-country-flag-image"
      loading="lazy"
    />
  ) : (
    <Globe2 size={22} />
  )}
</span>

                  <span className="charts-featured-name">
                    {getCountryLabel(chart)}
                  </span>

                  <span className="charts-featured-song">
                    {topSongTitle}
                  </span>

                  <span className="charts-featured-action">
                    View chart
                    <Play size={14} fill="currentColor" />
                  </span>

                </button>
              );
            })}

          </div>

        </section>
      )}

      {/* COUNTRY SELECTOR */}

      <section className="charts-country-section">

        <div className="charts-section-heading">

          <div>
            <span className="charts-section-label">
              <Globe2 size={15} />
              EXPLORE BY COUNTRY
            </span>

            <h2>Country Charts</h2>

            <p>
              Choose a country to see its Top 50 songs.
            </p>
          </div>

        </div>

        <div className="charts-country-list">

          {availableCharts.map((chart, index) => {
            const slug = chart.slug;

            const active = selectedSlug === slug;

            return (
              <button
                type="button"
                key={slug || index}
                className={`charts-country-button ${
                  active ? "active" : ""
                }`}
                onClick={() => selectChart(slug)}
                disabled={!slug}
              >
              {getCountryFlagUrl(chart) ? (
  <img
    src={getCountryFlagUrl(chart)}
    alt=""
    className="charts-country-flag-image"
    loading="lazy"
  />
) : (
  <Globe2 size={16} />
)}

{getCountryLabel(chart)}
              </button>
            );
          })}

        </div>

      </section>

      {/* SELECTED CHART */}

      <section className="charts-ranking-section">

        <div className="charts-ranking-header">

          <div>
            <span className="charts-section-label">
              <TrendingUp size={15} />
              OFFICIAL CAVE TUNES RANKINGS
            </span>

            <h2>
              {chartInfo?.name ||
                availableCharts.find(
                  (chart) => chart.slug === selectedSlug
                )?.name ||
                selectedSlug}
            </h2>

            <p>
              Top 50 songs · Rolling{" "}
              {chartInfo?.period_days || 30} days
            </p>
          </div>

          <div className="charts-ranking-count">
            <strong>{songs.length}</strong>
            <span>Ranked songs</span>
          </div>

        </div>

        {loadingChart ? (

          <div className="charts-loading-inline">
            <RefreshCw
              size={22}
              className="charts-loading-icon"
            />

            <span>Loading country rankings...</span>
          </div>

        ) : normalizedSongs.length > 0 ? (

          <div className="charts-song-list">

            {normalizedSongs.map((song, index) => {
              const rank = Number(song.rank || index + 1);

              const score = Number(
  song.chart_score ?? song.score ?? 0
);

              return (
               <article
  className="charts-song-row"
  key={song.id}
  onClick={() => handlePlaySong(song)}
  role="button"
  tabIndex={0}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handlePlaySong(song);
    }
  }}
>
                  <div
                    className={`charts-rank ${
                      rank <= 3 ? "top-three" : ""
                    }`}
                  >
                    {rank <= 3 ? (
                      <Crown size={17} />
                    ) : (
                      rank
                    )}
                  </div>

                  <button
                    type="button"
                    className="charts-song-cover"
                    onClick={() => handlePlaySong(song)}
                    aria-label={`Play ${song.title}`}
                  >

                    {song.cover ? (
                      <img
                        src={song.cover}
                        alt={song.title}
                        loading="lazy"
                      />
                    ) : (
                      <Music2 size={24} />
                    )}

                    <span>
                      <Play
                        size={16}
                        fill="currentColor"
                      />
                    </span>

                  </button>

                  <div className="charts-song-info">

                    <button
                      type="button"
                      className="charts-song-title"
                      onClick={() => handlePlaySong(song)}
                    >
                      {song.title}
                    </button>

                    <button
  type="button"
  className="charts-song-artist"
  onClick={(event) => {
    event.stopPropagation();
    openArtist(song);
  }}
>
  {song.artist}
</button>

                  </div>

                  <div className="charts-song-stats">

                    <span>
                      <Headphones size={14} />
                      {formatNumber(
                        song.unique_listeners ??
                        song.uniqueListeners ??
                        0
                      )}
                    </span>

                    <span>
                      <Play size={13} />
                      {formatNumber(
                        song.qualifying_plays ??
                        song.plays ??
                        0
                      )}
                    </span>

                  </div>

                  <div className="charts-song-score">
                    <strong>
                      {formatNumber(score)}
                    </strong>

                    <span>points</span>
                  </div>

                </article>
              );
            })}

          </div>

        ) : (

          <div className="charts-empty">

            <Music2 size={34} />

            <h3>No ranked songs yet</h3>

            <p>
              Songs will appear here when artists from this
              country receive qualifying plays, likes or
              playlist additions.
            </p>

          </div>

        )}

      </section>

      {/* CHART SCORING INFORMATION */}

      <section className="charts-scoring">

        <div className="charts-scoring-heading">

          <TrendingUp size={20} />

          <div>
            <h3>How Cave Tunes Charts work</h3>

            <p>
              Rankings use engagement from listeners worldwide.
              The artist's registered country determines which
              country chart their songs enter.
            </p>
          </div>

        </div>

        <div className="charts-scoring-grid">

          <div>
            <strong>100 pts</strong>
            <span>Unique listeners</span>
          </div>

          <div>
            <strong>3 pts</strong>
            <span>Qualifying plays</span>
          </div>

          <div>
            <strong>10 pts</strong>
            <span>Likes</span>
          </div>

          <div>
            <strong>8 pts</strong>
            <span>Playlist additions</span>
          </div>

        </div>

        <small>
          Only published songs by artists are eligible.
          Songs without engagement during the chart period
          are excluded.
        </small>

      </section>

    </main>
  );
}

export default Charts;
