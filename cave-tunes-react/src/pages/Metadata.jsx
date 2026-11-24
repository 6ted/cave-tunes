
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Music,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";

// Normalize featured artists without changing their track ownership
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

function Metadata() {
  const navigate = useNavigate();

  const {
    releaseData,
    updateReleaseData
  } = useUpload();

  const [metadata, setMetadata] = useState(
    releaseData.metadata || {
      isrc: "",
      upc: "",
      recordLabel: "",
      producer: "",
      composer: "",
      songwriter: "",
      mixingEngineer: "",
      masteringEngineer: "",
      lyrics: ""
    }
  );

  const handleChange = (e) => {
    setMetadata(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const continueNext = () => {
    // Preserve every track's individual featured artists
    const updatedTracks = (releaseData.tracks || []).map(track => ({
      ...track,

      featured_artists: normalizeFeaturedArtists(
        track.featured_artists
      )
    }));

    updateReleaseData({
      // Preserve all existing release information
      ...releaseData,

      // Save metadata
      metadata: {
        ...metadata
      },

      // Preserve release information
      release_type: releaseData.release_type,
      artist_name: releaseData.artist_name,
      album_name: releaseData.album_name || "",
      ep_name: releaseData.ep_name || "",
      country: releaseData.country,
      genre: releaseData.genre,
      language: releaseData.language,
      title: releaseData.title,
      release_date: releaseData.release_date,

      // Save tracks without replacing their featured artists
      tracks: updatedTracks,

      // Preserve artwork
      cover: releaseData.cover || null
    });

    navigate("/distribution");
  };

  return (
    <div className="upload-studio">

      <div className="upload-title">
        <FileText size={42} />

        <div>
          <h1>Music Metadata</h1>
          <p>Add credits and release information</p>
        </div>
      </div>

      {/* RELEASE CODES */}
      <div className="upload-section">
        <h2>
          <Music size={22} />
          Release Codes
        </h2>

        <input
          name="isrc"
          placeholder="ISRC Code"
          value={metadata.isrc}
          onChange={handleChange}
        />

        <input
          name="upc"
          placeholder="UPC Code"
          value={metadata.upc}
          onChange={handleChange}
        />
      </div>

      {/* CREDITS */}
      <div className="upload-section">
        <h2>Credits</h2>

        <input
          name="recordLabel"
          placeholder="Record Label"
          value={metadata.recordLabel}
          onChange={handleChange}
        />

        <input
          name="producer"
          placeholder="Producer"
          value={metadata.producer}
          onChange={handleChange}
        />

        <input
          name="composer"
          placeholder="Composer"
          value={metadata.composer}
          onChange={handleChange}
        />

        <input
          name="songwriter"
          placeholder="Songwriter"
          value={metadata.songwriter}
          onChange={handleChange}
        />

        <input
          name="mixingEngineer"
          placeholder="Mixing Engineer"
          value={metadata.mixingEngineer}
          onChange={handleChange}
        />

        <input
          name="masteringEngineer"
          placeholder="Mastering Engineer"
          value={metadata.masteringEngineer}
          onChange={handleChange}
        />
      </div>

      {/* LYRICS */}
      <div className="upload-section">
        <h2>Lyrics</h2>

        <textarea
          name="lyrics"
          placeholder="Write lyrics here..."
          value={metadata.lyrics}
          onChange={handleChange}
        />
      </div>

      <button
        className="next-button"
        onClick={continueNext}
      >
        Continue To Distribution →
      </button>

    </div>
  );
}

export default Metadata;
