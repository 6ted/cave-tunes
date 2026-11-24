
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Copyright as CopyrightIcon,
  ShieldCheck,
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";

// Normalize featured artists independently for each track
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

function Copyright() {
  const navigate = useNavigate();

  const {
    releaseData,
    updateReleaseData
  } = useUpload();

  const [copyright, setCopyright] = useState({
    copyrightOwner:
      releaseData.copyright?.copyrightOwner || "",

    masterOwner:
      releaseData.copyright?.masterOwner || "",

    copyrightYear:
      releaseData.copyright?.copyrightYear || "",

    publishingRights:
      releaseData.copyright?.publishingRights || "",

    license:
      releaseData.copyright?.license || ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setCopyright(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const continueNext = () => {
    // Preserve each track's own featured artists
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

      // Copyright information
      copyright: {
        ...copyright
      },

      // Preserve individual track information
      tracks: updatedTracks,

      // Preserve metadata
      metadata: releaseData.metadata || {},

      // Preserve distribution settings
      distribution: releaseData.distribution || {},

      // Preserve artwork
      cover: releaseData.cover || null
    });

    console.log("COPYRIGHT DATA:", copyright);

    console.log(
      "TRACK FEATURED ARTISTS:",
      updatedTracks.map(track => ({
        track: track.name,
        featured_artists: track.featured_artists
      }))
    );

    navigate("/royalty-splits");
  };

  return (
    <div className="upload-studio">

      <div className="upload-title">
        <CopyrightIcon size={42} />

        <div>
          <h1>Copyright Information</h1>
          <p>Protect your music ownership</p>
        </div>
      </div>

      {/* OWNERSHIP */}
      <div className="upload-section">
        <h2>
          <ShieldCheck size={22} />
          Ownership
        </h2>

        <input
          name="copyrightOwner"
          placeholder="Copyright Owner"
          value={copyright.copyrightOwner}
          onChange={handleChange}
        />

        <input
          name="masterOwner"
          placeholder="Master Recording Owner"
          value={copyright.masterOwner}
          onChange={handleChange}
        />

        <input
          name="copyrightYear"
          placeholder="Copyright Year"
          value={copyright.copyrightYear}
          onChange={handleChange}
        />
      </div>

      {/* PUBLISHING RIGHTS */}
      <div className="upload-section">
        <h2>Publishing Rights</h2>

        <input
          name="publishingRights"
          placeholder="Publishing Rights Holder"
          value={copyright.publishingRights}
          onChange={handleChange}
        />

        <textarea
          name="license"
          placeholder="License information"
          value={copyright.license}
          onChange={handleChange}
        />
      </div>

      {/* CONTINUE */}
      <button
        type="button"
        className="next-button"
        onClick={continueNext}
      >
        Continue To Royalty Splits →
      </button>

    </div>
  );
}

export default Copyright;
