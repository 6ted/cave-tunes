
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Globe,
  Calendar,
  Video,
  CheckCircle,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";

// Normalize featured artists for each individual track
function normalizeFeaturedArtists(value) {
  if (Array.isArray(value)) {
    return value
      .filter(name => typeof name === "string")
      .map(name => name.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map(name => name.trim())
      .filter(Boolean);
  }

  return [];
}

function Distribution() {
  const navigate = useNavigate();

  const {
    releaseData,
    updateReleaseData
  } = useUpload();

  const existingDistribution =
    releaseData.distribution || {};

  const [distribution, setDistribution] = useState({
    // Cave Tunes is the only supported platform
    platforms:
      existingDistribution.platforms?.length
        ? existingDistribution.platforms
        : ["Cave Tunes"],

    territories:
      existingDistribution.territories ??
      "Worldwide",

    monetizedEnabled:
      existingDistribution.monetizedEnabled ??
      false,

    streamingRoyalties:
      existingDistribution.streamingRoyalties ??
      false,

    downloadSales:
      existingDistribution.downloadSales ??
      false,

    youtubeMonetization:
      existingDistribution.youtubeMonetization ??
      false,

    scheduledRelease:
      existingDistribution.scheduledRelease ??
      ""
  });

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;

    setDistribution(prev => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value
    }));
  };

  const continueNext = () => {
    const finalDistribution = {
      // Always Cave Tunes only
      platforms: ["Cave Tunes"],

      territories:
        distribution.territories,

      monetizedEnabled:
        Boolean(distribution.monetizedEnabled),

      streamingRoyalties:
        Boolean(distribution.streamingRoyalties),

      downloadSales:
        Boolean(distribution.downloadSales),

      youtubeMonetization:
        Boolean(distribution.youtubeMonetization),

      scheduledRelease:
        distribution.scheduledRelease || ""
    };

    // Preserve each track's individual featured artists
    const updatedTracks = (
      releaseData.tracks || []
    ).map(track => ({
      ...track,

      featured_artists: normalizeFeaturedArtists(
        track.featured_artists
      )
    }));

    // Preserve all release information
    updateReleaseData({
      ...releaseData,

      tracks: updatedTracks,

      distribution: finalDistribution
    });

    console.log(
      "DISTRIBUTION DATA:",
      finalDistribution
    );

    console.log(
      "TRACK FEATURED ARTISTS:",
      updatedTracks.map(track => ({
        track: track.name,
        featured_artists: track.featured_artists
      }))
    );

    navigate("/copyright");
  };

  return (
    <div className="upload-studio">

      <div className="upload-title">
        <Globe size={42} />

        <div>
          <h1>Distribution Settings</h1>

          <p>
            Choose how your music will be distributed
          </p>
        </div>
      </div>

      {/* PLATFORM */}
      <div className="upload-section">
        <h2>Streaming Platform</h2>

        <div className="release-options">
          <button
            type="button"
            className="selected"
            disabled
          >
            <CheckCircle size={18} />
            Cave Tunes
          </button>
        </div>

        <p>
          Your release will be distributed on Cave Tunes.
        </p>
      </div>

      {/* TERRITORIES */}
      <div className="upload-section">
        <h2>Territories</h2>

        <select
          name="territories"
          value={distribution.territories}
          onChange={handleChange}
        >
          <option value="Worldwide">
            Worldwide
          </option>

          <option value="Africa Only">
            Africa Only
          </option>

          <option value="Selected Countries">
            Selected Countries
          </option>
        </select>
      </div>

      {/* MONETIZATION */}
      <div className="upload-section">
        <h2>
          <Video size={22} />
          Monetization
        </h2>

        <p>
          Allow this release to participate
          in Cave Tunes monetization.
        </p>

        <label>
          <input
            type="checkbox"
            name="monetizedEnabled"
            checked={distribution.monetizedEnabled}
            onChange={handleChange}
          />
          Enable Monetization
        </label>

        <label>
          <input
            type="checkbox"
            name="streamingRoyalties"
            checked={distribution.streamingRoyalties}
            onChange={handleChange}
          />
          Collect Streaming Royalties
        </label>

        <label>
          <input
            type="checkbox"
            name="downloadSales"
            checked={distribution.downloadSales}
            onChange={handleChange}
          />
          Allow Download Sales
        </label>

        <label>
          <input
            type="checkbox"
            name="youtubeMonetization"
            checked={distribution.youtubeMonetization}
            onChange={handleChange}
          />
          Confirm Monetization
        </label>
      </div>

      {/* SCHEDULE */}
      <div className="upload-section">
        <h2>
          <Calendar size={22} />
          Set Monetization Date
        </h2>

        <input
          type="date"
          name="scheduledRelease"
          value={distribution.scheduledRelease}
          onChange={handleChange}
        />
      </div>

      {/* CONTINUE */}
      <button
        type="button"
        className="next-button"
        onClick={continueNext}
      >
        Continue To Copyright →
      </button>

    </div>
  );
}

export default Distribution;
