
import { useEffect, useState } from "react";

import {
  BarChart3,
  Play,
  Users,
  Heart,
  Music2,
  Globe2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  getArtistAnalytics,
  getMediaUrl,
} from "../services/api";

import "./Analytics.css";

function Analytics() {
  const [period, setPeriod] = useState("30d");

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const response = await getArtistAnalytics(period);

        if (!cancelled) {
          setAnalytics(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load your analytics."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
}, [period, refreshKey]);

  const summary = analytics?.summary || {};

  const dailyActivity = analytics?.daily_activity || [];

  const topSongs = analytics?.top_songs || [];

  const countries = analytics?.listener_countries || [];

  const followerSummary = analytics?.follower_summary || {};

  const followerGrowth = analytics?.follower_growth || [];

  const maxCountryPlays = Math.max(
  ...countries.map((item) => Number(item.plays || 0)),
  1
);

  const totalPlays = Number(summary.total_plays || 0);

  const totalListeners = Number(summary.unique_listeners || 0);

  const totalLikes = Number(summary.total_likes || 0);

  const totalSongs = Number(summary.total_songs || 0);

  const totalFollowers = Number(followerSummary.total_followers || 0);

  const newFollowers = Number(followerSummary.new_followers || 0);

  const maxFollowerGrowth = Math.max(
    ...followerGrowth.map((item) => Number(item.followers || 0)),
    1
  );

  const maxDailyPlays = Math.max(
    ...dailyActivity.map((item) => Number(item.plays || 0)),
    1
  );

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString();

  const periodLabel = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  }[period];

  return (
    <main className="page analytics-page">

      {/* HEADER */}

      <header className="page-header analytics-page-header">

        <div>
          <h1>Analytics</h1>

          <p>
            Understand how your music is performing on Cave Tunes.
          </p>
        </div>

        <button
          type="button"
          className="analytics-refresh-button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
          title="Refresh analytics"
        >
          <RefreshCw
            size={17}
            className={loading ? "analytics-spinning" : ""}
          />

          <span>Refresh</span>
        </button>

      </header>


      {/* DATE FILTER */}

      <section className="analytics-filter">

        <div>
          <span className="analytics-filter-label">
            Performance period
          </span>

          <small>{periodLabel}</small>
        </div>

        <div className="analytics-period-buttons">

          {[
            { value: "7d", label: "7 Days" },
            { value: "30d", label: "30 Days" },
            { value: "90d", label: "90 Days" },
            { value: "all", label: "All Time" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={
                period === item.value ? "active" : ""
              }
              onClick={() => setPeriod(item.value)}
              disabled={loading}
            >
              {item.label}
            </button>
          ))}

        </div>

      </section>


      {/* ERROR */}

      {error && (
        <div className="analytics-error">

          <p>{error}</p>

          <button
            type="button"
           onClick={() => setRefreshKey((current) => current + 1)}
          >
            Try again
          </button>

        </div>
      )}


      {/* LOADING */}

      {loading && !analytics && (
        <div className="analytics-loading">
          <RefreshCw size={30} className="analytics-spinning" />

          <p>Loading your music analytics...</p>
        </div>
      )}


      {/* DASHBOARD */}

      {analytics && (

        <>

          {/* OVERVIEW */}

          <section className="analytics-overview">

            <div className="analytics-card">

              <div className="analytics-icon">
                <Play size={21} />
              </div>

              <span>Total Plays</span>

              <strong>{formatNumber(totalPlays)}</strong>

              <small>{periodLabel}</small>

            </div>


            <div className="analytics-card">

              <div className="analytics-icon">
                <Users size={21} />
              </div>

              <span>Listeners</span>

              <strong>{formatNumber(totalListeners)}</strong>

              <small>Unique listeners</small>

            </div>


            <div className="analytics-card">

              <div className="analytics-icon">
                <Heart size={21} />
              </div>

              <span>Total Likes</span>

              <strong>{formatNumber(totalLikes)}</strong>

              <small>Likes across your songs</small>

            </div>


            <div className="analytics-card">

              <div className="analytics-icon">
                <Music2 size={21} />
              </div>

              <span>Uploaded Songs</span>

              <strong>{formatNumber(totalSongs)}</strong>

              <small>Your music catalogue</small>

            </div>


            <div className="analytics-card">

              <div className="analytics-icon">
                <Users size={21} />
              </div>

              <span>Total Followers</span>

              <strong>{formatNumber(totalFollowers)}</strong>

              <small>People following your artist profile</small>

            </div>


            <div className="analytics-card">

              <div className="analytics-icon">
                <TrendingUp size={21} />
              </div>

              <span>New Followers</span>

              <strong>{formatNumber(newFollowers)}</strong>

              <small>{periodLabel}</small>

            </div>

          </section>


          {/* FOLLOWER GROWTH */}

          <section className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>Followers Growth</h2>

                <p>
                  New followers gained during {periodLabel.toLowerCase()}.
                </p>
              </div>

              <TrendingUp size={25} />

            </div>


            {followerGrowth.length > 0 ? (

              <div className="analytics-chart analytics-follower-chart">

                <div className="analytics-chart-y-labels">
                  <span>{maxFollowerGrowth}</span>
                  <span>{Math.ceil(maxFollowerGrowth / 2)}</span>
                  <span>0</span>
                </div>

                <div className="analytics-chart-bars">

                  {followerGrowth.map((item, index) => {

                    const followers = Number(item.followers || 0);

                    const height = Math.max(
                      (followers / maxFollowerGrowth) * 100,
                      3
                    );

                    const dateLabel = item.date
                      ? String(item.date).split("T")[0]
                      : "";

                    const formattedDate = dateLabel
                      ? new Date(
                          `${dateLabel}T12:00:00`
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "";

                    return (
                      <div
                        className="analytics-chart-column"
                        key={`${item.date}-${index}`}
                      >

                        <div className="analytics-bar-value">
                          {followers}
                        </div>

                        <div className="analytics-bar-track">

                          <div
                            className="analytics-bar analytics-follower-bar"
                            style={{
                              height: `${height}%`,
                            }}
                            title={`${followers} new followers`}
                          />

                        </div>

                        <span className="analytics-bar-date">
                          {formattedDate}
                        </span>

                      </div>
                    );
                  })}

                </div>

              </div>

            ) : (

              <div className="analytics-chart-empty">

                <Users size={42} />

                <h3>No follower growth data yet</h3>

                <p>
                  New followers recorded from now on will appear here.
                  Existing followers without a follow date cannot be
                  included in historical growth.
                </p>

              </div>

            )}

          </section>


          {/* MUSIC PERFORMANCE */}

          <section className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>Music Performance</h2>

                <p>
                  Your overall Cave Tunes performance.
                </p>
              </div>

              <BarChart3 size={25} />

            </div>

            <div className="performance-grid">

              <div className="performance-item">

                <Music2 size={23} />

                <div>
                  <span>Uploaded Songs</span>

                  <strong>{formatNumber(totalSongs)}</strong>
                </div>

              </div>


              <div className="performance-item">

                <TrendingUp size={23} />

                <div>
                  <span>Total Streams</span>

                  <strong>{formatNumber(totalPlays)}</strong>
                </div>

              </div>


              <div className="performance-item">

                <Heart size={23} />

                <div>
                  <span>Total Likes</span>

                  <strong>{formatNumber(totalLikes)}</strong>
                </div>

              </div>

            </div>

          </section>


          {/* DAILY ACTIVITY */}

          <section className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>Streaming Activity</h2>

                <p>
                  Daily plays during {periodLabel.toLowerCase()}.
                </p>
              </div>

              <BarChart3 size={25} />

            </div>


            {dailyActivity.length > 0 ? (

              <div className="analytics-chart">

                <div className="analytics-chart-y-labels">
                  <span>{maxDailyPlays}</span>
                  <span>{Math.ceil(maxDailyPlays / 2)}</span>
                  <span>0</span>
                </div>

                <div className="analytics-chart-bars">

                  {dailyActivity.map((item, index) => {

                    const plays = Number(item.plays || 0);

                    const height = Math.max(
                      (plays / maxDailyPlays) * 100,
                      3
                    );

                    const dateLabel = item.date
                      ? item.date.split("T")[0]
                      : "";

                    const formattedDate = dateLabel
                      ? new Date(
                          `${dateLabel}T12:00:00`
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "";

                    return (
                      <div
                        className="analytics-chart-column"
                        key={`${item.date}-${index}`}
                      >

                        <div className="analytics-bar-value">
                          {plays}
                        </div>

                        <div className="analytics-bar-track">

                          <div
                            className="analytics-bar"
                            style={{
                              height: `${height}%`,
                            }}
                            title={`${plays} plays`}
                          />

                        </div>

                        <span className="analytics-bar-date">
                          {formattedDate}
                        </span>

                      </div>
                    );
                  })}

                </div>

              </div>

            ) : (

              <div className="analytics-chart-empty">

                <BarChart3 size={45} />

                <h3>No streaming activity yet</h3>

                <p>
                  Your daily streams will appear here
                  when listeners play your music.
                </p>

              </div>

            )}

          </section>


          {/* TOP SONGS */}

          <section className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>Top Songs</h2>

                <p>
                  Your best-performing songs for {periodLabel.toLowerCase()}.
                </p>
              </div>

              <Music2 size={25} />

            </div>


            {topSongs.length > 0 ? (

              <div className="analytics-songs-list">

                {topSongs.map((song, index) => (

                  <div
                    className="analytics-song"
                    key={song.id}
                  >

                    <span className="analytics-song-rank">
                      {index + 1}
                    </span>


                    <img
                      src={getMediaUrl(song.cover_url)}
                      alt={song.title}
                      className="analytics-song-cover"
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />


                    <div className="analytics-song-info">

                      <strong>{song.title}</strong>

                      <span>{song.artist_name || "Unknown Artist"}</span>

                    </div>


                    <div className="analytics-song-stat">

                      <Play size={15} />

                      <strong>{formatNumber(song.plays)}</strong>

                      <span>Plays</span>

                    </div>


                    <div className="analytics-song-stat">

                      <Heart size={15} />

                      <strong>{formatNumber(song.likes)}</strong>

                      <span>Likes</span>

                    </div>

                  </div>

                ))}

              </div>

            ) : (

              <div className="analytics-chart-empty">

                <Music2 size={38} />

                <h3>No songs available</h3>

                <p>
                  Your song performance will appear here.
                </p>

              </div>

            )}

          </section>


          {/* LISTENER LOCATIONS */}

          <section className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>Listener Locations</h2>

                <p>
                  Countries where listeners are playing your music.
                </p>
              </div>

              <Globe2 size={25} />

            </div>


            {countries.length > 0 ? (

              <div className="analytics-countries">

                {countries.map((item) => (

                  <div
                    className="analytics-country"
                    key={item.country}
                  >

                    <div className="analytics-country-info">

                      <Globe2 size={19} />

                      <strong>{item.country}</strong>

                    </div>

<div className="analytics-country-progress">

  <div className="analytics-country-progress-track">

    <div
      className="analytics-country-progress-fill"
      style={{
        width: `${Math.max(
          (Number(item.plays || 0) / maxCountryPlays) * 100,
          2
        )}%`,
      }}
    />

  </div>

</div>
                    <div className="analytics-country-stats">

                      <span>
                        <strong>{formatNumber(item.plays)}</strong>
                        Plays
                      </span>

                      <span>
                        <strong>{formatNumber(item.listeners)}</strong>
                        Listeners
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            ) : (

              <div className="analytics-chart-empty">

                <Globe2 size={38} />

                <h3>No country data yet</h3>

                <p>
                  Listener countries will appear here
                  when location information is available.
                </p>

              </div>

            )}

          </section>


          <p className="analytics-footnote">
            Country information is based on available listener
            location data. Some plays may not have a recorded country.
            Likes represent current totals across your songs.
          </p>

        </>

      )}

    </main>
  );
}

export default Analytics;
